import { Router } from "express";
import { GoalController } from "../controllers/goal.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { GoalRepository } from "../repositories/goal.repository";
import { GoalService } from "../services/goal.service";

const goalRepository = new GoalRepository();
const goalService = new GoalService(goalRepository);
const goalController = new GoalController(goalService);

export const goalRouter = Router();

goalRouter.use(authMiddleware);
goalRouter.post("/", goalController.create);
goalRouter.get("/", goalController.list);
goalRouter.post("/:id/balance", goalController.adjustBalance);
goalRouter.get("/:id/movements", goalController.history);
goalRouter.put("/:id", goalController.update);
goalRouter.delete("/:id", goalController.delete);
