import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../utils/app-error";
import {
  detectImageMimeType,
  extractJsonBlock,
  extractReceiptData,
  normalizeDocumentType,
  normalizePaymentMethod,
  validateExtractedReceipt,
} from "../services/receipt/receiptExtractor";

vi.mock("../config/prisma", () => ({
  prisma: {
    category: {
      findMany: vi.fn().mockResolvedValue([{ name: "Alimentacao" }, { name: "Mercado" }, { name: "Servicos" }]),
    },
    receiptScan: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "scan_123", createdAt: new Date("2025-05-27T12:00:00.000Z") }),
    },
  },
}));

describe("Receipt extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [
            {
              text: '```json\n{"establishmentName":"Mercado Central","cnpj":"12.345.678/0001-90","date":"2025-05-27","time":"12:30","totalAmount":54.9,"paymentMethod":"pix","items":[{"description":"Arroz","quantity":1,"unitPrice":54.9,"totalPrice":54.9}],"documentType":"nfce","suggestedCategory":"Mercado","confidence":0.48,"readingIssues":"texto parcialmente borrado"}\n```',
            },
          ],
        }),
      }),
    );
  });

  it("detects supported image signatures", () => {
    expect(detectImageMimeType(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))).toBe("image/jpeg");
    expect(detectImageMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]))).toBe("image/png");
    expect(detectImageMimeType(Buffer.from("RIFFaaaaWEBPxxxx"))).toBe("image/webp");
  });

  it("normalizes receipt metadata", () => {
    const fixtures = [
      { documentType: "nfce", paymentMethod: "pix" },
      { documentType: "cupom_fiscal", paymentMethod: "crédito" },
      { documentType: "nota_paulista", paymentMethod: "débito" },
    ];

    for (const fixture of fixtures) {
      expect(normalizeDocumentType(fixture.documentType)).not.toBe("desconhecido");
      expect(normalizePaymentMethod(fixture.paymentMethod)).not.toBeNull();
    }
  });

  it("parses a fenced JSON block", () => {
    const extracted = extractJsonBlock('texto antes ```json\n{"foo":"bar"}\n``` texto depois');
    expect(extracted).toBe('{"foo":"bar"}');
  });

  it("validates the extracted receipt payload", () => {
    const data = validateExtractedReceipt(
      {
        establishmentName: "Mercado Central",
        cnpj: "12.345.678/0001-90",
        date: "2025-05-27",
        time: "12:30",
        totalAmount: 54.9,
        paymentMethod: "pix",
        items: [{ description: "Arroz", quantity: 1, unitPrice: 54.9, totalPrice: 54.9 }],
        documentType: "nfce",
        suggestedCategory: "Mercado",
        confidence: 0.48,
        readingIssues: "texto parcialmente borrado",
      },
      ["Alimentacao", "Mercado", "Servicos"],
    );

    expect(data.documentType).toBe("nfce");
    expect(data.paymentMethod).toBe("pix");
    expect(data.lowConfidence).toBe(true);
    expect(data.suggestedCategory).toBe("Mercado");
  });

  it("extracts and persists a receipt scan", async () => {
    const result = await extractReceiptData("ZmFrZS1pbWFnZS1ieXRlcw==", "image/jpeg", "user-123");

    expect(result.scanId).toBe("scan_123");
    expect(result.data.establishmentName).toBe("Mercado Central");
    expect(result.data.lowConfidence).toBe(true);
    expect(result.data.documentType).toBe("nfce");
    expect(result.data.suggestedCategory).toBe("Mercado");
  });

  it("rejects when the model does not identify a receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ text: '```json\n{"establishmentName":"","date":"","totalAmount":0,"documentType":"desconhecido","suggestedCategory":"Mercado","confidence":0.1,"readingIssues":"imagem ilegivel"}\n```' }],
        }),
      }),
    );

    await expect(extractReceiptData("ZmFrZS1pbWFnZS1ieXRlcw==", "image/jpeg", "user-123")).rejects.toMatchObject({
      statusCode: 422,
      message: "Não foi possível identificar uma nota fiscal nesta imagem",
    } as Partial<AppError>);
  });
});
