import { z } from "zod";
import { FamilyRepository } from "../repositories/family.repository";
import { AppError } from "../utils/app-error";

const createFamilyGroupSchema = z.object({
  name: z.string().min(2).max(140),
});

const joinFamilyGroupSchema = z.object({
  inviteCode: z.string().min(6).max(20),
});

function buildInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export class FamilyService {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async createGroup(userId: string, rawInput: unknown) {
    const input = createFamilyGroupSchema.parse(rawInput);
    return this.familyRepository.createGroup(userId, input.name, buildInviteCode());
  }

  async joinGroup(userId: string, rawInput: unknown) {
    const input = joinFamilyGroupSchema.parse(rawInput);
    const group = await this.familyRepository.findGroupByInviteCode(input.inviteCode);

    if (!group) {
      throw new AppError("Grupo familiar nao encontrado", 404);
    }

    const alreadyMember = group.members.some((member) => member.userId === userId);
    if (alreadyMember) {
      throw new AppError("Usuario ja pertence ao grupo", 409);
    }

    await this.familyRepository.addMember(group.id, userId);
    return { message: "Entrada no grupo realizada com sucesso" };
  }

  async listGroups(userId: string) {
    return this.familyRepository.listUserGroups(userId);
  }

  async dashboard(userId: string, familyGroupId: string) {
    const groups = await this.familyRepository.listUserGroups(userId);
    const userHasAccess = groups.some((group) => group.id === familyGroupId);

    if (!userHasAccess) {
      throw new AppError("Acesso negado ao grupo familiar", 403);
    }

    return this.familyRepository.familyDashboard(familyGroupId);
  }
}
