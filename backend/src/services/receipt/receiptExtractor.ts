import { Prisma, TransactionType } from "@prisma/client";
import { Buffer } from "buffer";
import { prisma } from "../../config/prisma";
import { CategoryRepository } from "../../repositories/category.repository";
import { TransactionRepository } from "../../repositories/transaction.repository";
import { TransactionService } from "../transaction.service";
import { AppError } from "../../utils/app-error";
import {
  DocumentType,
  ExtractedReceiptDto,
  PaymentMethod,
  ReceiptConfirmRequest,
  ReceiptScanResponse,
} from "../../types/receipt";

type AnthropicTextContent = { type?: string; text?: string };

type AnthropicReceiptResponse = {
  content?: AnthropicTextContent[];
};

type ReceiptPromptPayload = {
  establishmentName: string;
  cnpj: string | null;
  date: string;
  time: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  documentType: DocumentType;
  suggestedCategory: string;
  confidence: number;
  readingIssues: string | null;
};

const MAX_SCANS_PER_DAY = 10;
const SYSTEM_PROMPT =
  "Você é um especialista em leitura de documentos fiscais brasileiros.\nSua tarefa é extrair informações de notas fiscais, cupons fiscais e NFC-e.\nResponda APENAS com JSON válido, sem texto adicional, sem markdown.";

function normalizeDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function detectImageMimeType(buffer: Buffer): string | null {
  if (buffer.length < 12) {
    return null;
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  if (isJpeg) return "image/jpeg";
  if (isPng) return "image/png";
  if (isWebp) return "image/webp";
  return null;
}

function extractJsonBlock(text: string): string | null {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  return objectMatch?.[0]?.trim() ?? null;
}

function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (text === "dinheiro") return PaymentMethod.Dinheiro;
  if (text === "débito" || text === "debito") return PaymentMethod.Debito;
  if (text === "crédito" || text === "credito") return PaymentMethod.Credito;
  if (text === "pix") return PaymentMethod.Pix;
  return null;
}

function normalizeDocumentType(value: unknown): DocumentType {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === DocumentType.NFCe) return DocumentType.NFCe;
  if (text === DocumentType.CupomFiscal) return DocumentType.CupomFiscal;
  if (text === DocumentType.NotaPaulista) return DocumentType.NotaPaulista;
  if (text === DocumentType.NotaFiscal) return DocumentType.NotaFiscal;
  return DocumentType.Desconhecido;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value ?? "").replace("R$", "").replace(/\./g, "").replace(/,/g, ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function buildUserPrompt(categories: string[], base64: string, mimeType: string): string {
  const categoryList = categories.length > 0 ? categories.join("\n") : "Sem categoria";

  return `Analise esta imagem de nota fiscal/cupom e extraia as seguintes informações.
Retorne SOMENTE este JSON, sem explicações:
{
  'establishmentName': string (nome do estabelecimento/loja),
  'cnpj': string | null (CNPJ formatado XX.XXX.XXX/XXXX-XX ou null),
  'date': string (data da compra no formato YYYY-MM-DD),
  'time': string | null (horário HH:MM ou null),
  'totalAmount': number (valor total em reais, apenas número),
  'paymentMethod': string | null ('dinheiro'|'débito'|'crédito'|'pix'|null),
  'items': [
    {
      'description': string,
      'quantity': number,
      'unitPrice': number,
      'totalPrice': number
    }
  ],
  'documentType': string ('nfce'|'cupom_fiscal'|'nota_paulista'|'nota_fiscal'|'desconhecido'),
  'suggestedCategory': string (categoria mais provável baseada no estabelecimento e itens),
  'confidence': number (0 a 1, sua confiança na leitura),
  'readingIssues': string | null (descreva problemas de leitura se houver, ex: imagem borrada)
}

Para suggestedCategory, use EXATAMENTE um destes valores que batem com as categorias do usuário:
${categoryList}

Se não conseguir ler algum campo, use null. Nunca invente dados.

Informações técnicas da imagem:
- mimeType: ${mimeType}
- imageBase64Prefix: ${base64.slice(0, 64)}`;
}

function validateExtractedReceipt(raw: ReceiptPromptPayload, allowedCategories: string[]): ExtractedReceiptDto {
  const establishmentName = String(raw.establishmentName ?? "").trim();
  const date = String(raw.date ?? "").trim();
  const totalAmount = toNumber(raw.totalAmount);
  const confidence = typeof raw.confidence === "number" ? raw.confidence : Number(raw.confidence ?? 0);
  const documentType = normalizeDocumentType(raw.documentType);

  if (documentType === DocumentType.Desconhecido) {
    throw new AppError("Não foi possível identificar uma nota fiscal nesta imagem", 422);
  }

  if (!establishmentName || !date || !Number.isFinite(totalAmount)) {
    throw new AppError("Não foi possível ler a nota fiscal desta imagem. Tente uma foto mais nítida.", 422);
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError("Não foi possível ler a nota fiscal desta imagem. Tente uma foto mais nítida.", 422);
  }

  const suggestedCategory = allowedCategories.includes(raw.suggestedCategory) ? raw.suggestedCategory : allowedCategories[0] ?? "Sem categoria";
  if (!Number.isFinite(confidence)) {
    throw new AppError("Não foi possível ler a nota fiscal desta imagem. Tente uma foto mais nítida.", 422);
  }

  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => ({
        description: String(item.description ?? "").trim(),
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unitPrice ?? 0),
        totalPrice: Number(item.totalPrice ?? 0),
      }))
    : [];

  return {
    establishmentName,
    cnpj: raw.cnpj ? String(raw.cnpj).trim() : null,
    date: parsedDate.toISOString().slice(0, 10),
    time: raw.time ? String(raw.time).slice(0, 5) : null,
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentMethod: normalizePaymentMethod(raw.paymentMethod),
    items,
    documentType,
    suggestedCategory,
    confidence: Number(confidence.toFixed(2)),
    readingIssues: raw.readingIssues ? String(raw.readingIssues) : null,
    lowConfidence: confidence < 0.5 || undefined,
  };
}

async function anthropicExtract(imageBase64: string, mimeType: string, userId: string): Promise<string> {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { name: true },
  });

  const prompt = buildUserPrompt(categories.map((category) => category.name), imageBase64, mimeType);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AppError("Chave da Anthropic não configurada", 500);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1400,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new AppError("Não foi possível ler a nota fiscal no momento. Tente novamente.", 422);
    }

    const body = (await response.json()) as AnthropicReceiptResponse;
    return body.content?.map((chunk) => chunk.text ?? "").join("") ?? "";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("A leitura da nota demorou demais. Tente novamente em instantes.", 504);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Não foi possível ler a nota fiscal no momento. Tente novamente.", 422);
  } finally {
    clearTimeout(timeout);
  }
}

function enforceDailyScanLimit(userId: string) {
  const { start, end } = getTodayRange();
  return prisma.receiptScan.count({
    where: { userId, createdAt: { gte: start, lt: end } },
  }).then((count) => {
    if (count >= MAX_SCANS_PER_DAY) {
      throw new AppError("Você atingiu o limite diário de leituras de nota fiscal.", 429);
    }
  });
}

/**
 * Extrai dados estruturados de uma nota fiscal a partir de uma imagem em base64.
 */
export async function extractReceiptData(imageBase64: string, mimeType: string, userId: string): Promise<ReceiptScanResponse> {
  if (!imageBase64.trim()) {
    throw new AppError("Imagem inválida.", 422);
  }

  await enforceDailyScanLimit(userId);
  const startedAt = Date.now();
  const text = await anthropicExtract(imageBase64, mimeType, userId);
  const jsonText = extractJsonBlock(text);

  if (!jsonText) {
    throw new AppError("Não foi possível identificar uma nota fiscal nesta imagem", 422);
  }

  let parsed: ReceiptPromptPayload;
  try {
    parsed = JSON.parse(jsonText) as ReceiptPromptPayload;
  } catch {
    const fallback = extractJsonBlock(text.replace(/'/g, '"'));
    if (!fallback) {
      throw new AppError("Não foi possível ler a nota fiscal desta imagem. Tente uma foto mais nítida.", 422);
    }
    parsed = JSON.parse(fallback) as ReceiptPromptPayload;
  }

  const allowedCategories = (await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { name: true },
  })).map((category) => category.name);

  const data = validateExtractedReceipt(parsed, allowedCategories);

  const scan = await prisma.receiptScan.create({
    data: {
      userId,
      rawExtraction: parsed as Prisma.InputJsonValue,
      confidence: data.confidence,
    },
  });

  console.log(
    JSON.stringify({
      event: "receipt.scan.completed",
      userId,
      durationMs: Date.now() - startedAt,
      confidence: data.confidence,
      documentType: data.documentType,
    }),
  );

  return {
    scanId: scan.id,
    data,
    createdAt: scan.createdAt.toISOString(),
  };
}

/**
 * Confirma a leitura da nota fiscal e cria a Transaction correspondente.
 */
export async function confirmReceipt(userId: string, request: ReceiptConfirmRequest): Promise<unknown> {
  const scan = await prisma.receiptScan.findFirst({
    where: { id: request.scanId, userId },
  });

  if (!scan) {
    throw new AppError("Leitura de nota fiscal não encontrada.", 404);
  }

  if (scan.transactionId) {
    throw new AppError("Esta leitura já foi confirmada.", 409);
  }

  const transactionService = new TransactionService(new TransactionRepository(), new CategoryRepository());

  const occurredAt = request.data.occurredAt ?? (request.data.date ? new Date(request.data.date) : new Date());

  const created = await transactionService.create(userId, {
    categoryId: request.data.categoryId,
    type: TransactionType.EXPENSE,
    amount: request.data.amount ?? request.data.totalAmount ?? 0,
    description: (request.data.description ?? request.data.establishmentName ?? "Nota fiscal").trim(),
    occurredAt,
    paymentMethod: request.data.paymentMethod ?? undefined,
    merchant: request.data.merchant ?? request.data.establishmentName,
    tags: Array.from(new Set([...(request.data.tags ?? []), "receipt"])),
  });

  await prisma.receiptScan.update({
    where: { id: scan.id },
    data: { transactionId: created.id },
  });

  return created;
}

export {
  SYSTEM_PROMPT,
  detectImageMimeType,
  extractJsonBlock,
  normalizeDocumentType,
  normalizePaymentMethod,
  validateExtractedReceipt,
};
