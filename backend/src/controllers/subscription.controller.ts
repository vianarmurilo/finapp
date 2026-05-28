import { Request, Response } from "express";
import { SubscriptionService } from "../services/subscription.service";

export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const result = await this.subscriptionService.create(req.user!.userId, req.body);
    res.status(201).json(result);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await this.subscriptionService.list(req.user!.userId);
    res.status(200).json(result);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const subscriptionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await this.subscriptionService.update(req.user!.userId, subscriptionId, req.body);
    res.status(200).json(result);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const subscriptionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.subscriptionService.delete(req.user!.userId, subscriptionId);
    res.status(204).send();
  };
}
