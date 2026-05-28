import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants/responsive.dart';
import '../models/envelope_item.dart';
import '../providers/envelope_provider.dart';
import '../widgets/envelope_card.dart';

class EnvelopesScreen extends ConsumerWidget {
  const EnvelopesScreen({super.key});

  static const List<_EnvelopeIconOption> _iconOptions = [
    _EnvelopeIconOption('wallet', Icons.account_balance_wallet_outlined),
    _EnvelopeIconOption('food', Icons.restaurant_outlined),
    _EnvelopeIconOption('transport', Icons.directions_car_outlined),
    _EnvelopeIconOption('house', Icons.home_outlined),
    _EnvelopeIconOption('health', Icons.favorite_border),
    _EnvelopeIconOption('fun', Icons.sports_esports_outlined),
    _EnvelopeIconOption('savings', Icons.savings_outlined),
    _EnvelopeIconOption('shopping', Icons.shopping_bag_outlined),
  ];

  static const List<Color> _colorOptions = [
    Color(0xFF006D77),
    Color(0xFF2A9D8F),
    Color(0xFF0F4C5C),
    Color(0xFFE76F51),
    Color(0xFFF4A261),
    Color(0xFF6D597A),
    Color(0xFF8B5CF6),
    Color(0xFF1D4ED8),
  ];

  static const List<String> _monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  Future<void> _refresh(WidgetRef ref) async {
    await Future.wait([
      ref.read(envelopeProvider.notifier).loadEnvelopes(),
      ref.refresh(gamificationSummaryProvider.future),
      ref.refresh(financialHealthScoreProvider.future),
    ]);
  }

  Future<void> _openEnvelopeSheet(
    BuildContext context,
    WidgetRef ref, {
    EnvelopeItem? envelope,
  }) async {
    final nameController = TextEditingController(text: envelope?.name ?? '');
    final budgetController = TextEditingController(
      text: envelope?.budgetAmount.toStringAsFixed(2) ?? '',
    );
    final currentMonth = envelope?.month ?? DateTime.now().month;
    final currentYear = envelope?.year ?? DateTime.now().year;
    String selectedIcon = envelope?.icon ?? 'wallet';
    Color selectedColor = envelope?.baseColor ?? _colorOptions.first;
    var saving = false;

    Future<void> submit(StateSetter setModalState) async {
      final name = nameController.text.trim();
      final budget = double.tryParse(
        budgetController.text.replaceAll(',', '.'),
      );
      if (name.isEmpty || budget == null || budget <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Preencha nome e orçamento corretamente.'),
          ),
        );
        return;
      }

      setModalState(() => saving = true);

      try {
        final notifier = ref.read(envelopeProvider.notifier);
        if (envelope == null) {
          await notifier.createEnvelope(
            name: name,
            budgetAmount: budget,
            month: currentMonth,
            year: currentYear,
            color: colorToHex(selectedColor),
            icon: selectedIcon,
          );
        } else {
          await notifier.updateEnvelope(
            id: envelope.id,
            categoryId: envelope.categoryId,
            name: name,
            budgetAmount: budget,
            month: currentMonth,
            year: currentYear,
            color: colorToHex(selectedColor),
            icon: selectedIcon,
          );
        }

        if (context.mounted) {
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                envelope == null ? 'Envelope criado' : 'Envelope atualizado',
              ),
            ),
          );
        }
      } catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Falha ao salvar envelope: $error')),
          );
        }
      } finally {
        if (context.mounted) {
          setModalState(() => saving = false);
        }
      }
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      envelope == null ? 'Novo envelope' : 'Editar envelope',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${_monthNames[currentMonth - 1]} de $currentYear',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Nome do envelope',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: budgetController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Orçamento mensal (R\$)',
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Ícone',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _iconOptions.map((option) {
                        final selected = selectedIcon == option.key;
                        return ChoiceChip(
                          selected: selected,
                          onSelected: (_) =>
                              setModalState(() => selectedIcon = option.key),
                          avatar: Icon(option.icon, size: 18),
                          label: Text(option.label),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),
                    Text('Cor', style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: _colorOptions.map((color) {
                        final selected =
                            selectedColor.toARGB32() == color.toARGB32();
                        return InkWell(
                          onTap: () =>
                              setModalState(() => selectedColor = color),
                          borderRadius: BorderRadius.circular(999),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: color,
                              border: Border.all(
                                color: selected
                                    ? Theme.of(context).colorScheme.onSurface
                                    : Colors.transparent,
                                width: selected ? 2 : 0,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: saving ? null : () => submit(setModalState),
                      child: Text(saving ? 'Salvando...' : 'Salvar envelope'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    nameController.dispose();
    budgetController.dispose();
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    EnvelopeItem envelope,
  ) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Excluir envelope'),
          content: Text('Deseja excluir o envelope "${envelope.name}"?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Excluir'),
            ),
          ],
        );
      },
    );

    if (shouldDelete == true) {
      await ref.read(envelopeProvider.notifier).deleteEnvelope(envelope.id);
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Envelope excluído')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final envelopesAsync = ref.watch(envelopeProvider);
    final summaryAsync = ref.watch(gamificationSummaryProvider);
    final healthAsync = ref.watch(financialHealthScoreProvider);

    final now = DateTime.now();
    final monthLabel = _monthNames[now.month - 1];

    return RefreshIndicator(
      onRefresh: () => _refresh(ref),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: Responsive.pagePadding(context),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Envelopes de orçamento',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Controle seus limites por categoria no $monthLabel.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              FilledButton.icon(
                onPressed: () => _openEnvelopeSheet(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('Novo'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          summaryAsync.when(
            loading: () => const _EnvelopeHeaderSkeleton(),
            error: (error, _) => Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Falha ao carregar gamificação: $error'),
              ),
            ),
            data: (summary) {
              final health = healthAsync.valueOrNull;
              return Column(
                children: [
                  _HealthBanner(
                    score: health?.score ?? summary.score,
                    justification:
                        health?.justification ?? summary.justification,
                    streakCount: summary.streakCount,
                    withinBudget: summary.withinBudget,
                  ),
                  const SizedBox(height: 14),
                ],
              );
            },
          ),
          envelopesAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.only(top: 24),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Falha ao carregar envelopes: $error'),
              ),
            ),
            data: (items) {
              if (items.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.only(top: 24),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Nenhum envelope criado ainda',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Crie envelopes para separar seu orçamento por categoria e acompanhar os gastos com mais precisão.',
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: items.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.95,
                ),
                itemBuilder: (context, index) {
                  final envelope = items[index];
                  return EnvelopeCard(
                    envelope: envelope,
                    onTap: () =>
                        _openEnvelopeSheet(context, ref, envelope: envelope),
                    onLongPress: () => _confirmDelete(context, ref, envelope),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

class _HealthBanner extends StatelessWidget {
  const _HealthBanner({
    required this.score,
    required this.justification,
    required this.streakCount,
    required this.withinBudget,
  });

  final int score;
  final String justification;
  final int streakCount;
  final bool withinBudget;

  @override
  Widget build(BuildContext context) {
    final color = Color.lerp(
      const Color(0xFFE76F51),
      const Color(0xFF2A9D8F),
      score.clamp(0, 100) / 100,
    );

    return Card(
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            colors: [
              (color ?? Theme.of(context).colorScheme.primary).withValues(
                alpha: 0.95,
              ),
              (color ?? Theme.of(context).colorScheme.primary).withValues(
                alpha: 0.78,
              ),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.favorite, color: Colors.white),
                const SizedBox(width: 8),
                const Text(
                  'Saúde financeira',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                Text(
                  '$score',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0, end: score.toDouble()),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (context, value, _) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    minHeight: 10,
                    value: value / 100,
                    backgroundColor: Colors.white.withValues(alpha: 0.16),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Colors.white,
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            Text(
              justification,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Icon(
                  withinBudget
                      ? Icons.local_fire_department
                      : Icons.water_drop_outlined,
                  color: Colors.white,
                ),
                const SizedBox(width: 8),
                Text(
                  withinBudget
                      ? 'Você está dentro do orçamento hoje'
                      : 'Hoje houve estouro no orçamento',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Text(
                  '$streakCount dias',
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EnvelopeHeaderSkeleton extends StatelessWidget {
  const _EnvelopeHeaderSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: SizedBox(
        height: 160,
        child: Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _EnvelopeIconOption {
  const _EnvelopeIconOption(this.key, this.icon);

  final String key;
  final IconData icon;

  String get label {
    switch (key) {
      case 'food':
        return 'Alimentação';
      case 'transport':
        return 'Transporte';
      case 'house':
        return 'Casa';
      case 'health':
        return 'Saúde';
      case 'fun':
        return 'Lazer';
      case 'savings':
        return 'Reserva';
      case 'shopping':
        return 'Compras';
      case 'wallet':
      default:
        return 'Geral';
    }
  }
}
