"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyController = void 0;
class FamilyController {
    constructor(familyService) {
        this.familyService = familyService;
        this.createGroup = async (req, res) => {
            const group = await this.familyService.createGroup(req.user.userId, req.body);
            res.status(201).json(group);
        };
        this.joinGroup = async (req, res) => {
            const result = await this.familyService.joinGroup(req.user.userId, req.body);
            res.status(200).json(result);
        };
        this.listGroups = async (req, res) => {
            const groups = await this.familyService.listGroups(req.user.userId);
            res.status(200).json(groups);
        };
        this.dashboard = async (req, res) => {
            const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const data = await this.familyService.dashboard(req.user.userId, groupId);
            res.status(200).json(data);
        };
    }
}
exports.FamilyController = FamilyController;
