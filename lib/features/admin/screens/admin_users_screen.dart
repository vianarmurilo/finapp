import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/responsive.dart';
import '../controllers/admin_controller.dart';
import '../models/admin_user_item.dart';
import '../services/admin_service.dart';

class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  late final TextEditingController _searchController;
  final Set<String> _processingUserIds = <String>{};
  bool _isExporting = false;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applySearch() {
    ref.read(adminSearchProvider.notifier).state = _searchController.text;
    ref.read(adminPageProvider.notifier).state = 1;
  }

  Future<void> _refreshAll() async {
    ref.invalidate(adminSummaryProvider);
    ref.invalidate(adminUsersProvider);

    await Future.wait([
      ref.read(adminSummaryProvider.future),
      ref.read(adminUsersProvider.future),
    ]);
  }

  String _formatDateTime(DateTime? dateTime) {
    if (dateTime == null) {
      return '--/--/----';
    }

    return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Theme.of(context).colorScheme.error : null,
      ),
    );
  }

  Future<void> _runUserAction({
    required String userId,
    required Future<void> Function() action,
    required String successMessage,
  }) async {
    setState(() {
      _processingUserIds.add(userId);
    });

    try {
      await action();
      ref.invalidate(adminSummaryProvider);
      ref.invalidate(adminUsersProvider);
      _showMessage(successMessage);
    } on AdminException catch (error) {
      _showMessage(error.message, isError: true);
    } catch (_) {
      _showMessage('Falha ao executar ação administrativa.', isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _processingUserIds.remove(userId);
        });
      }
    }
  }

  Future<bool> _confirmAction({
    required String title,
    required String content,
    required String confirmLabel,
    bool danger = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(title),
          content: Text(content),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              style: danger
                  ? FilledButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.error,
                      foregroundColor: Theme.of(context).colorScheme.onError,
                    )
                  : null,
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(confirmLabel),
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  Future<void> _updateUserRole(AdminUserItem user, String role) async {
    if (user.role == role) {
      return;
    }

    final shouldProceed = await _confirmAction(
      title: 'Alterar perfil do usuário',
      content: 'Deseja alterar ${user.name} para o perfil $role?',
      confirmLabel: 'Confirmar',
    );

    if (!shouldProceed) {
      return;
    }

    await _runUserAction(
      userId: user.id,
      action: () => ref
          .read(adminServiceProvider)
          .updateUserRole(userId: user.id, role: role),
      successMessage: 'Perfil atualizado com sucesso.',
    );
  }

  Future<void> _toggleBlockState(AdminUserItem user, bool isBlocked) async {
    final actionLabel = isBlocked ? 'bloquear' : 'desbloquear';
    final shouldProceed = await _confirmAction(
      title: '${isBlocked ? 'Bloquear' : 'Desbloquear'} usuário',
      content: 'Deseja $actionLabel ${user.name}?',
      confirmLabel: 'Confirmar',
      danger: isBlocked,
    );

    if (!shouldProceed) {
      return;
    }

    await _runUserAction(
      userId: user.id,
      action: () => ref
          .read(adminServiceProvider)
          .setUserBlockedState(userId: user.id, isBlocked: isBlocked),
      successMessage: isBlocked
          ? 'Usuário bloqueado com sucesso.'
          : 'Usuário desbloqueado com sucesso.',
    );
  }

  Future<void> _deleteUser(AdminUserItem user) async {
    final shouldProceed = await _confirmAction(
      title: 'Remover usuário',
      content:
          'Esta ação irá remover ${user.name} e todos os dados vinculados. Deseja continuar?',
      confirmLabel: 'Remover',
      danger: true,
    );

    if (!shouldProceed) {
      return;
    }

    await _runUserAction(
      userId: user.id,
      action: () => ref.read(adminServiceProvider).deleteUser(user.id),
      successMessage: 'Usuário removido com sucesso.',
    );
  }

  Future<void> _exportCsv() async {
    setState(() {
      _isExporting = true;
    });

    try {
      final csv = await ref
          .read(adminServiceProvider)
          .exportUsersCsv(search: ref.read(adminSearchProvider));

      await Clipboard.setData(ClipboardData(text: csv));
      _showMessage('CSV copiado para a área de transferência.');
    } on AdminException catch (error) {
      _showMessage(error.message, isError: true);
    } catch (_) {
      _showMessage('Falha ao exportar CSV.', isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
      }
    }
  }

  Widget _metricCard({
    required IconData icon,
    required String label,
    required String value,
    String? subtitle,
  }) {
    return SizedBox(
      width: Responsive.metricCardWidth(context),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 18),
              const SizedBox(height: 8),
              Text(label, style: Theme.of(context).textTheme.labelMedium),
              const SizedBox(height: 4),
              Text(value, style: Theme.of(context).textTheme.titleLarge),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummary() {
    final summary = ref.watch(adminSummaryProvider);

    return summary.when(
      loading: () => const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (error, _) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Falha ao carregar painel admin: $error'),
        ),
      ),
      data: (data) {
        final generatedAt = data.generatedAt;
        final generatedAtLabel = generatedAt == null
            ? 'horário indisponível'
            : '${generatedAt.day.toString().padLeft(2, '0')}/${generatedAt.month.toString().padLeft(2, '0')}/${generatedAt.year} ${generatedAt.hour.toString().padLeft(2, '0')}:${generatedAt.minute.toString().padLeft(2, '0')}';

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Painel administrativo do sistema',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Última atualização: $generatedAtLabel',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _metricCard(
                      icon: Icons.groups_outlined,
                      label: 'Usuários cadastrados',
                      value: '${data.totalUsers}',
                    ),
                    _metricCard(
                      icon: Icons.admin_panel_settings_outlined,
                      label: 'Administradores',
                      value: '${data.totalAdmins}',
                      subtitle: 'Comuns: ${data.totalRegularUsers}',
                    ),
                    _metricCard(
                      icon: Icons.person_add_alt_1_outlined,
                      label: 'Novos usuários (7d)',
                      value: '${data.newUsersLast7Days}',
                    ),
                    _metricCard(
                      icon: Icons.receipt_long_outlined,
                      label: 'Transações',
                      value: '${data.totalTransactions}',
                    ),
                    _metricCard(
                      icon: Icons.flag_outlined,
                      label: 'Metas',
                      value: '${data.totalGoals}',
                    ),
                    _metricCard(
                      icon: Icons.family_restroom_outlined,
                      label: 'Famílias',
                      value: '${data.totalFamilyGroups}',
                      subtitle: 'Assinaturas: ${data.totalSubscriptions}',
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildToolbar() {
    final sortOrder = ref.watch(adminSortOrderProvider);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _applySearch(),
              decoration: InputDecoration(
                labelText: 'Buscar por nome ou e-mail',
                suffixIcon: IconButton(
                  onPressed: _applySearch,
                  icon: const Icon(Icons.search),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text('Ordenação:'),
                DropdownButton<String>(
                  value: sortOrder,
                  items: const [
                    DropdownMenuItem(value: 'desc', child: Text('Mais novos')),
                    DropdownMenuItem(value: 'asc', child: Text('Mais antigos')),
                  ],
                  onChanged: (value) {
                    if (value == null) {
                      return;
                    }
                    ref.read(adminSortOrderProvider.notifier).state = value;
                    ref.read(adminPageProvider.notifier).state = 1;
                  },
                ),
                FilledButton.icon(
                  onPressed: _isExporting ? null : _exportCsv,
                  icon: _isExporting
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.download_outlined),
                  label: Text(_isExporting ? 'Exportando...' : 'Exportar CSV'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final users = ref.watch(adminUsersProvider);

    return RefreshIndicator(
      onRefresh: _refreshAll,
      child: ListView(
        padding: Responsive.pagePadding(context),
        children: [
          _buildSummary(),
          const SizedBox(height: 12),
          _buildToolbar(),
          const SizedBox(height: 12),
          users.when(
            loading: () => const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (error, _) => Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Falha ao carregar usuários: $error'),
              ),
            ),
            data: (pageData) {
              if (pageData.items.isEmpty) {
                return const Card(
                  child: Padding(
                    padding: EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Nenhum usuário encontrado para os filtros atuais.',
                        ),
                        SizedBox(height: 6),
                        Text('Dica: limpe a busca ou altere a ordenação.'),
                      ],
                    ),
                  ),
                );
              }

              return Column(
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Total filtrado: ${pageData.total} usuários',
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                      ),
                    ),
                  ),
                  ...pageData.items.map((user) {
                    final createdAt = user.createdAt;
                    final createdAtLabel = createdAt == null
                        ? '--/--/----'
                        : '${createdAt.day.toString().padLeft(2, '0')}/${createdAt.month.toString().padLeft(2, '0')}/${createdAt.year}';
                    final isLoadingAction = _processingUserIds.contains(
                      user.id,
                    );
                    final statusLabel = user.isBlocked
                        ? 'Bloqueado em ${_formatDateTime(user.blockedAt)}'
                        : 'Ativo';

                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          child: Text(
                            user.name.isNotEmpty
                                ? user.name[0].toUpperCase()
                                : '?',
                          ),
                        ),
                        title: Text(user.name),
                        subtitle: Text(
                          '${user.email}\nPerfil: ${user.role} · Status: $statusLabel\nMoeda: ${user.currency} · Criado em: $createdAtLabel',
                        ),
                        isThreeLine: true,
                        trailing: isLoadingAction
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : PopupMenuButton<String>(
                                onSelected: (value) {
                                  if (value == 'promote') {
                                    _updateUserRole(user, 'ADMIN');
                                    return;
                                  }

                                  if (value == 'demote') {
                                    _updateUserRole(user, 'USER');
                                    return;
                                  }

                                  if (value == 'block') {
                                    _toggleBlockState(user, true);
                                    return;
                                  }

                                  if (value == 'unblock') {
                                    _toggleBlockState(user, false);
                                    return;
                                  }

                                  if (value == 'delete') {
                                    _deleteUser(user);
                                  }
                                },
                                itemBuilder: (menuContext) {
                                  return [
                                    if (user.role != 'ADMIN')
                                      const PopupMenuItem<String>(
                                        value: 'promote',
                                        child: Text('Promover para ADMIN'),
                                      ),
                                    if (user.role != 'USER')
                                      const PopupMenuItem<String>(
                                        value: 'demote',
                                        child: Text('Rebaixar para USER'),
                                      ),
                                    if (!user.isBlocked)
                                      const PopupMenuItem<String>(
                                        value: 'block',
                                        child: Text('Bloquear usuário'),
                                      ),
                                    if (user.isBlocked)
                                      const PopupMenuItem<String>(
                                        value: 'unblock',
                                        child: Text('Desbloquear usuário'),
                                      ),
                                    const PopupMenuDivider(),
                                    const PopupMenuItem<String>(
                                      value: 'delete',
                                      child: Text('Remover usuário'),
                                    ),
                                  ];
                                },
                                icon: const Icon(Icons.more_vert),
                              ),
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    alignment: WrapAlignment.spaceBetween,
                    children: [
                      OutlinedButton.icon(
                        onPressed: pageData.page > 1
                            ? () {
                                ref.read(adminPageProvider.notifier).state =
                                    pageData.page - 1;
                              }
                            : null,
                        icon: const Icon(Icons.chevron_left),
                        label: const Text('Anterior'),
                      ),
                      Text('Página ${pageData.page} de ${pageData.totalPages}'),
                      OutlinedButton.icon(
                        onPressed: pageData.page < pageData.totalPages
                            ? () {
                                ref.read(adminPageProvider.notifier).state =
                                    pageData.page + 1;
                              }
                            : null,
                        icon: const Icon(Icons.chevron_right),
                        label: const Text('Próxima'),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
