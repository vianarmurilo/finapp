import { Request, Response } from "express";
import { GoalService } from "../services/goal.service";

export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const goal = await this.goalService.create(req.user!.userId, req.body);
    res.status(201).json(goal);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const goals = await this.goalService.list(req.user!.userId);
    res.status(200).json(goals);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const goal = await this.goalService.update(req.user!.userId, goalId, req.body);
    res.status(200).json(goal);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.goalService.delete(req.user!.userId, goalId);
    res.status(204).send();
  };

  history = async (req: Request, res: Response): Promise<void> => {
    const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === "string" ? Number(limitRaw) : 20;
    const data = await this.goalService.history(req.user!.userId, goalId, Number.isFinite(limit) ? limit : 20);
    res.status(200).json(data);
  };

  adjustBalance = async (req: Request, res: Response): Promise<void> => {
    const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const goal = await this.goalService.adjustBalance(req.user!.userId, goalId, req.body);
    res.status(200).json(goal);
  };
}
