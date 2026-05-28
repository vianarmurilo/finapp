import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/responsive.dart';

import '../controllers/goals_controller.dart';
import '../models/goal_item.dart';

class GoalsScreen extends ConsumerStatefulWidget {
  const GoalsScreen({super.key});

  @override
  ConsumerState<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends ConsumerState<GoalsScreen> {
  String _formatMovementDate(DateTime? value) {
    final parsed = value;
    if (parsed == null) {
      return '--/--';
    }

    return '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')}';
  }

  Future<void> _adjustGoalBalance({
    required GoalItem goal,
    required String action,
    required String title,
    required String label,
  }) async {
    final rootContext = context;
    final amountController = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(title),
          content: TextField(
            controller: amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: label),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () async {
                final amount = double.tryParse(
                  amountController.text.replaceAll(',', '.'),
                );

                if (amount == null || amount <= 0) {
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    const SnackBar(content: Text('Informe um valor válido.')),
                  );
                  return;
                }

                try {
                  await ref
                      .read(goalsServiceProvider)
                      .adjustBalance(
                        goalId: goal.id,
                        action: action,
                        amount: amount,
                      );

                  if (!rootContext.mounted) {
                    return;
                  }

                  Navigator.of(dialogContext).pop();
                  notifyGoalChange(ref);
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    SnackBar(
                      content: Text(
                        action == 'deposit'
                            ? 'Dinheiro guardado na reserva.'
                            : 'Dinheiro retirado da reserva.',
                      ),
                    ),
                  );
                } catch (error) {
                  if (!rootContext.mounted) {
                    return;
                  }

                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    SnackBar(
                      content: Text('Falha ao atualizar a reserva: $error'),
                    ),
                  );
                }
              },
              child: Text(action == 'deposit' ? 'Guardar' : 'Retirar'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _openGoalHistoryDialog(GoalItem goal) async {
    final rootContext = context;

    try {
      final movements = await ref
          .read(goalsServiceProvider)
          .listMovements(goal.id);

      if (!mounted) {
        return;
      }

      await showDialog<void>(
        context: context,
        builder: (dialogContext) {
          return AlertDialog(
            title: Text('Histórico de ${goal.title}'),
            content: SizedBox(
              width: double.maxFinite,
              child: movements.isEmpty
                  ? const Text('Nenhuma movimentação registrada.')
                  : SizedBox(
                      height: MediaQuery.of(dialogContext).size.height * 0.45,
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: movements.length,
                        separatorBuilder: (_, __) => const Divider(height: 16),
                        itemBuilder: (context, index) {
                          final movement = movements[index];
                          final isDeposit = movement.isDeposit;

                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: CircleAvatar(
                              backgroundColor: isDeposit
                                  ? Colors.green.withValues(alpha: 0.15)
                                  : Colors.red.withValues(alpha: 0.15),
                              child: Icon(
                                isDeposit
                                    ? Icons.savings_outlined
                                    : Icons.payments_outlined,
                                color: isDeposit ? Colors.green : Colors.red,
                              ),
                            ),
                            title: Text(
                              isDeposit
                                  ? 'Entrada no cofrinho'
                                  : 'Saída do cofrinho',
                            ),
                            subtitle: Text(
                              '${_formatMovementDate(movement.createdAt)} • ${movement.note ?? ''}',
                            ),
                            trailing: Text(
                              'R\$ ${movement.amount.toStringAsFixed(2)}',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: isDeposit ? Colors.green : Colors.red,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
            ),
            actions: [
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Fechar'),
              ),
            ],
          );
        },
      );
    } catch (error) {
      if (!rootContext.mounted) {
        return;
      }

      ScaffoldMessenger.of(rootContext).showSnackBar(
        SnackBar(content: Text('Falha ao carregar histórico: $error')),
      );
    }
  }

  Future<void> _openEditGoalDialog(GoalItem goal) async {
    final rootContext = context;
    final titleController = TextEditingController(text: goal.title);
    final targetController = TextEditingController(
      text: goal.targetAmount.toStringAsFixed(2),
    );

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Editar meta'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Título'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: targetController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Valor alvo (R\$)',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () async {
                final target = double.tryParse(
                  targetController.text.replaceAll(',', '.'),
                );

                if (titleController.text.trim().isEmpty ||
                    target == null ||
                    target <= 0) {
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Informe dados válidos para atualizar a meta.',
                      ),
                    ),
                  );
                  return;
                }

                try {
                  await ref
                      .read(goalsServiceProvider)
                      .update(
                        goalId: goal.id,
                        title: titleController.text.trim(),
                        targetAmount: target,
                        currentAmount: goal.currentAmount,
                      );
                  if (!rootContext.mounted) {
                    return;
                  }
                  Navigator.of(dialogContext).pop();
                  notifyGoalChange(ref);
                } catch (error) {
                  if (!rootContext.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    SnackBar(content: Text('Falha ao atualizar meta: $error')),
                  );
                }
              },
              child: const Text('Salvar'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _deleteGoal(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Excluir meta'),
        content: const Text('Deseja excluir esta meta?'),
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
      ),
    );

    if (confirmed != true) {
      return;
    }

    try {
      await ref.read(goalsServiceProvider).delete(id);
      notifyGoalChange(ref);
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Falha ao excluir meta: $error')));
    }
  }

  Future<void> _openCreateGoalDialog() async {
    final rootContext = context;
    final titleController = TextEditingController();
    final targetController = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Nova meta'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Título'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: targetController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Valor alvo (R\$)',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () async {
                final target = double.tryParse(
                  targetController.text.replaceAll(',', '.'),
                );

                if (titleController.text.trim().isEmpty ||
                    target == null ||
                    target <= 0) {
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    const SnackBar(
                      content: Text('Informe dados válidos para a meta.'),
                    ),
                  );
                  return;
                }

                try {
                  await ref
                      .read(goalsServiceProvider)
                      .create(
                        title: titleController.text.trim(),
                        targetAmount: target,
                      );
                  if (!rootContext.mounted) {
                    return;
                  }
                  Navigator.of(rootContext).pop();
                  notifyGoalChange(ref);
                } catch (error) {
                  if (!rootContext.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    SnackBar(content: Text('Falha ao criar meta: $error')),
                  );
                }
              },
              child: const Text('Salvar'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final goals = ref.watch(goalsProvider);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreateGoalDialog,
        icon: const Icon(Icons.flag_outlined),
        label: const Text('Nova meta'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(goalsProvider.future),
        child: goals.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ListView(
            children: [
              const SizedBox(height: 90),
              Center(child: Text('Erro ao carregar metas: $error')),
            ],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 90),
                  Center(child: Text('Nenhuma meta cadastrada')),
                ],
              );
            }

            return ListView.builder(
              padding: Responsive.pagePadding(context),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final goal = items[index];
                final progress = goal.progress.clamp(0.0, 1.0).toDouble();
                final completionPercent = goal.completionPercent.clamp(
                  0.0,
                  100.0,
                );
                final isCompact = MediaQuery.sizeOf(context).width < 700;

                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                goal.title,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ),
                            if (goal.status == 'ACHIEVED')
                              const Padding(
                                padding: EdgeInsets.only(right: 8),
                                child: Chip(
                                  label: Text('Completa'),
                                  visualDensity: VisualDensity.compact,
                                ),
                              ),
                            PopupMenuButton<String>(
                              icon: const Icon(Icons.more_vert, size: 18),
                              onSelected: (value) {
                                if (value == 'edit') {
                                  _openEditGoalDialog(goal);
                                } else if (value == 'history') {
                                  _openGoalHistoryDialog(goal);
                                } else if (value == 'delete') {
                                  _deleteGoal(goal.id);
                                }
                              },
                              itemBuilder: (_) => const [
                                PopupMenuItem(
                                  value: 'edit',
                                  child: Text('Editar'),
                                ),
                                PopupMenuItem(
                                  value: 'history',
                                  child: Text('Histórico'),
                                ),
                                PopupMenuItem(
                                  value: 'delete',
                                  child: Text('Excluir'),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        isCompact
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(
                                    height: 92,
                                    width: 92,
                                    child: Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        TweenAnimationBuilder<double>(
                                          tween: Tween<double>(
                                            begin: 0,
                                            end: progress,
                                          ),
                                          duration: const Duration(
                                            milliseconds: 700,
                                          ),
                                          builder: (context, value, _) {
                                            return CircularProgressIndicator(
                                              value: value,
                                              strokeWidth: 10,
                                              backgroundColor: Theme.of(context)
                                                  .colorScheme
                                                  .surfaceContainerHighest,
                                            );
                                          },
                                        ),
                                        Center(
                                          child: Text(
                                            '${completionPercent.toStringAsFixed(0)}%',
                                            style: Theme.of(
                                              context,
                                            ).textTheme.titleMedium,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'R\$ ${goal.currentAmount.toStringAsFixed(2)} guardados de R\$ ${goal.targetAmount.toStringAsFixed(2)}',
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Ainda faltam R\$ ${goal.remainingAmount.toStringAsFixed(2)} para completar a meta.',
                                  ),
                                  const SizedBox(height: 12),
                                  Wrap(
                                    spacing: 10,
                                    runSpacing: 10,
                                    children: [
                                      OutlinedButton.icon(
                                        onPressed: () => _adjustGoalBalance(
                                          goal: goal,
                                          action: 'deposit',
                                          title: 'Guardar dinheiro',
                                          label: 'Valor para guardar (R\$)',
                                        ),
                                        icon: const Icon(
                                          Icons.savings_outlined,
                                        ),
                                        label: const Text('Guardar'),
                                      ),
                                      OutlinedButton.icon(
                                        onPressed: () => _adjustGoalBalance(
                                          goal: goal,
                                          action: 'withdraw',
                                          title: 'Retirar da reserva',
                                          label: 'Valor para retirar (R\$)',
                                        ),
                                        icon: const Icon(
                                          Icons.payments_outlined,
                                        ),
                                        label: const Text('Retirar'),
                                      ),
                                    ],
                                  ),
                                ],
                              )
                            : Row(
                                children: [
                                  SizedBox(
                                    height: 92,
                                    width: 92,
                                    child: Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        TweenAnimationBuilder<double>(
                                          tween: Tween<double>(
                                            begin: 0,
                                            end: progress,
                                          ),
                                          duration: const Duration(
                                            milliseconds: 700,
                                          ),
                                          builder: (context, value, _) {
                                            return CircularProgressIndicator(
                                              value: value,
                                              strokeWidth: 10,
                                              backgroundColor: Theme.of(context)
                                                  .colorScheme
                                                  .surfaceContainerHighest,
                                            );
                                          },
                                        ),
                                        Center(
                                          child: Text(
                                            '${completionPercent.toStringAsFixed(0)}%',
                                            style: Theme.of(
                                              context,
                                            ).textTheme.titleMedium,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'R\$ ${goal.currentAmount.toStringAsFixed(2)} guardados de R\$ ${goal.targetAmount.toStringAsFixed(2)}',
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          'Ainda faltam R\$ ${goal.remainingAmount.toStringAsFixed(2)} para completar a meta.',
                                        ),
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: () => _adjustGoalBalance(
                                                  goal: goal,
                                                  action: 'deposit',
                                                  title: 'Guardar dinheiro',
                                                  label:
                                                      'Valor para guardar (R\$)',
                                                ),
                                                icon: const Icon(
                                                  Icons.savings_outlined,
                                                ),
                                                label: const Text('Guardar'),
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: () => _adjustGoalBalance(
                                                  goal: goal,
                                                  action: 'withdraw',
                                                  title: 'Retirar da reserva',
                                                  label:
                                                      'Valor para retirar (R\$)',
                                                ),
                                                icon: const Icon(
                                                  Icons.payments_outlined,
                                                ),
                                                label: const Text('Retirar'),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                        if (goal.recentMovements.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text(
                            'Últimas movimentações',
                            style: Theme.of(context).textTheme.labelLarge,
                          ),
                          const SizedBox(height: 6),
                          ...goal.recentMovements.map((movement) {
                            final isDeposit = movement.isDeposit;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                children: [
                                  Icon(
                                    isDeposit
                                        ? Icons.savings_outlined
                                        : Icons.payments_outlined,
                                    size: 16,
                                    color: isDeposit
                                        ? Colors.green
                                        : Colors.red,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      '${movement.note ?? (isDeposit ? 'Depósito' : 'Retirada')} • ${_formatMovementDate(movement.createdAt)}',
                                    ),
                                  ),
                                  Text(
                                    'R\$ ${movement.amount.toStringAsFixed(2)}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: isDeposit
                                          ? Colors.green
                                          : Colors.red,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton.icon(
                              onPressed: () => _openGoalHistoryDialog(goal),
                              icon: const Icon(Icons.history),
                              label: const Text('Ver histórico completo'),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
