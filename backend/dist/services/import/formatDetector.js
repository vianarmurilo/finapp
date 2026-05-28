"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectFormatFromBuffer = detectFormatFromBuffer;
exports.detectIsPdf = detectIsPdf;
async function detectFormatFromBuffer(buffer, filename) {
    const text = buffer.toString("utf8");
    const header = text.split(/\r?\n/)[0] || "";
    const lower = header.toLowerCase();
    if (/^ofx|<ofx/i.test(text))
        return "ofx";
    if (/data;histórico|data;descricao|data;detalhe/i.test(lower) || /nºCartão|estabelecimento/i.test(lower))
        return "nubank";
    if (/itau/i.test(lower) || /agencia;conta|data;descricao;valor/i.test(lower))
        return "itau";
    if (/bradesco/i.test(lower) || /lançamento|documento/i.test(lower))
        return "bradesco";
    if (/inter/i.test(lower) || /descricao;valor|data;descricao/i.test(lower))
        return "inter";
    // Fallback by filename
    if (filename) {
        const fname = filename.toLowerCase();
        if (fname.includes("nubank"))
            return "nubank";
        if (fname.includes("itau"))
            return "itau";
        if (fname.includes("bradesco"))
            return "bradesco";
        if (fname.includes("inter"))
            return "inter";
        if (fname.endsWith(".ofx"))
            return "ofx";
    }
    return "unknown";
}
async function detectIsPdf(buffer) {
    return buffer.slice(0, 4).toString() === "%PDF";
}
