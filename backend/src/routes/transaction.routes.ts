import { Router } from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { CategoryRepository } from "../repositories/category.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { TransactionService } from "../services/transaction.service";
import { EnvelopeService } from "../services/envelope/envelopeService";
import { importRouter } from "./transactions.import";

const transactionRepository = new TransactionRepository();
const categoryRepository = new CategoryRepository();
const envelopeService = new EnvelopeService();
const transactionService = new TransactionService(transactionRepository, categoryRepository, envelopeService);
const transactionController = new TransactionController(transactionService);

export const transactionRouter = Router();

transactionRouter.use(authMiddleware);

// rotas de importacao de extratos
transactionRouter.use(importRouter);

transactionRouter.post("/", transactionController.create);
transactionRouter.get("/", transactionController.list);
transactionRouter.get("/:id", transactionController.getById);
transactionRouter.put("/:id", transactionController.update);
transactionRouter.delete("/:id", transactionController.delete);
