import { Request, Response } from "express";
import { CategoryService } from "../services/category.service";

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  private getIdFromParams(req: Request): string {
    const rawId = req.params.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    const categories = await this.categoryService.list(req.user!.userId, req.query);
    res.status(200).json(categories);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const category = await this.categoryService.create(req.user!.userId, req.body);
    res.status(201).json(category);
  };

  suggest = async (req: Request, res: Response): Promise<void> => {
    const suggestion = await this.categoryService.suggest(req.user!.userId, req.query);
    res.status(200).json(suggestion);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const category = await this.categoryService.update(req.user!.userId, this.getIdFromParams(req), req.body);
    res.status(200).json(category);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.categoryService.delete(req.user!.userId, this.getIdFromParams(req));
    res.status(204).send();
  };
}
