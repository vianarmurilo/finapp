import { Router } from "express";
import multer, { MulterError } from "multer";
import { z } from "zod";
import { authMiddleware } from "../middlewares/auth.middleware";
import { AppError } from "../utils/app-error";
import { extractReceiptData, confirmReceipt, detectImageMimeType } from "../services/receipt/receiptExtractor";
import { PaymentMethod } from "../types/receipt";

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.mimetype)) {
      callback(new AppError("Envie uma imagem JPEG, PNG ou WEBP.", 422));
      return;
    }

    callback(null, true);
  },
});

const confirmReceiptSchema = z.object({
  scanId: z.string().uuid(),
  data: z
    .object({
      categoryId: z.string().uuid(),
      description: z.string().min(2).max(255).optional(),
      amount: z.number().positive().optional(),
      occurredAt: z.coerce.date().optional(),
      paymentMethod: z.nativeEnum(PaymentMethod).nullable().optional(),
      merchant: z.string().max(120).nullable().optional(),
      tags: z.array(z.string().max(30)).max(12).optional(),
    })
    .passthrough(),
});

function uploadSingle(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    receiptUpload.single("image")(req, res as never, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export const receiptRouter = Router();

receiptRouter.use(authMiddleware);

receiptRouter.post("/scan", async (req, res, next) => {
  try {
    await uploadSingle(req, res);

    if (!req.file?.buffer) {
      throw new AppError("Envie a foto da nota fiscal.", 422);
    }

    const mimeType = detectImageMimeType(req.file.buffer);
    if (!mimeType) {
      throw new AppError("A imagem enviada não parece ser válida.", 422);
    }

    const imageBase64 = req.file.buffer.toString("base64");
    const result = await extractReceiptData(imageBase64, mimeType, req.user!.userId);
    res.json(result);
  } catch (error) {
    if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("A imagem enviada excede o limite de 8 MB.", 413));
      return;
    }

    next(error);
  }
});

receiptRouter.post("/confirm", async (req, res, next) => {
  try {
    const payload = confirmReceiptSchema.parse(req.body);
    const result = await confirmReceipt(req.user!.userId, payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
