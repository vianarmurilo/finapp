import { Router, Request, Response } from "express";
import { TransactionType } from "@prisma/client";
import multer from "multer";
import { authMiddleware } from "../middlewares/auth.middleware";
import { detectFormatFromBuffer, detectIsPdf } from "../services/import/formatDetector";
import { parseCsvBuffer, ParsedTransaction } from "../services/import/csvParser";
import { parsePdfBuffer } from "../services/import/pdfParser";
import { CategoryRepository } from "../repositories/category.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { suggestCategoriesBatch } from "../services/import/autoCategorizor";
import { AppError } from "../utils/app-error";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const categoryRepository = new CategoryRepository();
const transactionRepository = new TransactionRepository();

export const importRouter = Router();

importRouter.use(authMiddleware);

// Preview import
importRouter.post("/import", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) throw new AppError("Arquivo nao enviado", 400);

    const buffer = req.file.buffer;
    const format = await detectFormatFromBuffer(buffer, req.file.originalname);
    const isPdf = await detectIsPdf(buffer);

    let parsed: ParsedTransaction[] = [];
    if (isPdf) {
      const out = await parsePdfBuffer(buffer);
      if (out.rawLines) {
        return res.status(200).json({ format, parsed: [], rawLines: out.rawLines });
      }
      parsed = out.parsed;
    } else {
      // try utf8 then latin1
      try {
        parsed = await parseCsvBuffer(buffer, "utf8");
      } catch (err) {
        // try latin1
        try {
          parsed = await parseCsvBuffer(buffer, "latin1");
        } catch (err2) {
          throw new AppError("Falha ao parsear CSV", 400);
        }
      }
    }

    if (parsed.length > 500) throw new AppError("Limite de 500 transacoes por importacao", 400);

    // deduplicate against existing transactions
    const unique: ParsedTransaction[] = [];
    for (const p of parsed) {
      const dup = await transactionRepository.existsDuplicate(req.user!.userId, new Date(p.date), p.amount, p.description);
      if (!dup) unique.push(p);
    }

    const categories = await categoryRepository.listForUser(req.user!.userId);

    // run auto categorizador
    const descriptions = unique.map((u) => u.description);
    let suggestions: (string | null)[] = [];
    try {
      suggestions = await suggestCategoriesBatch(descriptions, categories.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      // não bloqueia; apenas não teremos sugestões
    }

    const preview = unique.map((u, idx) => ({ ...u, suggestedCategory: suggestions[idx] ?? null, auto_categorized: suggestions[idx] ? true : false }));

    res.status(200).json({ format, parsed: preview });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Erro interno ao importar" });
    }
  }
});

// Confirm import and save
importRouter.post("/import/confirm", async (req: Request, res: Response) => {
  try {
    const payloadRaw = req.body as unknown;
    if (!Array.isArray(payloadRaw)) throw new AppError("Payload invalido", 400);
    const payload = payloadRaw as Array<Record<string, unknown>>;
    if (payload.length === 0) return res.status(200).json({ created: 0 });
    if (payload.length > 500) throw new AppError("Limite de 500 transacoes por importacao", 400);

    // validate categories ownership
    const categories = await categoryRepository.listForUser(req.user!.userId);
    const validCategoryIds = new Set(categories.map((c) => c.id));

    type ImportedTransactionInput = {
      userId: string;
      categoryId: string;
      type: TransactionType;
      amount: number;
      description: string;
      occurredAt: Date;
      tags?: string[];
    };

    const inputs: ImportedTransactionInput[] = payload.map((p) => {
      const categoryId = String(p["categoryId"] ?? "");
      if (!categoryId) throw new AppError("categoryId ausente em uma transacao", 400);
      if (!validCategoryIds.has(categoryId)) throw new AppError("Categoria invalida para o usuario", 403);

      const type = String(p["type"] ?? "expense");
      const amount = Number(p["amount"] ?? 0);
      const description = String(p["description"] ?? "");
      const dateRaw = String(p["date"] ?? "");

      return {
        userId: req.user!.userId,
        categoryId,
        type: (type === "income" ? TransactionType.INCOME : TransactionType.EXPENSE),
        amount,
        description,
        occurredAt: new Date(dateRaw),
        tags: ["imported"],
      };
    });

    // filter duplicates again
    const inputsUnique: ImportedTransactionInput[] = [];
    for (const i of inputs) {
      const dup = await transactionRepository.existsDuplicate(i.userId, i.occurredAt, i.amount, i.description);
      if (!dup) inputsUnique.push(i);
    }

    if (inputsUnique.length === 0) return res.status(200).json({ created: 0 });

    // inserir em lote
    await transactionRepository.createMany(inputsUnique);

    res.status(201).json({ created: inputsUnique.length });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Erro interno ao confirmar importacao" });
    }
  }
});
