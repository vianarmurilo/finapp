import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/responsive.dart';
import '../../../shared/widgets/transaction_tile.dart';
import '../controllers/transactions_controller.dart';
import '../models/category_option.dart';
import '../models/transaction_filter.dart';
import '../models/transaction_item.dart';

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  Future<void> _selectDateRange() async {
    final current = ref.read(transactionFilterProvider);
    final now = DateTime.now();
    final selected = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 1),
      initialDateRange: current.startDate != null && current.endDate != null
          ? DateTimeRange(start: current.startDate!, end: current.endDate!)
          : null,
    );

    if (selected == null) {
      return;
    }

    ref.read(transactionFilterProvider.notifier).state = current.copyWith(
      startDate: selected.start,
      endDate: selected.end,
    );
    ref.invalidate(transactionsProvider);
  }

  void _setTypeFilter(String? type) {
    final current = ref.read(transactionFilterProvider);
    ref.read(transactionFilterProvider.notifier).state = current.copyWith(
      type: type,
    );
    ref.invalidate(transactionsProvider);
  }

  void _clearFilters() {
    ref.read(transactionFilterProvider.notifier).state =
        const TransactionFilter();
    ref.invalidate(transactionsProvider);
  }

  Future<void> _openEditDialog(TransactionItem tx) async {
    final rootContext = context;
    String type = tx.type;
    final descriptionController = TextEditingController(text: tx.description);
    final amountController = TextEditingController(
      text: tx.amount.toStringAsFixed(2),
    );
    CategoryOption? selectedCategory;
    List<CategoryOption> categories = [];
    var saving = false;

    Future<void> loadCategories() async {
      categories = await ref
          .read(transactionsServiceProvider)
          .listCategories(type: type);
      if (categories.isNotEmpty) {
        final match = categories.where((item) => item.id == tx.categoryId);
        selectedCategory = match.isNotEmpty ? match.first : categories.first;
      }
    }

    await loadCategories();
    if (!mounted) {
      return;
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
                      'Editar transação',
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
                    if (categories.isEmpty)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Nenhuma categoria para este tipo.'),
                          const SizedBox(height: 8),
                          OutlinedButton.icon(
                            onPressed: () async {
                              final name = await _askCategoryName(
                                title:
                                    'Nova categoria (${type == 'INCOME' ? 'Entrada' : 'Saída'})',
                              );
                              if (name == null || name.isEmpty) {
                                return;
                              }

                              try {
                                await ref
                                    .read(transactionsServiceProvider)
                                    .createCategory(name: name, type: type);
                                await loadCategories();
                                setModalState(() {});
                              } catch (error) {
                                if (!rootContext.mounted) {
                                  return;
                                }
                                ScaffoldMessenger.of(rootContext).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Falha ao criar categoria: $error',
                                    ),
                                  ),
                                );
                              }
                            },
                            icon: const Icon(Icons.add),
                            label: const Text('Criar categoria'),
                          ),
                        ],
                      )
                    else
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
                          if (value == null) {
                            return;
                          }
                          selectedCategory = categories.firstWhere(
                            (item) => item.id == value,
                          );
                          setModalState(() {});
                        },
                        decoration: const InputDecoration(
                          labelText: 'Categoria',
                        ),
                      ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: saving
                          ? null
                          : () async {
                              final amount = double.tryParse(
                                amountController.text.replaceAll(',', '.'),
                              );
                              if (descriptionController.text.trim().isEmpty ||
                                  amount == null ||
                                  amount <= 0 ||
                                  selectedCategory == null) {
                                ScaffoldMessenger.of(rootContext).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Preencha os campos corretamente.',
                                    ),
                                  ),
                                );
                                return;
                              }

                              setModalState(() {
                                saving = true;
                              });

                              try {
                                await ref
                                    .read(transactionsServiceProvider)
                                    .update(
                                      transactionId: tx.id,
                                      categoryId: selectedCategory!.id,
                                      type: type,
                                      amount: amount,
                                      description: descriptionController.text
                                          .trim(),
                                    );
                                if (!rootContext.mounted) {
                                  return;
                                }
                                Navigator.of(dialogContext).pop();
                                ref.invalidate(transactionsProvider);
                                ref
                                        .read(
                                          transactionsMutationProvider.notifier,
                                        )
                                        .state +=
                                    1;
                                ScaffoldMessenger.of(rootContext).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Transação atualizada com sucesso.',
                                    ),
                                  ),
                                );
                              } catch (error) {
                                if (!rootContext.mounted) {
                                  return;
                                }
                                setModalState(() {
                                  saving = false;
                                });
                                ScaffoldMessenger.of(rootContext).showSnackBar(
                                  SnackBar(
                                    content: Text('Falha ao atualizar: $error'),
                                  ),
                                );
                              }
                            },
                      child: saving
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Salvar alterações'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _deleteTransaction(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Excluir transação'),
        content: const Text(
          'Essa ação não pode ser desfeita. Deseja continuar?',
        ),
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
      await ref.read(transactionsServiceProvider).delete(id);
      ref.invalidate(transactionsProvider);
      ref.read(transactionsMutationProvider.notifier).state += 1;
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Falha ao excluir: $error')));
    }
  }

  Future<void> _openCreateDialog() async {
    final rootContext = context;
    String type = 'EXPENSE';
    final descriptionController = TextEditingController();
    final amountController = TextEditingController();
    CategoryOption? selectedCategory;
    List<CategoryOption> categories = [];
    var saving = false;

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
      return;
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
                      'Nova transação',
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
                    if (categories.isEmpty)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Nenhuma categoria para este tipo.'),
                          const SizedBox(height: 8),
                          OutlinedButton.icon(
                            onPressed: () async {
                              final name = await _askCategoryName(
                                title:
                                    'Nova categoria (${type == 'INCOME' ? 'Entrada' : 'Saída'})',
                              );
                              if (name == null || name.isEmpty) {
                                return;
                              }

                              try {
                                await ref
                                    .read(transactionsServiceProvider)
                                    .createCategory(name: name, type: type);
                                await loadCategories();
                                setModalState(() {});
                              } catch (error) {
                                if (!rootContext.mounted) {
                                  return;
                                }
                                ScaffoldMessenger.of(rootContext).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Falha ao criar categoria: $error',
                                    ),
                                  ),
                                );
                              }
                            },
                            icon: const Icon(Icons.add),
                            label: const Text('Criar categoria agora'),
                          ),
                        ],
                      )
                    else
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
                          if (value == null) {
                            return;
                          }
                          selectedCategory = categories.firstWhere(
                            (item) => item.id == value,
                          );
                          setModalState(() {});
                        },
                        decoration: const InputDecoration(
                          labelText: 'Categoria',
                        ),
                      ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: saving
                          ? null
                          : () async {
                              final amount = double.tryParse(
                                amountController.text.replaceAll(',', '.'),
                              );
                              if (descriptionController.text.trim().isEmpty ||
                                  amount == null ||
                                  amount <= 0 ||
                                  selectedCategory == null) {
                                ScaffoldMessenger.of(rootContext).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Preencha os campos corretamente.',
                                    ),
                                  ),
                                );
                                return;
                              }

                              setModalState(() {
                                saving = true;
                              });

                              try {
                                await ref
                                    .read(transactionsServiceProvider)
                                    .create(
                                      categoryId: selectedCategory!.id,
                                      type: type,
                                      amount: amount,
                                      description: descriptionController.text
                                          .trim(),
                                    );
                                if (!rootContext.mounted) {
                                  return;
                                }
                                Navigator.of(dialogContext).pop();
                                ref.invalidate(transactionsProvider);
                                ref
                                        .read(
                                          transactionsMutationProvider.notifier,
                                        )
                                        .state +=
                                    1;
                                ScaffoldMessenger.of(rootContext).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Transação criada com sucesso.',
                                    ),
                                  ),
                                );
                              } catch (error) {
                                if (!rootContext.mounted) {
                                  return;
                                }
                                setModalState(() {
                                  saving = false;
                                });
                                ScaffoldMessenger.of(rootContext).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Não foi possível criar a transação: $error',
                                    ),
                                  ),
                                );
                              }
                            },
                      child: saving
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Salvar transação'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<String?> _askCategoryName({
    required String title,
    String? initialValue,
  }) async {
    final controller = TextEditingController(text: initialValue ?? '');

    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Nome da categoria'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              final name = controller.text.trim();
              if (name.isEmpty) {
                return;
              }
              Navigator.of(dialogContext).pop(name);
            },
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
  }

  Future<void> _openCategoryManagerDialog() async {
    final rootContext = context;
    String type = ref.read(transactionFilterProvider).type ?? 'EXPENSE';
    List<CategoryOption> categories = [];
    bool loading = true;

    Future<void> loadCategories(StateSetter setModalState) async {
      setModalState(() {
        loading = true;
      });

      try {
        categories = await ref
            .read(transactionsServiceProvider)
            .listCategories(type: type);
      } catch (error) {
        if (rootContext.mounted) {
          ScaffoldMessenger.of(rootContext).showSnackBar(
            SnackBar(content: Text('Falha ao carregar categorias: $error')),
          );
        }
      } finally {
        setModalState(() {
          loading = false;
        });
      }
    }

    if (!mounted) {
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            if (loading && categories.isEmpty) {
              loadCategories(setModalState);
            }

            final defaultCategories = categories
                .where((item) => item.userId == null)
                .toList();
            final customCategories = categories
                .where((item) => item.userId != null)
                .toList();

            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: SizedBox(
                height: (MediaQuery.of(context).size.height * 0.8).clamp(
                  420.0,
                  720.0,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Gerenciar categorias',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ),
                        IconButton(
                          onPressed: () => loadCategories(setModalState),
                          icon: const Icon(Icons.refresh),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'EXPENSE', label: Text('Saída')),
                        ButtonSegment(value: 'INCOME', label: Text('Entrada')),
                      ],
                      selected: {type},
                      onSelectionChanged: (value) async {
                        type = value.first;
                        await loadCategories(setModalState);
                      },
                    ),
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: () async {
                        final name = await _askCategoryName(
                          title: 'Nova categoria',
                        );
                        if (name == null || name.isEmpty) {
                          return;
                        }

                        try {
                          await ref
                              .read(transactionsServiceProvider)
                              .createCategory(name: name, type: type);
                          await loadCategories(setModalState);
                          ref.invalidate(transactionsProvider);
                        } catch (error) {
                          if (!rootContext.mounted) {
                            return;
                          }
                          ScaffoldMessenger.of(rootContext).showSnackBar(
                            SnackBar(content: Text('Falha ao criar: $error')),
                          );
                        }
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('Nova categoria'),
                    ),
                    const SizedBox(height: 12),
                    if (loading) const LinearProgressIndicator(minHeight: 2),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView(
                        children: [
                          if (customCategories.isEmpty)
                            const ListTile(
                              dense: true,
                              title: Text('Sem categorias customizadas.'),
                            ),
                          ...customCategories.map(
                            (item) => ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text(item.name),
                              subtitle: const Text('Categoria personalizada'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined),
                                    onPressed: () async {
                                      final name = await _askCategoryName(
                                        title: 'Editar categoria',
                                        initialValue: item.name,
                                      );
                                      if (name == null || name.isEmpty) {
                                        return;
                                      }

                                      try {
                                        await ref
                                            .read(transactionsServiceProvider)
                                            .updateCategory(
                                              id: item.id,
                                              name: name,
                                            );
                                        await loadCategories(setModalState);
                                        ref.invalidate(transactionsProvider);
                                      } catch (error) {
                                        if (!rootContext.mounted) {
                                          return;
                                        }
                                        ScaffoldMessenger.of(
                                          rootContext,
                                        ).showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              'Falha ao editar: $error',
                                            ),
                                          ),
                                        );
                                      }
                                    },
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline),
                                    onPressed: () async {
                                      final confirmed = await showDialog<bool>(
                                        context: dialogContext,
                                        builder: (confirmContext) => AlertDialog(
                                          title: const Text(
                                            'Excluir categoria',
                                          ),
                                          content: const Text(
                                            'Deseja excluir esta categoria personalizada?',
                                          ),
                                          actions: [
                                            TextButton(
                                              onPressed: () => Navigator.of(
                                                confirmContext,
                                              ).pop(false),
                                              child: const Text('Cancelar'),
                                            ),
                                            FilledButton(
                                              onPressed: () => Navigator.of(
                                                confirmContext,
                                              ).pop(true),
                                              child: const Text('Excluir'),
                                            ),
                                          ],
                                        ),
                                      );

                                      if (confirmed != true) {
                                        return;
                                      }

                                      try {
                                        await ref
                                            .read(transactionsServiceProvider)
                                            .deleteCategory(item.id);
                                        await loadCategories(setModalState);
                                        ref.invalidate(transactionsProvider);
                                      } catch (error) {
                                        if (!rootContext.mounted) {
                                          return;
                                        }
                                        ScaffoldMessenger.of(
                                          rootContext,
                                        ).showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              'Falha ao excluir: $error',
                                            ),
                                          ),
                                        );
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                          if (defaultCategories.isNotEmpty) ...[
                            const Divider(height: 24),
                            Text(
                              'Padrão do sistema',
                              style: Theme.of(context).textTheme.labelLarge,
                            ),
                            const SizedBox(height: 6),
                            ...defaultCategories.map(
                              (item) => ListTile(
                                dense: true,
                                contentPadding: EdgeInsets.zero,
                                title: Text(item.name),
                                subtitle: const Text('Somente leitura'),
                                trailing: const Icon(Icons.lock_outline),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final transactions = ref.watch(transactionsProvider);
    final filter = ref.watch(transactionFilterProvider);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreateDialog,
        icon: const Icon(Icons.add),
        label: const Text('Nova'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(transactionsProvider.future),
        child: ListView(
          padding: Responsive.pagePadding(context),
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('Todas'),
                  selected: filter.type == null,
                  onSelected: (_) => _setTypeFilter(null),
                ),
                ChoiceChip(
                  label: const Text('Saídas'),
                  selected: filter.type == 'EXPENSE',
                  onSelected: (_) => _setTypeFilter('EXPENSE'),
                ),
                ChoiceChip(
                  label: const Text('Entradas'),
                  selected: filter.type == 'INCOME',
                  onSelected: (_) => _setTypeFilter('INCOME'),
                ),
                OutlinedButton.icon(
                  onPressed: _openCategoryManagerDialog,
                  icon: const Icon(Icons.category_outlined),
                  label: const Text('Categorias'),
                ),
                OutlinedButton.icon(
                  onPressed: _selectDateRange,
                  icon: const Icon(Icons.date_range_outlined),
                  label: Text(
                    filter.startDate != null && filter.endDate != null
                        ? '${filter.startDate!.day}/${filter.startDate!.month} - ${filter.endDate!.day}/${filter.endDate!.month}'
                        : 'Período',
                  ),
                ),
                TextButton(
                  onPressed: _clearFilters,
                  child: const Text('Limpar'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            transactions.when(
              loading: () => const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => Padding(
                padding: const EdgeInsets.only(top: 30),
                child: Center(
                  child: Text('Erro ao carregar transações: $error'),
                ),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.only(top: 30),
                    child: Center(child: Text('Nenhuma transação encontrada')),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: items.length,
                  separatorBuilder: (_, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final tx = items[index];
                    return TransactionTile(
                      title: tx.description,
                      category: tx.categoryName,
                      amount: tx.amount,
                      isExpense: tx.isExpense,
                      action: PopupMenuButton<String>(
                        icon: const Icon(Icons.more_vert, size: 18),
                        onSelected: (value) {
                          if (value == 'edit') {
                            _openEditDialog(tx);
                          } else if (value == 'delete') {
                            _deleteTransaction(tx.id);
                          }
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(value: 'edit', child: Text('Editar')),
                          PopupMenuItem(
                            value: 'delete',
                            child: Text('Excluir'),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
