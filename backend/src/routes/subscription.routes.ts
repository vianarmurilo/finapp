import { Router } from "express";
import { SubscriptionController } from "../controllers/subscription.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { SubscriptionService } from "../services/subscription.service";

const subscriptionRepository = new SubscriptionRepository();
const subscriptionService = new SubscriptionService(subscriptionRepository);
const subscriptionController = new SubscriptionController(subscriptionService);

export const subscriptionRouter = Router();

subscriptionRouter.use(authMiddleware);
subscriptionRouter.post("/", subscriptionController.create);
subscriptionRouter.get("/", subscriptionController.list);
subscriptionRouter.put("/:id", subscriptionController.update);
subscriptionRouter.delete("/:id", subscriptionController.delete);
