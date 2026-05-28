"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envelopesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const envelopeService_1 = require("../services/envelope/envelopeService");
const app_error_1 = require("../utils/app-error");
const envelopeService = new envelopeService_1.EnvelopeService();
const envelopeBodySchema = zod_1.z.object({
    categoryId: zod_1.z.uuid().nullable().optional(),
    name: zod_1.z.string().min(2).max(140),
    budgetAmount: zod_1.z.coerce.number().positive(),
    month: zod_1.z.coerce.number().int().min(1).max(12),
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
    color: zod_1.z.string().min(4).max(20),
    icon: zod_1.z.string().min(1).max(80),
});
const envelopeUpdateSchema = envelopeBodySchema.partial().refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo");
const monthQuerySchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    year: zod_1.z.coerce.number().int().min(2020).max(2100).optional(),
});
const idParamSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
const monthYearParamSchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12),
    year: zod_1.z.coerce.number().int().min(2020).max(2100),
});
function parseOrThrow(schema, raw, message) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        throw new app_error_1.AppError(message, 400);
    }
    return parsed.data;
}
exports.envelopesRouter = (0, express_1.Router)();
exports.envelopesRouter.use(auth_middleware_1.authMiddleware);
exports.envelopesRouter.get("/", async (req, res) => {
    const query = parseOrThrow(monthQuerySchema, req.query, "Filtros invalidos para envelopes");
    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();
    const envelopes = await envelopeService.getEnvelopesForMonth(req.user.userId, month, year);
    res.status(200).json({ month, year, items: envelopes });
});
exports.envelopesRouter.get("/:month/:year", async (req, res) => {
    const params = parseOrThrow(monthYearParamSchema, req.params, "Mes ou ano invalidos");
    const envelopes = await envelopeService.getEnvelopesForMonth(req.user.userId, params.month, params.year);
    res.status(200).json({ month: params.month, year: params.year, items: envelopes });
});
exports.envelopesRouter.post("/", async (req, res) => {
    const body = parseOrThrow(envelopeBodySchema, req.body, "Dados invalidos para criar envelope");
    const envelope = await envelopeService.createEnvelope(req.user.userId, body);
    res.status(201).json(envelope);
});
exports.envelopesRouter.put("/:id", async (req, res) => {
    const params = parseOrThrow(idParamSchema, req.params, "Envelope invalido");
    const body = parseOrThrow(envelopeUpdateSchema, req.body, "Dados invalidos para atualizar envelope");
    const envelope = await envelopeService.updateEnvelope(req.user.userId, params.id, body);
    res.status(200).json(envelope);
});
exports.envelopesRouter.delete("/:id", async (req, res) => {
    const params = parseOrThrow(idParamSchema, req.params, "Envelope invalido");
    await envelopeService.deleteEnvelope(req.user.userId, params.id);
    res.status(204).send();
});
