import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middlewares/auth.middleware";
import { EnvelopeService } from "../services/envelope/envelopeService";
import { AppError } from "../utils/app-error";

const envelopeService = new EnvelopeService();

const envelopeBodySchema = z.object({
  categoryId: z.uuid().nullable().optional(),
  name: z.string().min(2).max(140),
  budgetAmount: z.coerce.number().positive(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  color: z.string().min(4).max(20),
  icon: z.string().min(1).max(80),
});

const envelopeUpdateSchema = envelopeBodySchema.partial().refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo");

const monthQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });
const monthYearParamSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown, message: string): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(message, 400);
  }

  return parsed.data;
}

export const envelopesRouter = Router();

envelopesRouter.use(authMiddleware);

envelopesRouter.get("/", async (req: Request, res: Response) => {
  const query = parseOrThrow(monthQuerySchema, req.query, "Filtros invalidos para envelopes");
  const now = new Date();
  const month = query.month ?? now.getMonth() + 1;
  const year = query.year ?? now.getFullYear();

  const envelopes = await envelopeService.getEnvelopesForMonth(req.user!.userId, month, year);
  res.status(200).json({ month, year, items: envelopes });
});

envelopesRouter.get("/:month/:year", async (req: Request, res: Response) => {
  const params = parseOrThrow(monthYearParamSchema, req.params, "Mes ou ano invalidos");
  const envelopes = await envelopeService.getEnvelopesForMonth(req.user!.userId, params.month, params.year);
  res.status(200).json({ month: params.month, year: params.year, items: envelopes });
});

envelopesRouter.post("/", async (req: Request, res: Response) => {
  const body = parseOrThrow(envelopeBodySchema, req.body, "Dados invalidos para criar envelope");
  const envelope = await envelopeService.createEnvelope(req.user!.userId, body);
  res.status(201).json(envelope);
});

envelopesRouter.put("/:id", async (req: Request, res: Response) => {
  const params = parseOrThrow(idParamSchema, req.params, "Envelope invalido");
  const body = parseOrThrow(envelopeUpdateSchema, req.body, "Dados invalidos para atualizar envelope");
  const envelope = await envelopeService.updateEnvelope(req.user!.userId, params.id, body);
  res.status(200).json(envelope);
});

envelopesRouter.delete("/:id", async (req: Request, res: Response) => {
  const params = parseOrThrow(idParamSchema, req.params, "Envelope invalido");
  await envelopeService.deleteEnvelope(req.user!.userId, params.id);
  res.status(204).send();
});
