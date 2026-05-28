"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyService = void 0;
const zod_1 = require("zod");
const app_error_1 = require("../utils/app-error");
const createFamilyGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(140),
});
const joinFamilyGroupSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().min(6).max(20),
});
function buildInviteCode() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
}
class FamilyService {
    constructor(familyRepository) {
        this.familyRepository = familyRepository;
    }
    async createGroup(userId, rawInput) {
        const input = createFamilyGroupSchema.parse(rawInput);
        return this.familyRepository.createGroup(userId, input.name, buildInviteCode());
    }
    async joinGroup(userId, rawInput) {
        const input = joinFamilyGroupSchema.parse(rawInput);
        const group = await this.familyRepository.findGroupByInviteCode(input.inviteCode);
        if (!group) {
            throw new app_error_1.AppError("Grupo familiar nao encontrado", 404);
        }
        const alreadyMember = group.members.some((member) => member.userId === userId);
        if (alreadyMember) {
            throw new app_error_1.AppError("Usuario ja pertence ao grupo", 409);
        }
        await this.familyRepository.addMember(group.id, userId);
        return { message: "Entrada no grupo realizada com sucesso" };
    }
    async listGroups(userId) {
        return this.familyRepository.listUserGroups(userId);
    }
    async dashboard(userId, familyGroupId) {
        const groups = await this.familyRepository.listUserGroups(userId);
        const userHasAccess = groups.some((group) => group.id === familyGroupId);
        if (!userHasAccess) {
            throw new app_error_1.AppError("Acesso negado ao grupo familiar", 403);
        }
        return this.familyRepository.familyDashboard(familyGroupId);
    }
}
exports.FamilyService = FamilyService;
