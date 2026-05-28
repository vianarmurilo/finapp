import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/categories/controllers/categories_controller.dart';
import '../features/categories/models/category_item.dart';
import '../models/receipt_dto.dart';
import '../providers/receipt_provider.dart';
import '../shared/widgets/animated_button.dart';
import '../widgets/receipt_preview_card.dart';

class ReceiptScanScreen extends ConsumerStatefulWidget {
  const ReceiptScanScreen({super.key});

  @override
  ConsumerState<ReceiptScanScreen> createState() => _ReceiptScanScreenState();
}

class _ReceiptScanScreenState extends ConsumerState<ReceiptScanScreen> {
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _merchantController = TextEditingController();

  String? _selectedCategoryId;
  ReceiptPaymentMethod? _selectedPaymentMethod;
  DateTime _selectedDate = DateTime.now();
  String? _lastScanId;
  ReceiptScanStatus? _prevReceiptStatus;
  String? _prevSuggestedCategory;

  @override
  void initState() {
    super.initState();
    // Listeners are registered in build via Consumer to respect Riverpod rules.
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _amountController.dispose();
    _merchantController.dispose();
    super.dispose();
  }

  void _applyScanDefaults(ReceiptScanState state) {
    final scan = state.scan;
    if (scan == null || scan.scanId == _lastScanId) {
      return;
    }

    _lastScanId = scan.scanId;
    _descriptionController.text = scan.data.establishmentName;
    _merchantController.text = scan.data.establishmentName;
    _amountController.text = scan.data.totalAmount
        .toStringAsFixed(2)
        .replaceAll('.', ',');
    _selectedDate = scan.data.date;
    _selectedPaymentMethod = scan.data.paymentMethod;
  }

  void _syncCategorySelection(
    List<CategoryItem> categories,
    String suggestedCategory,
  ) {
    if (categories.isEmpty) {
      return;
    }

    final current = _selectedCategoryId;
    final currentExists =
        current != null && categories.any((category) => category.id == current);
    if (currentExists) {
      return;
    }

    final matched = categories
        .where(
          (category) =>
              category.name.toLowerCase() == suggestedCategory.toLowerCase(),
        )
        .toList();
    final selected = matched.isNotEmpty ? matched.first : categories.first;

    if (!mounted) {
      return;
    }

    setState(() {
      _selectedCategoryId = selected.id;
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 5)),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      _selectedDate = picked;
    });
  }

  double? _parseAmount(String raw) {
    final normalized = raw
        .replaceAll('R\$', '')
        .replaceAll('.', '')
        .replaceAll(',', '.')
        .trim();
    return double.tryParse(normalized);
  }

  Future<void> _confirmReceipt(ReceiptScanState state) async {
    final scan = state.scan;
    final categoryId = _selectedCategoryId;

    if (scan == null) {
      return;
    }

    if (categoryId == null) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Selecione uma categoria antes de salvar'),
          ),
        );
      return;
    }

    final amount =
        _parseAmount(_amountController.text) ?? scan.data.totalAmount;
    final description = _descriptionController.text.trim().isEmpty
        ? scan.data.establishmentName
        : _descriptionController.text.trim();
    final merchant = _merchantController.text.trim().isEmpty
        ? scan.data.establishmentName
        : _merchantController.text.trim();

    await ref
        .read(receiptProvider.notifier)
        .confirmReceipt(
          categoryId: categoryId,
          description: description,
          amount: amount,
          occurredAt: _selectedDate,
          paymentMethod: _selectedPaymentMethod,
          merchant: merchant,
          tags: const ['nota-fiscal'],
        );
  }

  void _handleReceiptSideEffects(
    ReceiptScanState receiptState,
    AsyncValue<List<CategoryItem>> categoriesAsync,
  ) {
    final currentScanId = receiptState.scan?.scanId;

    if (currentScanId != null && currentScanId != _lastScanId) {
      _applyScanDefaults(receiptState);
    }

    if (receiptState.status == ReceiptScanStatus.error &&
        receiptState.errorMessage != null &&
        _prevReceiptStatus != ReceiptScanStatus.error) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(receiptState.errorMessage!)));
      });
    }

    if (receiptState.status == ReceiptScanStatus.success &&
        _prevReceiptStatus != ReceiptScanStatus.success) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Nota fiscal salva com sucesso')),
          );
        ref.read(receiptProvider.notifier).reset();
        Navigator.of(context).pop(true);
      });
    }

    _prevReceiptStatus = receiptState.status;
    _lastScanId = currentScanId;

    final categories = categoriesAsync.valueOrNull ?? const <CategoryItem>[];
    final suggested = receiptState.scan?.data.suggestedCategory;
    if (suggested != null &&
        suggested != _prevSuggestedCategory &&
        categories.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _syncCategorySelection(categories, suggested);
      });
      _prevSuggestedCategory = suggested;
    }
  }

  @override
  Widget build(BuildContext context) {
    final receiptAsync = ref.watch(receiptProvider);
    final receiptState = receiptAsync.valueOrNull ?? const ReceiptScanState();
    final categoriesAsync = ref.watch(categoriesProvider('EXPENSE'));
    final colorScheme = Theme.of(context).colorScheme;

    // Handle receipt state side-effects by comparing previous values stored
    // in state fields. This avoids using `ref.listen` which has lifecycle
    // restrictions in this widget shape.
    _handleReceiptSideEffects(receiptState, categoriesAsync);

    final categories = categoriesAsync.valueOrNull ?? const <CategoryItem>[];
    final selectedCategoryValue =
        categories.any((category) => category.id == _selectedCategoryId)
        ? _selectedCategoryId
        : null;
    if (receiptState.scan != null &&
        _selectedCategoryId == null &&
        categories.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) {
          return;
        }
        _syncCategorySelection(
          categories,
          receiptState.scan!.data.suggestedCategory,
        );
      });
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Leitura de nota fiscal')),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              colorScheme.primaryContainer.withValues(alpha: 0.5),
              colorScheme.surface,
            ],
          ),
        ),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            children: [
              _HeaderBanner(status: receiptState.status),
              const SizedBox(height: 16),
              if (!receiptState.hasReceipt) ...[
                _CapturePanel(
                  isBusy: receiptState.isBusy,
                  onCamera: () =>
                      ref.read(receiptProvider.notifier).captureFromCamera(),
                  onGallery: () =>
                      ref.read(receiptProvider.notifier).captureFromGallery(),
                ),
              ] else ...[
                ReceiptPreviewCard(
                  scan: receiptState.scan!,
                  image: receiptState.image!,
                  onRescan: () => ref.read(receiptProvider.notifier).reset(),
                ),
                const SizedBox(height: 16),
                _EditReceiptForm(
                  categoriesAsync: categoriesAsync,
                  selectedCategoryId: selectedCategoryValue,
                  selectedPaymentMethod: _selectedPaymentMethod,
                  descriptionController: _descriptionController,
                  merchantController: _merchantController,
                  amountController: _amountController,
                  selectedDate: _selectedDate,
                  onCategoryChanged: (value) =>
                      setState(() => _selectedCategoryId = value),
                  onPaymentMethodChanged: (value) =>
                      setState(() => _selectedPaymentMethod = value),
                  onPickDate: _pickDate,
                ),
                const SizedBox(height: 18),
                AnimatedButton(
                  isLoading: receiptState.status == ReceiptScanStatus.saving,
                  onPressed: () => _confirmReceipt(receiptState),
                  label: 'Salvar despesa',
                ),
              ],
              if (receiptState.status == ReceiptScanStatus.scanning ||
                  receiptState.status == ReceiptScanStatus.picking ||
                  receiptState.status == ReceiptScanStatus.saving) ...[
                const SizedBox(height: 18),
                LinearProgressIndicator(
                  minHeight: 5,
                  borderRadius: BorderRadius.circular(999),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderBanner extends StatelessWidget {
  const _HeaderBanner({required this.status});

  final ReceiptScanStatus status;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final statusLabel = switch (status) {
      ReceiptScanStatus.idle => 'Capture uma foto da nota para começar.',
      ReceiptScanStatus.picking => 'Abrindo a câmera ou a galeria...',
      ReceiptScanStatus.scanning => 'Lendo a imagem com IA...',
      ReceiptScanStatus.ready => 'Revise os dados antes de salvar.',
      ReceiptScanStatus.saving => 'Salvando a transação...',
      ReceiptScanStatus.success => 'Pronto.',
      ReceiptScanStatus.error => 'Houve um problema na leitura.',
    };

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [colorScheme.primary, colorScheme.tertiary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withValues(alpha: 0.22),
            blurRadius: 30,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.document_scanner_outlined,
            color: colorScheme.onPrimary,
            size: 32,
          ),
          const SizedBox(height: 12),
          Text(
            'Nota fiscal por foto',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: colorScheme.onPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            statusLabel,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: colorScheme.onPrimary.withValues(alpha: 0.88),
            ),
          ),
        ],
      ),
    );
  }
}

class _CapturePanel extends StatelessWidget {
  const _CapturePanel({
    required this.isBusy,
    required this.onCamera,
    required this.onGallery,
  });

  final bool isBusy;
  final VoidCallback onCamera;
  final VoidCallback onGallery;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Escolha como capturar a nota',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: isBusy ? null : onCamera,
              icon: const Icon(Icons.photo_camera_outlined),
              label: const Text('Usar câmera'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: isBusy ? null : onGallery,
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('Escolher da galeria'),
            ),
            const SizedBox(height: 12),
            Text(
              'A IA lê os principais campos, sugere categoria e deixa tudo pronto para revisão.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EditReceiptForm extends StatelessWidget {
  const _EditReceiptForm({
    required this.categoriesAsync,
    required this.selectedCategoryId,
    required this.selectedPaymentMethod,
    required this.descriptionController,
    required this.merchantController,
    required this.amountController,
    required this.selectedDate,
    required this.onCategoryChanged,
    required this.onPaymentMethodChanged,
    required this.onPickDate,
  });

  final AsyncValue<List<CategoryItem>> categoriesAsync;
  final String? selectedCategoryId;
  final ReceiptPaymentMethod? selectedPaymentMethod;
  final TextEditingController descriptionController;
  final TextEditingController merchantController;
  final TextEditingController amountController;
  final DateTime selectedDate;
  final ValueChanged<String?> onCategoryChanged;
  final ValueChanged<ReceiptPaymentMethod?> onPaymentMethodChanged;
  final VoidCallback onPickDate;

  @override
  Widget build(BuildContext context) {
    final categories = categoriesAsync.valueOrNull ?? const <CategoryItem>[];

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Revise os dados',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: descriptionController,
              decoration: const InputDecoration(
                labelText: 'Descrição',
                prefixIcon: Icon(Icons.description_outlined),
              ),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: merchantController,
              decoration: const InputDecoration(
                labelText: 'Estabelecimento',
                prefixIcon: Icon(Icons.store_outlined),
              ),
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Valor total',
                prefixIcon: Icon(Icons.payments_outlined),
              ),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: selectedCategoryId,
              items: categories
                  .map(
                    (category) => DropdownMenuItem<String>(
                      value: category.id,
                      child: Text(category.name),
                    ),
                  )
                  .toList(),
              onChanged: onCategoryChanged,
              decoration: const InputDecoration(
                labelText: 'Categoria',
                prefixIcon: Icon(Icons.category_outlined),
              ),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<ReceiptPaymentMethod?>(
              initialValue: selectedPaymentMethod,
              items: [
                const DropdownMenuItem<ReceiptPaymentMethod?>(
                  value: null,
                  child: Text('Não informado'),
                ),
                ...ReceiptPaymentMethod.values.map(
                  (method) => DropdownMenuItem<ReceiptPaymentMethod?>(
                    value: method,
                    child: Text(method.label),
                  ),
                ),
              ],
              onChanged: onPaymentMethodChanged,
              decoration: const InputDecoration(
                labelText: 'Forma de pagamento',
                prefixIcon: Icon(Icons.credit_card_outlined),
              ),
            ),
            const SizedBox(height: 14),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_month_outlined),
              title: const Text('Data da despesa'),
              subtitle: Text(
                '${selectedDate.day.toString().padLeft(2, '0')}/${selectedDate.month.toString().padLeft(2, '0')}/${selectedDate.year}',
              ),
              trailing: TextButton(
                onPressed: onPickDate,
                child: const Text('Alterar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
