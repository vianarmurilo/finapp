import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { authMiddleware, requireAdminRole } from "../middlewares/auth.middleware";
import { UserRepository } from "../repositories/user.repository";
import { AdminService } from "../services/admin.service";

const userRepository = new UserRepository();
const adminService = new AdminService(userRepository);
const adminController = new AdminController(adminService);

export const adminRouter = Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireAdminRole);

adminRouter.get("/summary", adminController.getSummary);
adminRouter.get("/users", adminController.listUsers);
adminRouter.get("/users/export.csv", adminController.exportUsersCsv);
adminRouter.patch("/users/:userId/role", adminController.updateUserRole);
adminRouter.patch("/users/:userId/block", adminController.updateUserBlockState);
adminRouter.delete("/users/:userId", adminController.deleteUser);