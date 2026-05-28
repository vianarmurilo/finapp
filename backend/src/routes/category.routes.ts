import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { CategoryExtendedRepository } from "../repositories/category-extended.repository";
import { CategoryService } from "../services/category.service";

const categoryRepository = new CategoryExtendedRepository();
const categoryService = new CategoryService(categoryRepository);
const categoryController = new CategoryController(categoryService);

export const categoryRouter = Router();

categoryRouter.use(authMiddleware);
categoryRouter.get("/", categoryController.list);
categoryRouter.post("/", categoryController.create);
categoryRouter.get("/suggest", categoryController.suggest);
categoryRouter.put("/:id", categoryController.update);
categoryRouter.delete("/:id", categoryController.delete);
