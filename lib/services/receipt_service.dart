import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

import '../models/receipt_dto.dart';

class ReceiptService {
  const ReceiptService(this._dio);

  final Dio _dio;

  Future<ReceiptScanResponseDto> scanReceipt({required XFile image}) async {
    final bytes = await image.readAsBytes();
    final formData = FormData.fromMap({
      'image': MultipartFile.fromBytes(
        Uint8List.fromList(bytes),
        filename: image.name.isNotEmpty ? image.name : 'nota-fiscal.jpg',
      ),
    });

    final response = await _dio.post(
      '/receipt/scan',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );

    return ReceiptScanResponseDto.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  Future<void> confirmReceipt({
    required ReceiptScanResponseDto scan,
    required ReceiptConfirmationDraft draft,
  }) async {
    await _dio.post(
      '/receipt/confirm',
      data: {
        'scanId': scan.scanId,
        'data': {...scan.data.toJson(), ...draft.toJson()},
      },
    );
  }
}
