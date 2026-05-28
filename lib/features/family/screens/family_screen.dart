import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/responsive.dart';
import '../controllers/family_controller.dart';
import '../models/family_dashboard.dart';
import '../../transactions/controllers/transactions_controller.dart';
import '../../transactions/models/category_option.dart';

class FamilyScreen extends ConsumerStatefulWidget {
  const FamilyScreen({super.key});

  @override
  ConsumerState<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends ConsumerState<FamilyScreen> {
  String _formatDate(DateTime? value) {
    final parsed = value;
    if (parsed == null) {
      return '--/--';
    }
    return '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')}';
  }

  Future<bool> _openCreateGroupTransactionDialog(String groupId) async {
    final rootContext = context;
    String type = 'EXPENSE';
    final descriptionController = TextEditingController();
    final amountController = TextEditingController();
    CategoryOption? selectedCategory;
    List<CategoryOption> categories = [];
    var created = false;

    Future<void> loadCategories() async {
      categories = await ref
          .read(transactionsServiceProvider)
          .listCategories(type: type);
      if (categories.isNotEmpty) {
        selectedCategory ??= categories.first;
      }
    }

    await loadCategories();
    if (!mounted) {
      return false;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (dialogContext) {
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
                      'Nova transação no grupo',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'EXPENSE', label: Text('Saída')),
                        ButtonSegment(value: 'INCOME', label: Text('Entrada')),
                      ],
                      selected: {type},
                      onSelectionChanged: (value) async {
                        type = value.first;
                        selectedCategory = null;
                        await loadCategories();
                        setModalState(() {});
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descriptionController,
                      decoration: const InputDecoration(labelText: 'Descrição'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: amountController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Valor (R\$)',
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: selectedCategory?.id,
                      items: categories
                          .map(
                            (item) => DropdownMenuItem(
                              value: item.id,
                              child: Text(item.name),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        selectedCategory = categories.firstWhere(
                          (item) => item.id == value,
                        );
                        setModalState(() {});
                      },
                      decoration: const InputDecoration(labelText: 'Categoria'),
                    ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: () async {
                        final amount = double.tryParse(
                          amountController.text.replaceAll(',', '.'),
                        );
                        if (descriptionController.text.trim().isEmpty ||
                            amount == null ||
                            amount <= 0 ||
                            selectedCategory == null) {
                          ScaffoldMessenger.of(rootContext).showSnackBar(
                            const SnackBar(
                              content: Text('Preencha os campos corretamente.'),
                            ),
                          );
                          return;
                        }

                        try {
                          await ref
                              .read(transactionsServiceProvider)
                              .create(
                                familyGroupId: groupId,
                                categoryId: selectedCategory!.id,
                                type: type,
                                amount: amount,
                                description: descriptionController.text.trim(),
                              );
                          if (!rootContext.mounted) {
                            return;
                          }
                          Navigator.of(dialogContext).pop();
                          ScaffoldMessenger.of(rootContext).showSnackBar(
                            const SnackBar(
                              content: Text('Transação do grupo criada.'),
                            ),
                          );
                          created = true;
                          ref.invalidate(transactionsProvider);
                          ref
                                  .read(transactionsMutationProvider.notifier)
                                  .state +=
                              1;
                        } catch (error) {
                          if (!rootContext.mounted) {
                            return;
                          }
                          ScaffoldMessenger.of(rootContext).showSnackBar(
                            SnackBar(
                              content: Text('Falha ao criar transação: $error'),
                            ),
                          );
                        }
                      },
                      child: const Text('Salvar transação'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    return created;
  }

  Future<void> _createGroup() async {
    final rootContext = context;
    final nameController = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Criar grupo familiar'),
          content: TextField(
            controller: nameController,
            decoration: const InputDecoration(labelText: 'Nome do grupo'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () async {
                final name = nameController.text.trim();
                if (name.isEmpty) {
                  return;
                }

                try {
                  await ref.read(familyServiceProvider).createGroup(name);
                  if (!rootContext.mounted) {
                    return;
                  }
                  Navigator.of(rootContext).pop();
                  ref.invalidate(familyGroupsProvider);
                } catch (error) {
                  if (!rootContext.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    SnackBar(content: Text('Erro ao criar grupo: $error')),
                  );
                }
              },
              child: const Text('Criar'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _joinGroup() async {
    final rootContext = context;
    final codeController = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Entrar com convite'),
          content: TextField(
            controller: codeController,
            decoration: const InputDecoration(labelText: 'Código de convite'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () async {
                final code = codeController.text.trim();
                if (code.isEmpty) {
                  return;
                }

                try {
                  await ref.read(familyServiceProvider).joinByInviteCode(code);
                  if (!rootContext.mounted) {
                    return;
                  }
                  Navigator.of(rootContext).pop();
                  ref.invalidate(familyGroupsProvider);
                } catch (error) {
                  if (!rootContext.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    SnackBar(content: Text('Erro ao entrar no grupo: $error')),
                  );
                }
              },
              child: const Text('Entrar'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _openGroupDashboard(String groupId, String groupName) async {
    final rootContext = context;

    try {
      final data = await ref
          .read(familyServiceProvider)
          .groupDashboard(groupId);
      if (!mounted) {
        return;
      }

      FamilyDashboardItem dashboard = data;
      String txTypeFilter = 'ALL';
      int daysFilter = 30;
      var reloadingDashboard = false;

      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (context) {
          return StatefulBuilder(
            builder: (context, setModalState) {
              Future<void> reloadDashboard() async {
                setModalState(() {
                  reloadingDashboard = true;
                });

                try {
                  final fresh = await ref
                      .read(familyServiceProvider)
                      .groupDashboard(groupId);
                  setModalState(() {
                    dashboard = fresh;
                  });
                } catch (error) {
                  if (!rootContext.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(rootContext).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Falha ao atualizar dashboard do grupo: $error',
                      ),
                    ),
                  );
                } finally {
                  if (rootContext.mounted) {
                    setModalState(() {
                      reloadingDashboard = false;
                    });
                  }
                }
              }

              final now = DateTime.now();
              final filteredTransactions = dashboard.lastTransactions.where((
                tx,
              ) {
                final typeMatches =
                    txTypeFilter == 'ALL' || tx.type == txTypeFilter;

                if (!typeMatches) {
                  return false;
                }

                if (daysFilter <= 0) {
                  return true;
                }

                final occurredAt = tx.occurredAt;
                if (occurredAt == null) {
                  return false;
                }

                final limitDate = now.subtract(Duration(days: daysFilter));
                return occurredAt.isAfter(limitDate);
              }).toList();

              return Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  height:
                      MediaQuery.of(context).size.height.clamp(420.0, 900.0) *
                      0.78,
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          groupName,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            FilledButton.icon(
                              onPressed: () async {
                                final created =
                                    await _openCreateGroupTransactionDialog(
                                      groupId,
                                    );
                                if (created) {
                                  await reloadDashboard();
                                }
                              },
                              icon: const Icon(Icons.add_circle_outline),
                              label: const Text('Nova transação do grupo'),
                            ),
                            IconButton(
                              onPressed: reloadingDashboard
                                  ? null
                                  : () async {
                                      await reloadDashboard();
                                    },
                              icon: const Icon(Icons.refresh),
                              tooltip: 'Atualizar dashboard',
                            ),
                          ],
                        ),
                        if (reloadingDashboard)
                          const Padding(
                            padding: EdgeInsets.only(bottom: 8),
                            child: LinearProgressIndicator(minHeight: 2),
                          )
                        else
                          const SizedBox(height: 10),
                        Text(
                          'Entradas: R\$ ${dashboard.totalIncomes.toStringAsFixed(2)}',
                        ),
                        Text(
                          'Saídas: R\$ ${dashboard.totalExpenses.toStringAsFixed(2)}',
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Saldo coletivo: R\$ ${dashboard.balance.toStringAsFixed(2)}',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const Divider(height: 24),
                        Text(
                          'Ranking de membros',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        if (dashboard.memberStats.isEmpty)
                          const Text('Sem dados para ranking no momento.')
                        else
                          ...dashboard.memberStats
                              .take(5)
                              .toList()
                              .asMap()
                              .entries
                              .map((entry) {
                                final index = entry.key;
                                final row = entry.value;
                                final name = row.name;
                                final memberIncomes = row.incomes;
                                final memberExpenses = row.expenses;
                                final memberBalance = row.balance;

                                return ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  leading: CircleAvatar(
                                    child: Text('${index + 1}'),
                                  ),
                                  title: Text(name),
                                  subtitle: Text(
                                    'Entradas R\$ ${memberIncomes.toStringAsFixed(2)} · Saídas R\$ ${memberExpenses.toStringAsFixed(2)}',
                                  ),
                                  trailing: Text(
                                    'R\$ ${memberBalance.toStringAsFixed(2)}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: memberBalance >= 0
                                          ? Colors.green.shade700
                                          : Colors.red.shade700,
                                    ),
                                  ),
                                );
                              }),
                        const Divider(height: 24),
                        Text(
                          'Últimas transações',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ChoiceChip(
                              label: const Text('Todas'),
                              selected: txTypeFilter == 'ALL',
                              onSelected: (_) {
                                setModalState(() {
                                  txTypeFilter = 'ALL';
                                });
                              },
                            ),
                            ChoiceChip(
                              label: const Text('Entradas'),
                              selected: txTypeFilter == 'INCOME',
                              onSelected: (_) {
                                setModalState(() {
                                  txTypeFilter = 'INCOME';
                                });
                              },
                            ),
                            ChoiceChip(
                              label: const Text('Saídas'),
                              selected: txTypeFilter == 'EXPENSE',
                              onSelected: (_) {
                                setModalState(() {
                                  txTypeFilter = 'EXPENSE';
                                });
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ChoiceChip(
                              label: const Text('30 dias'),
                              selected: daysFilter == 30,
                              onSelected: (_) {
                                setModalState(() {
                                  daysFilter = 30;
                                });
                              },
                            ),
                            ChoiceChip(
                              label: const Text('90 dias'),
                              selected: daysFilter == 90,
                              onSelected: (_) {
                                setModalState(() {
                                  daysFilter = 90;
                                });
                              },
                            ),
                            ChoiceChip(
                              label: const Text('Tudo'),
                              selected: daysFilter == 0,
                              onSelected: (_) {
                                setModalState(() {
                                  daysFilter = 0;
                                });
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (filteredTransactions.isEmpty)
                          const Text(
                            'Sem transações recentes com os filtros atuais.',
                          )
                        else
                          ...filteredTransactions.take(8).map((row) {
                            final isIncome = row.isIncome;

                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: Icon(
                                isIncome
                                    ? Icons.trending_up_outlined
                                    : Icons.trending_down_outlined,
                                color: isIncome
                                    ? Colors.green.shade700
                                    : Colors.red.shade700,
                              ),
                              title: Text(row.description),
                              subtitle: Text(
                                '${row.userName} · ${row.categoryName} · ${_formatDate(row.occurredAt)}',
                              ),
                              trailing: Text(
                                '${isIncome ? '+' : '-'}R\$ ${row.amount.toStringAsFixed(2)}',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: isIncome
                                      ? Colors.green.shade700
                                      : Colors.red.shade700,
                                ),
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao carregar dashboard do grupo: $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final groups = ref.watch(familyGroupsProvider);

    return Scaffold(
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton.extended(
            heroTag: 'create_group',
            onPressed: _createGroup,
            icon: const Icon(Icons.group_add_outlined),
            label: const Text('Criar'),
          ),
          const SizedBox(height: 10),
          FloatingActionButton.extended(
            heroTag: 'join_group',
            onPressed: _joinGroup,
            icon: const Icon(Icons.meeting_room_outlined),
            label: const Text('Entrar'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(familyGroupsProvider.future),
        child: groups.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ListView(
            padding: Responsive.pagePadding(context),
            children: [
              const SizedBox(height: 90),
              Center(child: Text('Erro ao carregar grupos: $error')),
            ],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                padding: Responsive.pagePadding(context),
                children: const [
                  SizedBox(height: 90),
                  Center(
                    child: Text(
                      'Você ainda não participa de grupos familiares',
                    ),
                  ),
                ],
              );
            }

            return ListView.builder(
              padding: Responsive.pagePadding(context),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final group = items[index];
                return Card(
                  child: ListTile(
                    title: Text(group.name),
                    subtitle: Text(
                      'Membros: ${group.membersCount} · Convite: ${group.inviteCode}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _openGroupDashboard(group.id, group.name),
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
