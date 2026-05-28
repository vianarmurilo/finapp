import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../core/network/api_client.dart';
import '../models/receipt_dto.dart';
import '../services/receipt_service.dart';
import '../features/transactions/controllers/transactions_controller.dart';

final receiptServiceProvider = Provider<ReceiptService>((ref) {
  return ReceiptService(ref.watch(dioProvider));
});

final receiptProvider =
    AsyncNotifierProvider<ReceiptNotifier, ReceiptScanState>(
      ReceiptNotifier.new,
    );

enum ReceiptScanStatus {
  idle,
  picking,
  scanning,
  ready,
  saving,
  success,
  error,
}

class ReceiptScanState {
  const ReceiptScanState({
    this.status = ReceiptScanStatus.idle,
    this.image,
    this.scan,
    this.errorMessage,
  });

  final ReceiptScanStatus status;
  final XFile? image;
  final ReceiptScanResponseDto? scan;
  final String? errorMessage;

  bool get hasReceipt => scan != null && image != null;
  bool get isBusy =>
      status == ReceiptScanStatus.picking ||
      status == ReceiptScanStatus.scanning ||
      status == ReceiptScanStatus.saving;

  ReceiptScanState copyWith({
    ReceiptScanStatus? status,
    XFile? image,
    ReceiptScanResponseDto? scan,
    String? errorMessage,
    bool clearImage = false,
    bool clearScan = false,
    bool clearError = false,
  }) {
    return ReceiptScanState(
      status: status ?? this.status,
      image: clearImage ? null : image ?? this.image,
      scan: clearScan ? null : scan ?? this.scan,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class ReceiptNotifier extends AsyncNotifier<ReceiptScanState> {
  final ImagePicker _picker = ImagePicker();

  ReceiptService get _service => ref.read(receiptServiceProvider);

  @override
  Future<ReceiptScanState> build() async {
    return const ReceiptScanState();
  }

  Future<void> captureFromCamera() => _pickAndScan(ImageSource.camera);

  Future<void> captureFromGallery() => _pickAndScan(ImageSource.gallery);

  Future<void> reset() async {
    state = const AsyncData(ReceiptScanState());
  }

  Future<void> confirmReceipt({
    required String categoryId,
    String? description,
    double? amount,
    DateTime? occurredAt,
    ReceiptPaymentMethod? paymentMethod,
    String? merchant,
    List<String> tags = const <String>[],
  }) async {
    final current = state.valueOrNull ?? const ReceiptScanState();
    final scan = current.scan;

    if (scan == null) {
      state = AsyncData(
        current.copyWith(
          status: ReceiptScanStatus.error,
          errorMessage: 'Leia uma nota fiscal antes de confirmar.',
        ),
      );
      return;
    }

    state = AsyncData(
      current.copyWith(status: ReceiptScanStatus.saving, clearError: true),
    );

    try {
      await _service.confirmReceipt(
        scan: scan,
        draft: ReceiptConfirmationDraft(
          categoryId: categoryId,
          description: description?.trim().isNotEmpty == true
              ? description!.trim()
              : scan.data.establishmentName,
          amount: amount ?? scan.data.totalAmount,
          occurredAt: occurredAt ?? scan.data.date,
          paymentMethod: paymentMethod ?? scan.data.paymentMethod,
          merchant: merchant?.trim().isNotEmpty == true
              ? merchant!.trim()
              : scan.data.establishmentName,
          tags: <String>{...tags, 'receipt'}.toList(),
        ),
      );

      ref.invalidate(transactionsProvider);
      ref.read(transactionsMutationProvider.notifier).state += 1;
      state = AsyncData(
        current.copyWith(status: ReceiptScanStatus.success, clearError: true),
      );
    } on DioException catch (error) {
      final message = _extractMessage(error);
      state = AsyncData(
        current.copyWith(
          status: ReceiptScanStatus.error,
          errorMessage: message,
        ),
      );
    } catch (error) {
      state = AsyncData(
        current.copyWith(
          status: ReceiptScanStatus.error,
          errorMessage: _extractMessage(error),
        ),
      );
    }
  }

  Future<void> _pickAndScan(ImageSource source) async {
    final current = state.valueOrNull ?? const ReceiptScanState();
    state = AsyncData(
      current.copyWith(status: ReceiptScanStatus.picking, clearError: true),
    );

    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 90,
        maxWidth: 2048,
      );

      if (picked == null) {
        state = AsyncData(current.copyWith(status: ReceiptScanStatus.idle));
        return;
      }

      state = AsyncData(
        current.copyWith(
          status: ReceiptScanStatus.scanning,
          image: picked,
          clearScan: true,
          clearError: true,
        ),
      );

      final scan = await _service.scanReceipt(image: picked);
      state = AsyncData(
        current.copyWith(
          status: ReceiptScanStatus.ready,
          image: picked,
          scan: scan,
          clearError: true,
        ),
      );
    } on DioException catch (error) {
      state = AsyncData(
        current.copyWith(
          status: ReceiptScanStatus.error,
          errorMessage: _extractMessage(error),
        ),
      );
    } catch (error) {
      state = AsyncData(
        current.copyWith(
          status: ReceiptScanStatus.error,
          errorMessage: _extractMessage(error),
        ),
      );
    }
  }

  String _extractMessage(Object error) {
    if (error is DioException) {
      final responseData = error.response?.data;
      if (responseData is Map<String, dynamic>) {
        final message = responseData['message']?.toString();
        if (message != null && message.isNotEmpty) {
          return message;
        }
      }

      return error.message ?? 'Não foi possível processar a nota fiscal.';
    }

    return error.toString().replaceFirst('Exception: ', '');
  }
}
