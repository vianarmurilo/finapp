import { Request, Response } from "express";
import { TransactionService } from "../services/transaction.service";

export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  private getIdFromParams(req: Request): string {
    const rawId = req.params.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const transaction = await this.transactionService.create(req.user!.userId, req.body);
    res.status(201).json(transaction);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const transactions = await this.transactionService.list(req.user!.userId, req.query);
    res.status(200).json(transactions);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const transaction = await this.transactionService.getById(req.user!.userId, this.getIdFromParams(req));
    res.status(200).json(transaction);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const transaction = await this.transactionService.update(req.user!.userId, this.getIdFromParams(req), req.body);
    res.status(200).json(transaction);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.transactionService.delete(req.user!.userId, this.getIdFromParams(req));
    res.status(204).send();
  };
}
