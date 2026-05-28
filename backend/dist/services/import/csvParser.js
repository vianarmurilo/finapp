"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvBuffer = parseCsvBuffer;
function tryParseNumber(raw) {
    // Remove espaços e pontos de milhar
    const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
    const n = Number(cleaned);
    if (Number.isNaN(n))
        throw new Error(`Valor invalido: ${raw}`);
    return n;
}
function parseDateBR(raw) {
    // possíveis formatos: DD/MM/YYYY ou YYYY-MM-DD
    const trimmed = raw.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        const [d, m, y] = trimmed.split("/");
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // fallback: Date parse
    const dObj = new Date(trimmed);
    if (isNaN(dObj.getTime()))
        throw new Error(`Data invalida: ${raw}`);
    return dObj.toISOString().slice(0, 10);
}
/**
 * Parse CSV genérico
 */
async function parseCsvBuffer(buffer, encoding = "utf8") {
    const text = buffer.toString(encoding);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0)
        return [];
    // detect delimiter by header
    const header = lines[0];
    const delimiter = header.includes(";") ? ";" : header.includes(",") ? "," : ",";
    const cols = header.split(delimiter).map((c) => c.toLowerCase());
    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(delimiter).map((c) => c.trim());
        if (row.length < 2)
            continue;
        // heurísticas por colunas
        let dateRaw = "";
        let desc = "";
        let amountRaw = "";
        // common headers
        const idxDate = cols.findIndex((c) => c.includes("data") || c.includes("date") || c.includes("dt"));
        const idxDesc = cols.findIndex((c) => c.includes("hist") || c.includes("descricao") || c.includes("description") || c.includes("estabelecimento") || c.includes("detalhe") || c.includes("descricao"));
        const idxAmount = cols.findIndex((c) => c.includes("valor") || c.includes("amount") || c.includes("valor") || c.includes("credito") || c.includes("debito") || c.includes("valor"));
        if (idxDate >= 0)
            dateRaw = row[idxDate] ?? row[0];
        else
            dateRaw = row[0];
        if (idxDesc >= 0)
            desc = row[idxDesc] ?? row[1];
        else
            desc = row[1] ?? row[0];
        if (idxAmount >= 0)
            amountRaw = row[idxAmount];
        else
            amountRaw = row[row.length - 1];
        let amount;
        try {
            amount = tryParseNumber(amountRaw.replace(/[^0-9,.-]/g, ""));
        }
        catch (err) {
            // pular linha inválida
            continue;
        }
        const type = amount >= 0 ? "income" : "expense";
        let dateIso;
        try {
            dateIso = parseDateBR(dateRaw);
        }
        catch (err) {
            // pular linha sem data
            continue;
        }
        results.push({ date: dateIso, description: desc, amount: Math.abs(amount), type });
    }
    return results;
}
/**
 * Parsers específicos por banco podem ser adicionados aqui no futuro.
 */
