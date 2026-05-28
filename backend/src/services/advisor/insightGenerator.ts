import { prisma } from "../../config/prisma";
import { FinancialContext } from "./financialContext";

export type AdvisorInsights = {
  alerts: { title: string; severity: "high" | "medium" | "low" }[];
  savingsSuggestions: { suggestion: string; estimatedMonthlySavings: string }[];
  positiveInsight: string;
  healthScore: number;
  healthJustification: string;
};

const MODEL = "claude-sonnet-4-20250514";
const CACHE_HOURS = 6;
const RATE_LIMIT_PER_DAY = 10;

function buildPrompt(ctx: FinancialContext): string {
  const contextJson = JSON.stringify(ctx, null, 2);
  return `System: Você é um consultor financeiro pessoal brasileiro, direto e prático.\nUser: Com base no seguinte contexto financeiro do usuário, responda com JSON contendo: 3 alertas prioritarios (title,severity), 2 sugestões de economia (suggestion, estimatedMonthlySavings em BRL), 1 insight positivo, e um score de saude financeira 0-100 com justificativa curta.\nContext: ${contextJson}\nResposta: apenas um JSON seguindo o schema.`;
}

export async function generateInsightsForUser(userId: string, ctx: FinancialContext, forceRefresh = false): Promise<{ insights: AdvisorInsights; generatedAt: Date; expiresAt: Date }> {
  // check cache
  const now = new Date();
  const existing = await prisma.advisorCache.findFirst({ where: { userId, expiresAt: { gt: now } }, orderBy: { generatedAt: "desc" } });
  if (existing && !forceRefresh) {
    return { insights: existing.insights as AdvisorInsights, generatedAt: existing.generatedAt, expiresAt: existing.expiresAt };
  }

  // rate limit check
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const callsToday = await prisma.advisorCache.count({ where: { userId, generatedAt: { gte: since } } });
  if (callsToday >= RATE_LIMIT_PER_DAY && !forceRefresh) {
    if (existing) {
      return { insights: existing.insights as AdvisorInsights, generatedAt: existing.generatedAt, expiresAt: existing.expiresAt };
    }
    throw new Error("Limite diario de chamadas ao modelo atingido");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key nao configurada");

  const prompt = buildPrompt(ctx);

  const resp = await fetch("https://api.anthropic.com/v1/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, prompt, max_tokens: 800 }),
  });

  if (!resp.ok) {
    // fallback to last cache if available
    if (existing) return { insights: existing.insights as AdvisorInsights, generatedAt: existing.generatedAt, expiresAt: existing.expiresAt };
    throw new Error("Falha ao gerar insights com o provedor de IA");
  }

  const body = (await resp.json()) as Record<string, unknown>;
  const text = (body.completion ?? body.output ?? body.text ?? "") as string;

  // attempt parse JSON
  let parsed: AdvisorInsights;
  try {
    parsed = JSON.parse(text) as AdvisorInsights;
  } catch (err) {
    // try to extract JSON substring
    const m = text.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]) as AdvisorInsights;
    else {
      if (existing) return { insights: existing.insights as AdvisorInsights, generatedAt: existing.generatedAt, expiresAt: existing.expiresAt };
      throw new Error("Resposta do modelo invalida");
    }
  }

  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + CACHE_HOURS * 60 * 60 * 1000);

  await prisma.advisorCache.create({ data: { userId, insights: parsed, financialContext: ctx, generatedAt, expiresAt } });

  // log structured info (token cost not available reliably here)
  console.log(JSON.stringify({ event: "advisor.generated", userId, generatedAt: generatedAt.toISOString(), model: MODEL }));

  return { insights: parsed, generatedAt, expiresAt };
}
