"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestCategoriesBatch = suggestCategoriesBatch;
async function suggestCategoriesBatch(descriptions, categories) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
        throw new Error("Chave Anthropic (ANTHROPIC_API_KEY) nao configurada");
    const model = "claude-sonnet-4-20250514";
    const batchSize = 20;
    const results = [];
    for (let i = 0; i < descriptions.length; i += batchSize) {
        const chunk = descriptions.slice(i, i + batchSize);
        const prompt = buildPrompt(chunk, categories);
        const res = await fetch("https://api.anthropic.com/v1/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, prompt, max_tokens: 800 }),
        });
        if (!res.ok) {
            throw new Error(`Falha ao chamar Anthropic: ${res.statusText}`);
        }
        const body = (await res.json());
        const text = (body.completion ?? body.output ?? body.text ?? "");
        // Espera-se JSON array com categorias ou nulls
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                results.push(...parsed.map((p) => (typeof p === "string" ? p : null)));
            }
            else {
                const lines = text.split(/\r?\n/).filter(Boolean);
                for (const ln of lines)
                    results.push(ln.trim() || null);
            }
        }
        catch (err) {
            const lines = text.split(/\r?\n/).filter(Boolean);
            for (const ln of lines)
                results.push(ln.trim() || null);
        }
    }
    return results.slice(0, descriptions.length);
}
function buildPrompt(descriptions, categories) {
    const categoryList = categories.map((c) => `- ${c.name}`).join("\n");
    return `Você é um assistente que deve mapear descrições de transações à categoria mais provável. Responda apenas com um JSON array com o nome da categoria (string) ou null quando desconhecido.\n\nCategorias:\n${categoryList}\n\nTransações:\n${descriptions.map((d) => `- ${d}`).join("\n")}\n\nExemplo de resposta:\n["Mercado", "Transporte", null]`;
}
