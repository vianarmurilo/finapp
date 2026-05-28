import { Router } from "express";
import { FamilyController } from "../controllers/family.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { FamilyRepository } from "../repositories/family.repository";
import { FamilyService } from "../services/family.service";

const familyRepository = new FamilyRepository();
const familyService = new FamilyService(familyRepository);
const familyController = new FamilyController(familyService);

export const familyRouter = Router();

familyRouter.use(authMiddleware);
familyRouter.post("/groups", familyController.createGroup);
familyRouter.post("/groups/join", familyController.joinGroup);
familyRouter.get("/groups", familyController.listGroups);
familyRouter.get("/groups/:id/dashboard", familyController.dashboard);
