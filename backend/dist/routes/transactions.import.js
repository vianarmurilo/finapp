"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const formatDetector_1 = require("../services/import/formatDetector");
const csvParser_1 = require("../services/import/csvParser");
const pdfParser_1 = require("../services/import/pdfParser");
const category_repository_1 = require("../repositories/category.repository");
const transaction_repository_1 = require("../repositories/transaction.repository");
const autoCategorizor_1 = require("../services/import/autoCategorizor");
const app_error_1 = require("../utils/app-error");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const categoryRepository = new category_repository_1.CategoryRepository();
const transactionRepository = new transaction_repository_1.TransactionRepository();
exports.importRouter = (0, express_1.Router)();
exports.importRouter.use(auth_middleware_1.authMiddleware);
// Preview import
exports.importRouter.post("/import", upload.single("file"), async (req, res) => {
    try {
        if (!req.file)
            throw new app_error_1.AppError("Arquivo nao enviado", 400);
        const buffer = req.file.buffer;
        const format = await (0, formatDetector_1.detectFormatFromBuffer)(buffer, req.file.originalname);
        const isPdf = await (0, formatDetector_1.detectIsPdf)(buffer);
        let parsed = [];
        if (isPdf) {
            const out = await (0, pdfParser_1.parsePdfBuffer)(buffer);
            if (out.rawLines) {
                return res.status(200).json({ format, parsed: [], rawLines: out.rawLines });
            }
            parsed = out.parsed;
        }
        else {
            // try utf8 then latin1
            try {
                parsed = await (0, csvParser_1.parseCsvBuffer)(buffer, "utf8");
            }
            catch (err) {
                // try latin1
                try {
                    parsed = await (0, csvParser_1.parseCsvBuffer)(buffer, "latin1");
                }
                catch (err2) {
                    throw new app_error_1.AppError("Falha ao parsear CSV", 400);
                }
            }
        }
        if (parsed.length > 500)
            throw new app_error_1.AppError("Limite de 500 transacoes por importacao", 400);
        // deduplicate against existing transactions
        const unique = [];
        for (const p of parsed) {
            const dup = await transactionRepository.existsDuplicate(req.user.userId, new Date(p.date), p.amount, p.description);
            if (!dup)
                unique.push(p);
        }
        const categories = await categoryRepository.listForUser(req.user.userId);
        // run auto categorizador
        const descriptions = unique.map((u) => u.description);
        let suggestions = [];
        try {
            suggestions = await (0, autoCategorizor_1.suggestCategoriesBatch)(descriptions, categories.map((c) => ({ id: c.id, name: c.name })));
        }
        catch (err) {
            // não bloqueia; apenas não teremos sugestões
        }
        const preview = unique.map((u, idx) => ({ ...u, suggestedCategory: suggestions[idx] ?? null, auto_categorized: suggestions[idx] ? true : false }));
        res.status(200).json({ format, parsed: preview });
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            res.status(err.statusCode).json({ message: err.message });
        }
        else {
            res.status(500).json({ message: "Erro interno ao importar" });
        }
    }
});
// Confirm import and save
exports.importRouter.post("/import/confirm", async (req, res) => {
    try {
        const payloadRaw = req.body;
        if (!Array.isArray(payloadRaw))
            throw new app_error_1.AppError("Payload invalido", 400);
        const payload = payloadRaw;
        if (payload.length === 0)
            return res.status(200).json({ created: 0 });
        if (payload.length > 500)
            throw new app_error_1.AppError("Limite de 500 transacoes por importacao", 400);
        // validate categories ownership
        const categories = await categoryRepository.listForUser(req.user.userId);
        const validCategoryIds = new Set(categories.map((c) => c.id));
        const inputs = payload.map((p) => {
            const categoryId = String(p["categoryId"] ?? "");
            if (!categoryId)
                throw new app_error_1.AppError("categoryId ausente em uma transacao", 400);
            if (!validCategoryIds.has(categoryId))
                throw new app_error_1.AppError("Categoria invalida para o usuario", 403);
            const type = String(p["type"] ?? "expense");
            const amount = Number(p["amount"] ?? 0);
            const description = String(p["description"] ?? "");
            const dateRaw = String(p["date"] ?? "");
            return {
                userId: req.user.userId,
                categoryId,
                type: (type === "income" ? client_1.TransactionType.INCOME : client_1.TransactionType.EXPENSE),
                amount,
                description,
                occurredAt: new Date(dateRaw),
                tags: ["imported"],
            };
        });
        // filter duplicates again
        const inputsUnique = [];
        for (const i of inputs) {
            const dup = await transactionRepository.existsDuplicate(i.userId, i.occurredAt, i.amount, i.description);
            if (!dup)
                inputsUnique.push(i);
        }
        if (inputsUnique.length === 0)
            return res.status(200).json({ created: 0 });
        // inserir em lote
        await transactionRepository.createMany(inputsUnique);
        res.status(201).json({ created: inputsUnique.length });
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            res.status(err.statusCode).json({ message: err.message });
        }
        else {
            res.status(500).json({ message: "Erro interno ao confirmar importacao" });
        }
    }
});
