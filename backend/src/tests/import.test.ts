import { describe, it, expect } from "vitest";
import { parseCsvBuffer } from "../services/import/csvParser";
import { detectFormatFromBuffer, detectIsPdf } from "../services/import/formatDetector";

describe("CSV Parser e Detector", () => {
  it("deve detectar formato nubank via header", async () => {
    const csv = "Data;Histórico;Valor\n01/05/2026;PIX RECEBIDO;100,00";
    const buf = Buffer.from(csv, "utf8");
    const format = await detectFormatFromBuffer(buf, "nubank.csv");
    expect(format).toBe("nubank");
  });

  it("deve parsear CSV utf8 do nubank", async () => {
    const csv = "Data;Histórico;Valor\n01/05/2026;SUPERMERCADO; -123,45\n02/05/2026;SALÁRIO; 2500,00";
    const buf = Buffer.from(csv, "utf8");
    const parsed = await parseCsvBuffer(buf, "utf8");
    expect(parsed.length).toBe(2);
    expect(parsed[0].description).toContain("SUPERMERCADO");
    expect(parsed[0].amount).toBeCloseTo(123.45);
    expect(parsed[0].type).toBe("expense");
    expect(parsed[1].type).toBe("income");
  });

  it("deve tentar detectar PDF por header bytes", async () => {
    const pdfFake = Buffer.from("%PDF-1.4\n% fake");
    const isPdf = await detectIsPdf(pdfFake);
    expect(isPdf).toBe(true);
  });
});
