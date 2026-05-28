"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptRouter = void 0;
const express_1 = require("express");
const multer_1 = __importStar(require("multer"));
const zod_1 = require("zod");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const app_error_1 = require("../utils/app-error");
const receiptExtractor_1 = require("../services/receipt/receiptExtractor");
const receipt_1 = require("../types/receipt");
const receiptUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 8 * 1024 * 1024,
    },
    fileFilter: (_req, file, callback) => {
        const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
        if (!allowedTypes.has(file.mimetype)) {
            callback(new app_error_1.AppError("Envie uma imagem JPEG, PNG ou WEBP.", 422));
            return;
        }
        callback(null, true);
    },
});
const confirmReceiptSchema = zod_1.z.object({
    scanId: zod_1.z.string().uuid(),
    data: zod_1.z
        .object({
        categoryId: zod_1.z.string().uuid(),
        description: zod_1.z.string().min(2).max(255).optional(),
        amount: zod_1.z.number().positive().optional(),
        occurredAt: zod_1.z.coerce.date().optional(),
        paymentMethod: zod_1.z.nativeEnum(receipt_1.PaymentMethod).nullable().optional(),
        merchant: zod_1.z.string().max(120).nullable().optional(),
        tags: zod_1.z.array(zod_1.z.string().max(30)).max(12).optional(),
    })
        .passthrough(),
});
function uploadSingle(req, res) {
    return new Promise((resolve, reject) => {
        receiptUpload.single("image")(req, res, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
exports.receiptRouter = (0, express_1.Router)();
exports.receiptRouter.use(auth_middleware_1.authMiddleware);
exports.receiptRouter.post("/scan", async (req, res, next) => {
    try {
        await uploadSingle(req, res);
        if (!req.file?.buffer) {
            throw new app_error_1.AppError("Envie a foto da nota fiscal.", 422);
        }
        const mimeType = (0, receiptExtractor_1.detectImageMimeType)(req.file.buffer);
        if (!mimeType) {
            throw new app_error_1.AppError("A imagem enviada não parece ser válida.", 422);
        }
        const imageBase64 = req.file.buffer.toString("base64");
        const result = await (0, receiptExtractor_1.extractReceiptData)(imageBase64, mimeType, req.user.userId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof multer_1.MulterError && error.code === "LIMIT_FILE_SIZE") {
            next(new app_error_1.AppError("A imagem enviada excede o limite de 8 MB.", 413));
            return;
        }
        next(error);
    }
});
exports.receiptRouter.post("/confirm", async (req, res, next) => {
    try {
        const payload = confirmReceiptSchema.parse(req.body);
        const result = await (0, receiptExtractor_1.confirmReceipt)(req.user.userId, payload);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
