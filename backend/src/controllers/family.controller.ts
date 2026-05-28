import { Request, Response } from "express";
import { FamilyService } from "../services/family.service";

export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  createGroup = async (req: Request, res: Response): Promise<void> => {
    const group = await this.familyService.createGroup(req.user!.userId, req.body);
    res.status(201).json(group);
  };

  joinGroup = async (req: Request, res: Response): Promise<void> => {
    const result = await this.familyService.joinGroup(req.user!.userId, req.body);
    res.status(200).json(result);
  };

  listGroups = async (req: Request, res: Response): Promise<void> => {
    const groups = await this.familyService.listGroups(req.user!.userId);
    res.status(200).json(groups);
  };

  dashboard = async (req: Request, res: Response): Promise<void> => {
    const groupId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await this.familyService.dashboard(req.user!.userId, groupId);
    res.status(200).json(data);
  };
}
