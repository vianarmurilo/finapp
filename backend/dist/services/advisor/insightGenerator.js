"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInsightsForUser = generateInsightsForUser;
const prisma_1 = require("../../config/prisma");
const MODEL = "claude-sonnet-4-20250514";
const CACHE_HOURS = 6;
const RATE_LIMIT_PER_DAY = 10;
function buildPrompt(ctx) {
    const contextJson = JSON.stringify(ctx, null, 2);
    return `System: Você é um consultor financeiro pessoal brasileiro, direto e prático.\nUser: Com base no seguinte contexto financeiro do usuário, responda com JSON contendo: 3 alertas prioritarios (title,severity), 2 sugestões de economia (suggestion, estimatedMonthlySavings em BRL), 1 insight positivo, e um score de saude financeira 0-100 com justificativa curta.\nContext: ${contextJson}\nResposta: apenas um JSON seguindo o schema.`;
}
async function generateInsightsForUser(userId, ctx, forceRefresh = false) {
    // check cache
    const now = new Date();
    const existing = await prisma_1.prisma.advisorCache.findFirst({ where: { userId, expiresAt: { gt: now } }, orderBy: { generatedAt: "desc" } });
    if (existing && !forceRefresh) {
        return { insights: existing.insights, generatedAt: existing.generatedAt, expiresAt: existing.expiresAt };
    }
    // rate limit check
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const callsToday = await prisma_1.prisma.advisorCache.count({ where: { userId, generatedAt: { gte: since } } });
    if (callsToday >= RATE_LIMIT_PER_DAY && !forceRefresh) {
        if (existing) {
            return { insights: existing.insights, generatedAt: existing.generatedAt, expiresAt: existing.expiresAt };
        }
        throw new Error("Limite diario de chamadas ao modelo atingido");
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
        throw new Error("Anthropic API key nao configurada");
    const prompt = buildPrompt(ctx);
    const resp = await fetch("https://api.anthropic.com/v1/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: MODEL, prompt, max_tokens: 800 }),
    });
    if (!resp.ok) {
        // fallback to last cache if available
        if (existing)
            return { insights: existing.insights, generatedAt: existing.generatedAt, expiresAt: existing.expiresAt };
        throw new Error("Falha ao gerar insights com o provedor de IA");
    }
    const body = (await resp.json());
    const text = (body.completion ?? body.output ?? body.text ?? "");
    // attempt parse JSON
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (err) {
        // try to extract JSON substring
        const m = text.match(/\{[\s\S]*\}/);
        if (m)
            parsed = JSON.parse(m[0]);
        else {
            if (existing)
                return { insights: existing.insights, generatedAt: existing.generatedAt, expiresAt: existing.expiresAt };
            throw new Error("Resposta do modelo invalida");
        }
    }
    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + CACHE_HOURS * 60 * 60 * 1000);
    await prisma_1.prisma.advisorCache.create({ data: { userId, insights: parsed, financialContext: ctx, generatedAt, expiresAt } });
    // log structured info (token cost not available reliably here)
    console.log(JSON.stringify({ event: "advisor.generated", userId, generatedAt: generatedAt.toISOString(), model: MODEL }));
    return { insights: parsed, generatedAt, expiresAt };
}
