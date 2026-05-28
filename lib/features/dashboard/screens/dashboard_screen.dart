import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:skeletonizer/skeletonizer.dart';
import '../../../core/constants/responsive.dart';
import '../../../shared/widgets/chart_widget.dart';
import '../../../shared/widgets/financial_card.dart';
import '../models/dashboard_data.dart';
import '../controllers/dashboard_controller.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  final _extraSavingController = TextEditingController(text: '300');
  final _monthsController = TextEditingController(text: '12');
  SimulationResult? _simulationResult;
  bool _simulationLoading = false;

  @override
  void dispose() {
    _extraSavingController.dispose();
    _monthsController.dispose();
    super.dispose();
  }

  Future<void> _runSimulation() async {
    final extraSaving = double.tryParse(
      _extraSavingController.text.replaceAll(',', '.'),
    );
    final months = int.tryParse(_monthsController.text.trim());

    if (extraSaving == null ||
        extraSaving < 0 ||
        months == null ||
        months < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Informe um valor válido para simular.')),
      );
      return;
    }

    setState(() => _simulationLoading = true);

    try {
      final result = await ref
          .read(dashboardServiceProvider)
          .simulateScenario(monthlyExtraSaving: extraSaving, months: months);

      if (!mounted) {
        return;
      }

      setState(() {
        _simulationResult = result;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao simular cenário: $error')),
      );
    } finally {
      if (mounted) {
        setState(() => _simulationLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = ref.watch(dashboardProvider);
    final dashboardData = dashboard.valueOrNull;
    final isRefreshing = dashboard.isLoading && dashboardData != null;

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(dashboardProvider.future),
      child: ListView(
        padding: Responsive.pagePadding(context),
        children: [
          Text(
            'Visão Financeira',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 14),
          if (dashboardData == null)
            dashboard.when(
              loading: () => Skeletonizer(
                enabled: true,
                child: Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: const [
                    SizedBox(
                      width: 170,
                      child: FinancialCard(
                        title: 'Saldo',
                        amount: 0,
                        icon: Icons.wallet,
                        color: Colors.black,
                      ),
                    ),
                    SizedBox(
                      width: 170,
                      child: FinancialCard(
                        title: 'Entradas',
                        amount: 0,
                        icon: Icons.arrow_downward,
                        color: Colors.black,
                      ),
                    ),
                    SizedBox(
                      width: 170,
                      child: FinancialCard(
                        title: 'Saídas',
                        amount: 0,
                        icon: Icons.arrow_upward,
                        color: Colors.black,
                      ),
                    ),
                    SizedBox(
                      width: 170,
                      child: FinancialCard(
                        title: 'Reservado',
                        amount: 0,
                        icon: Icons.savings,
                        color: Colors.black,
                      ),
                    ),
                  ],
                ),
              ),
              error: (error, _) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Falha ao carregar dashboard: $error'),
                ),
              ),
              data: (data) =>
                  _buildDashboardContent(context, data, isRefreshing: false),
            )
          else
            Stack(
              children: [
                AnimatedOpacity(
                  opacity: isRefreshing ? 0.72 : 1,
                  duration: const Duration(milliseconds: 180),
                  child: _buildDashboardContent(
                    context,
                    dashboardData,
                    isRefreshing: isRefreshing,
                  ),
                ),
                if (isRefreshing)
                  Positioned.fill(
                    child: IgnorePointer(
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: const LinearProgressIndicator(minHeight: 2),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildDashboardContent(
    BuildContext context,
    DashboardData data, {
    required bool isRefreshing,
  }) {
    final isCompact = Responsive.isMobile(context);
    final metricCardWidth = Responsive.metricCardWidth(context);

    return Column(
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(
              width: metricCardWidth,
              child: FinancialCard(
                title: 'Saldo total',
                amount: data.balance,
                icon: Icons.account_balance_wallet,
                color: const Color(0xFF005F73),
              ),
            ),
            SizedBox(
              width: metricCardWidth,
              child: FinancialCard(
                title: 'Entradas',
                amount: data.incomes,
                icon: Icons.trending_up,
                color: const Color(0xFF0A9396),
              ),
            ),
            SizedBox(
              width: metricCardWidth,
              child: FinancialCard(
                title: 'Saídas',
                amount: data.expenses,
                icon: Icons.trending_down,
                color: const Color(0xFFAE2012),
              ),
            ),
            SizedBox(
              width: metricCardWidth,
              child: FinancialCard(
                title: 'Reservado em metas',
                amount: data.reservedInGoals,
                icon: Icons.savings_outlined,
                color: const Color(0xFFCA6702),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: isCompact
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Score financeiro',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${data.score} pts',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Saldo previsto (30d)',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'R\$ ${data.futureBalance.toStringAsFixed(2)}',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  )
                : Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Score financeiro',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${data.score} pts',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Saldo previsto (30d)',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'R\$ ${data.futureBalance.toStringAsFixed(2)}',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ],
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
            child: isCompact
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Perfil financeiro',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        data.financialProfile,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Taxa de poupança: ${(data.profileSavingsRate * 100).toStringAsFixed(1)}%',
                      ),
                      Text(
                        'Impulsividade: ${(data.profileImpulseRate * 100).toStringAsFixed(1)}%',
                      ),
                      Text(
                        'Variabilidade: ${(data.profileVariability * 100).toStringAsFixed(1)}%',
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Leitura estratégica',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        data.financialProfile == 'Conservador'
                            ? 'Você já tem perfil protetor. O foco agora é automatizar metas e ampliar investimentos.'
                            : data.financialProfile == 'Impulsivo'
                            ? 'Há espaço para disciplina automatizada. O cofre de metas ajuda a reduzir gastos dispersos.'
                            : 'Perfil equilibrado. O próximo passo é fortalecer reserva e antecipar metas com cenários.',
                      ),
                    ],
                  )
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Perfil financeiro',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              data.financialProfile,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Taxa de poupança: ${(data.profileSavingsRate * 100).toStringAsFixed(1)}%',
                            ),
                            Text(
                              'Impulsividade: ${(data.profileImpulseRate * 100).toStringAsFixed(1)}%',
                            ),
                            Text(
                              'Variabilidade: ${(data.profileVariability * 100).toStringAsFixed(1)}%',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Leitura estratégica',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              data.financialProfile == 'Conservador'
                                  ? 'Você já tem perfil protetor. O foco agora é automatizar metas e ampliar investimentos.'
                                  : data.financialProfile == 'Impulsivo'
                                  ? 'Há espaço para disciplina automatizada. O cofre de metas ajuda a reduzir gastos dispersos.'
                                  : 'Perfil equilibrado. O próximo passo é fortalecer reserva e antecipar metas com cenários.',
                            ),
                          ],
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
                  'Gastos por categoria',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                ChartWidget(byCategory: data.byCategory),
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
                  'Simulador financeiro',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                isCompact
                    ? Column(
                        children: [
                          TextField(
                            controller: _extraSavingController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Reserva mensal (R\$)',
                            ),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _monthsController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Meses',
                            ),
                          ),
                        ],
                      )
                    : Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _extraSavingController,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Reserva mensal (R\$)',
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          SizedBox(
                            width: 110,
                            child: TextField(
                              controller: _monthsController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Meses',
                              ),
                            ),
                          ),
                        ],
                      ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _simulationLoading ? null : _runSimulation,
                  icon: _simulationLoading
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_graph_outlined),
                  label: Text(
                    _simulationLoading ? 'Simulando...' : 'Simular cenário',
                  ),
                ),
                if (_simulationResult != null) ...[
                  const SizedBox(height: 14),
                  TweenAnimationBuilder<double>(
                    tween: Tween<double>(
                      begin: 0,
                      end:
                          (_simulationResult!.delta <= 0
                                  ? 0
                                  : (_simulationResult!.adjustedFutureBalance /
                                            (_simulationResult!
                                                    .adjustedFutureBalance +
                                                _simulationResult!
                                                    .baselineFutureBalance
                                                    .abs()))
                                        .clamp(0.0, 1.0))
                              .toDouble(),
                    ),
                    duration: const Duration(milliseconds: 600),
                    builder: (context, value, _) {
                      return LinearProgressIndicator(
                        value: value,
                        minHeight: 10,
                        borderRadius: BorderRadius.circular(10),
                      );
                    },
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Se guardar R\$ ${_simulationResult!.monthlyExtraSaving.toStringAsFixed(2)} por mês durante ${_simulationResult!.months} meses, o saldo projetado fica em R\$ ${_simulationResult!.adjustedFutureBalance.toStringAsFixed(2)}.',
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Impacto total: R\$ ${_simulationResult!.extraSavingTotal.toStringAsFixed(2)}.',
                  ),
                ],
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
                  'Modo Conselheiro',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                ...data.advisorTips
                    .take(3)
                    .map(
                      (e) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('• $e'),
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
                  'Insights',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                ...data.insights
                    .take(3)
                    .map(
                      (e) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('• $e'),
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
                Text('Alertas', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                ...data.alerts
                    .take(3)
                    .map(
                      (e) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('• $e'),
                      ),
                    ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
