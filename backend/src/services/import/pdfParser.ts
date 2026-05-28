/**
 * Parser de PDF de extratos bancários usando pdf-parse
 * Retorna array de linhas parseadas ou linhas cruas para revisão
 */
import pdfParseModule from "pdf-parse";
import { Buffer } from "buffer";
import { ParsedTransaction } from "./csvParser";

const pdfParse = pdfParseModule as unknown as (buffer: Buffer) => Promise<{ text: string }>;

const transactionLineRegexes: RegExp[] = [
  // Ex: 01/02/2024 Compra Supermercado -23,45
  /(?<date>\d{2}\/\d{2}\/\d{4})\s+(?<desc>.+?)\s+(?<value>-?\d+[\d\.]*,\d{2})/,
  // Ex: 01/02/2024  Supermercado  -23.45
  /(?<date>\d{2}\/\d{2}\/\d{4})\s+(?<desc>.+?)\s+(?<value>-?\d+[\d\.]*\.\d{2})/,
];

export async function parsePdfBuffer(buffer: Buffer): Promise<{ parsed: ParsedTransaction[]; rawLines?: string[] }> {
  const data = await pdfParse(buffer);
  const text = data.text || "";

  const lines = text.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);

  const parsed: ParsedTransaction[] = [];

  for (const line of lines) {
    let matched = false;
    for (const rx of transactionLineRegexes) {
      const m = rx.exec(line);
      if (m && m.groups) {
        const dateRaw = m.groups["date"];
        const desc = m.groups["desc"].replace(/\s{2,}/g, " ");
        const valueRaw = m.groups["value"].replace(/\./g, "").replace(/,/, ".");
        const n = Number(valueRaw);
        if (!Number.isNaN(n)) {
          parsed.push({ date: new Date(dateRaw.split("/").reverse().join("-")).toISOString().slice(0, 10), description: desc, amount: Math.abs(n), type: n >= 0 ? "income" : "expense" });
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      // continue to next
    }
  }

  if (parsed.length === 0) {
    return { parsed: [], rawLines: lines };
  }

  return { parsed };
}
