import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/responsive.dart';
import '../../../shared/widgets/financial_card.dart';
import '../../dashboard/controllers/dashboard_controller.dart';
import '../../dashboard/models/dashboard_data.dart';
import '../../goals/controllers/goals_controller.dart';

class IntelligenceScreen extends ConsumerStatefulWidget {
  const IntelligenceScreen({super.key});

  @override
  ConsumerState<IntelligenceScreen> createState() => _IntelligenceScreenState();
}

class _IntelligenceScreenState extends ConsumerState<IntelligenceScreen> {
  Future<void> _createSuggestedGoal(SmartGoalSuggestion suggestion) async {
    try {
      await ref
          .read(goalsServiceProvider)
          .create(
            title: suggestion.title,
            targetAmount: suggestion.targetAmount,
          );
      notifyGoalChange(ref);

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Meta criada: ${suggestion.title}')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao criar meta automática: $error')),
      );
    }
  }

  List<SmartGoalSuggestion> _buildSuggestions(DashboardData data) {
    final income = data.incomes;
    final expense = data.expenses;
    final reserveBase = expense > 0 ? expense * 6 : income * 3;
    final double disciplinedReserve = math.max(300.0, income * 0.12).toDouble();
    final double opportunityFund = math
        .max(500.0, data.balance.abs() * 0.35)
        .toDouble();
    final profile = data.financialProfile;

    return [
      SmartGoalSuggestion(
        title: profile == 'Impulsivo'
            ? 'Cofre de Blindagem'
            : 'Reserva de Emergência',
        description: profile == 'Impulsivo'
            ? 'Reserva protegida para evitar compras por impulso e cobrir imprevistos.'
            : 'Meta automática baseada em até 6 meses de despesas essenciais.',
        targetAmount: reserveBase,
        icon: Icons.shield_outlined,
      ),
      SmartGoalSuggestion(
        title: 'Reserva Programada',
        description:
            'Separação fixa mensal para acelerar metas sem depender de sobra no fim do mês.',
        targetAmount: disciplinedReserve,
        icon: Icons.schedule_outlined,
      ),
      SmartGoalSuggestion(
        title: 'Fundo de Oportunidade',
        description:
            'Cofre flexível para oportunidades, viagens ou compras planejadas com inteligência.',
        targetAmount: opportunityFund,
        icon: Icons.flight_takeoff_outlined,
      ),
    ];
  }

  List<HabitRankItem> _buildRanking(DashboardData data) {
    final reserveTarget = math.max(1, data.incomes * 0.2);
    final scoreRatio = data.nextLevelAt == 0
        ? 0.0
        : data.score / data.nextLevelAt;

    final items = [
      HabitRankItem(
        title: 'Reserva em metas',
        subtitle: 'Quanto do cofrinho já protege sua renda',
        progress: (data.reservedInGoals / reserveTarget).clamp(0.0, 1.0),
        tag:
            '${(data.reservedInGoals / reserveTarget * 100).clamp(0, 100).toStringAsFixed(0)}%',
      ),
      HabitRankItem(
        title: 'Controle de impulso',
        subtitle: 'Quanto menor o impulso, melhor o ranking',
        progress: (1 - data.profileImpulseRate).clamp(0.0, 1.0),
        tag:
            '${((1 - data.profileImpulseRate) * 100).clamp(0, 100).toStringAsFixed(0)}%',
      ),
      HabitRankItem(
        title: 'Estabilidade mensal',
        subtitle: 'Variação das despesas ao longo do tempo',
        progress: (1 - data.profileVariability).clamp(0.0, 1.0),
        tag:
            '${((1 - data.profileVariability) * 100).clamp(0, 100).toStringAsFixed(0)}%',
      ),
      HabitRankItem(
        title: 'Proteção do futuro',
        subtitle: 'Saldo previsto positivo e sustentável',
        progress: data.futureBalance > 0
            ? (data.futureBalance / math.max(1, data.incomes * 2)).clamp(
                0.0,
                1.0,
              )
            : 0,
        tag: data.futureBalance > 0 ? 'Positivo' : 'Atenção',
      ),
      HabitRankItem(
        title: 'Pontuação gamificada',
        subtitle: 'Nível atual e evolução até o próximo marco',
        progress: scoreRatio.clamp(0.0, 1.0),
        tag: 'Nv. ${data.level}',
      ),
    ];

    items.sort((a, b) => b.progress.compareTo(a.progress));
    return items;
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(dashboardProvider);
    final goalsAsync = ref.watch(goalsProvider);

    final dashboard = dashboardAsync.valueOrNull;

    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          ref.refresh(dashboardProvider.future),
          ref.refresh(goalsProvider.future),
        ]);
      },
      child: ListView(
        padding: Responsive.pagePadding(context),
        children: [
          Text(
            'Plano Financeiro Inteligente',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 6),
          Text(
            'Sugestões automáticas, alertas de desvio e desafios personalizados.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 14),
          if (dashboard == null)
            dashboardAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Falha ao carregar plano inteligente: $error'),
                ),
              ),
              data: (data) => _buildContent(context, data, goalsAsync),
            )
          else
            _buildContent(context, dashboard, goalsAsync),
        ],
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    DashboardData data,
    AsyncValue<List<dynamic>> goalsAsync,
  ) {
    final suggestions = _buildSuggestions(data);
    final ranking = _buildRanking(data);
    final fillRatio = data.nextLevelAt == 0
        ? 0.0
        : (data.score / data.nextLevelAt).clamp(0.0, 1.0);
    final metricCardWidth = Responsive.metricCardWidth(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(
              width: metricCardWidth,
              child: FinancialCard(
                title: 'Nível atual',
                amount: data.level.toDouble(),
                icon: Icons.workspace_premium_outlined,
                color: const Color(0xFF005F73),
              ),
            ),
            SizedBox(
              width: metricCardWidth,
              child: FinancialCard(
                title: 'Pontuação',
                amount: data.score.toDouble(),
                icon: Icons.bolt_outlined,
                color: const Color(0xFF0A9396),
              ),
            ),
            SizedBox(
              width: metricCardWidth,
              child: FinancialCard(
                title: 'Reservado',
                amount: data.reservedInGoals,
                icon: Icons.savings_outlined,
                color: const Color(0xFFCA6702),
              ),
            ),
            SizedBox(
              width: metricCardWidth,
              child: FinancialCard(
                title: 'Alerta ativos',
                amount: data.alerts.length.toDouble(),
                icon: Icons.warning_amber_outlined,
                color: const Color(0xFFAE2012),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Meta de evolução',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: fillRatio,
                  minHeight: 10,
                  borderRadius: BorderRadius.circular(10),
                ),
                const SizedBox(height: 8),
                Text(
                  'Você tem ${data.score} pontos e precisa de ${math.max(0, data.nextLevelAt - data.score)} pontos para o próximo nível.',
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: data.achievements.isEmpty
                      ? [
                          const Chip(
                            label: Text('Nenhuma conquista desbloqueada ainda'),
                          ),
                        ]
                      : data.achievements
                            .map(
                              (achievement) => Chip(
                                avatar: const Icon(
                                  Icons.verified_outlined,
                                  size: 18,
                                ),
                                label: Text(
                                  '${achievement.title} +${achievement.points}',
                                ),
                              ),
                            )
                            .toList(),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Plano automático recomendado',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                ...suggestions.map(
                  (suggestion) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.outlineVariant,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Icon(suggestion.icon),
                                Text(
                                  suggestion.title,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                                Text(
                                  'R\$ ${suggestion.targetAmount.toStringAsFixed(2)}',
                                  style: Theme.of(context).textTheme.titleSmall,
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(suggestion.description),
                            const SizedBox(height: 10),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: FilledButton.icon(
                                onPressed: () =>
                                    _createSuggestedGoal(suggestion),
                                icon: const Icon(Icons.add_chart_outlined),
                                label: const Text('Criar meta automática'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          color: Theme.of(context).colorScheme.errorContainer,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Alertas de desvio',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                ...data.alerts.map(
                  (alert) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.report_outlined, size: 18),
                        const SizedBox(width: 8),
                        Expanded(child: Text(alert)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ranking de desafios financeiros',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                ...ranking.asMap().entries.map((entry) {
                  final rank = entry.key + 1;
                  final item = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        color: Theme.of(
                          context,
                        ).colorScheme.surfaceContainerHighest,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 10,
                              runSpacing: 8,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                CircleAvatar(radius: 14, child: Text('$rank')),
                                Text(
                                  item.title,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                                Chip(label: Text(item.tag)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(item.subtitle),
                            const SizedBox(height: 8),
                            LinearProgressIndicator(
                              value: item.progress,
                              minHeight: 8,
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Desafios e hábitos',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                _habitTile(
                  context,
                  title: 'Registrar todas as transações',
                  subtitle: 'Mantém o painel fiel ao comportamento real.',
                  done: data.score >= 100,
                ),
                _habitTile(
                  context,
                  title: 'Guardar dinheiro no cofre',
                  subtitle: 'Aumenta a reserva e melhora o saldo disponível.',
                  done: data.reservedInGoals > 0,
                ),
                _habitTile(
                  context,
                  title: 'Manter o saldo futuro positivo',
                  subtitle:
                      'Fortalece sua projeção e diminui alertas críticos.',
                  done: data.futureBalance > 0,
                ),
                _habitTile(
                  context,
                  title: 'Subir de nível',
                  subtitle: 'Continue acumulando pontos e conquistas.',
                  done: data.score >= data.nextLevelAt,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _habitTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required bool done,
  }) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: done
            ? Colors.green.withValues(alpha: 0.15)
            : Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Icon(
          done ? Icons.check_circle_outline : Icons.radio_button_unchecked,
          color: done ? Colors.green : Colors.grey,
        ),
      ),
      title: Text(title),
      subtitle: Text(subtitle),
    );
  }
}

class SmartGoalSuggestion {
  SmartGoalSuggestion({
    required this.title,
    required this.description,
    required this.targetAmount,
    required this.icon,
  });

  final String title;
  final String description;
  final double targetAmount;
  final IconData icon;
}

class HabitRankItem {
  HabitRankItem({
    required this.title,
    required this.subtitle,
    required this.progress,
    required this.tag,
  });

  final String title;
  final String subtitle;
  final double progress;
  final String tag;
}
