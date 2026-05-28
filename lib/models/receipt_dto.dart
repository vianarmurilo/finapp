enum ReceiptDocumentType {
  nfce,
  cupomFiscal,
  notaPaulista,
  notaFiscal,
  desconhecido,
}

enum ReceiptPaymentMethod { dinheiro, debito, credito, pix }

extension ReceiptDocumentTypeLabel on ReceiptDocumentType {
  String get label {
    switch (this) {
      case ReceiptDocumentType.nfce:
        return 'NFC-e';
      case ReceiptDocumentType.cupomFiscal:
        return 'Cupom fiscal';
      case ReceiptDocumentType.notaPaulista:
        return 'Nota paulista';
      case ReceiptDocumentType.notaFiscal:
        return 'Nota fiscal';
      case ReceiptDocumentType.desconhecido:
        return 'Desconhecida';
    }
  }
}

extension ReceiptPaymentMethodLabel on ReceiptPaymentMethod {
  String get label {
    switch (this) {
      case ReceiptPaymentMethod.dinheiro:
        return 'Dinheiro';
      case ReceiptPaymentMethod.debito:
        return 'Débito';
      case ReceiptPaymentMethod.credito:
        return 'Crédito';
      case ReceiptPaymentMethod.pix:
        return 'Pix';
    }
  }
}

ReceiptDocumentType receiptDocumentTypeFromString(String? value) {
  switch ((value ?? '').toLowerCase()) {
    case 'nfce':
      return ReceiptDocumentType.nfce;
    case 'cupom_fiscal':
      return ReceiptDocumentType.cupomFiscal;
    case 'nota_paulista':
      return ReceiptDocumentType.notaPaulista;
    case 'nota_fiscal':
      return ReceiptDocumentType.notaFiscal;
    default:
      return ReceiptDocumentType.desconhecido;
  }
}

ReceiptPaymentMethod? receiptPaymentMethodFromString(String? value) {
  switch ((value ?? '').toLowerCase()) {
    case 'dinheiro':
      return ReceiptPaymentMethod.dinheiro;
    case 'debito':
    case 'débito':
      return ReceiptPaymentMethod.debito;
    case 'credito':
    case 'crédito':
      return ReceiptPaymentMethod.credito;
    case 'pix':
      return ReceiptPaymentMethod.pix;
    default:
      return null;
  }
}

class ReceiptItemDto {
  const ReceiptItemDto({
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
  });

  final String description;
  final double quantity;
  final double unitPrice;
  final double totalPrice;

  factory ReceiptItemDto.fromJson(Map<String, dynamic> json) {
    return ReceiptItemDto(
      description: (json['description'] ?? '').toString(),
      quantity: _toDouble(json['quantity']),
      unitPrice: _toDouble(json['unitPrice']),
      totalPrice: _toDouble(json['totalPrice']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'description': description,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'totalPrice': totalPrice,
    };
  }
}

class ReceiptScanDataDto {
  const ReceiptScanDataDto({
    required this.establishmentName,
    required this.cnpj,
    required this.date,
    required this.time,
    required this.totalAmount,
    required this.paymentMethod,
    required this.items,
    required this.documentType,
    required this.suggestedCategory,
    required this.confidence,
    required this.readingIssues,
    required this.lowConfidence,
  });

  final String establishmentName;
  final String? cnpj;
  final DateTime date;
  final String? time;
  final double totalAmount;
  final ReceiptPaymentMethod? paymentMethod;
  final List<ReceiptItemDto> items;
  final ReceiptDocumentType documentType;
  final String suggestedCategory;
  final double confidence;
  final String? readingIssues;
  final bool lowConfidence;

  factory ReceiptScanDataDto.fromJson(Map<String, dynamic> json) {
    return ReceiptScanDataDto(
      establishmentName: (json['establishmentName'] ?? '').toString(),
      cnpj: json['cnpj']?.toString(),
      date:
          DateTime.tryParse((json['date'] ?? '').toString()) ?? DateTime.now(),
      time: json['time']?.toString(),
      totalAmount: _toDouble(json['totalAmount']),
      paymentMethod: receiptPaymentMethodFromString(
        json['paymentMethod']?.toString(),
      ),
      items: (json['items'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(ReceiptItemDto.fromJson)
          .toList(),
      documentType: receiptDocumentTypeFromString(
        json['documentType']?.toString(),
      ),
      suggestedCategory: (json['suggestedCategory'] ?? '').toString(),
      confidence: _toDouble(json['confidence']),
      readingIssues: json['readingIssues']?.toString(),
      lowConfidence: json['lowConfidence'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'establishmentName': establishmentName,
      'cnpj': cnpj,
      'date': date.toIso8601String().split('T').first,
      'time': time,
      'totalAmount': totalAmount,
      'paymentMethod': paymentMethod?.name,
      'items': items.map((item) => item.toJson()).toList(),
      'documentType': documentType.name,
      'suggestedCategory': suggestedCategory,
      'confidence': confidence,
      'readingIssues': readingIssues,
      'lowConfidence': lowConfidence,
    };
  }
}

class ReceiptScanResponseDto {
  const ReceiptScanResponseDto({
    required this.scanId,
    required this.data,
    required this.createdAt,
  });

  final String scanId;
  final ReceiptScanDataDto data;
  final DateTime createdAt;

  factory ReceiptScanResponseDto.fromJson(Map<String, dynamic> json) {
    return ReceiptScanResponseDto(
      scanId: (json['scanId'] ?? '').toString(),
      data: ReceiptScanDataDto.fromJson(
        Map<String, dynamic>.from(
          (json['data'] as Map?) ?? <String, dynamic>{},
        ),
      ),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
    );
  }
}

class ReceiptConfirmationDraft {
  const ReceiptConfirmationDraft({
    required this.categoryId,
    required this.description,
    required this.amount,
    required this.occurredAt,
    required this.paymentMethod,
    required this.merchant,
    required this.tags,
  });

  final String categoryId;
  final String description;
  final double amount;
  final DateTime occurredAt;
  final ReceiptPaymentMethod? paymentMethod;
  final String? merchant;
  final List<String> tags;

  Map<String, dynamic> toJson() {
    return {
      'categoryId': categoryId,
      'description': description,
      'amount': amount,
      'occurredAt': occurredAt.toIso8601String(),
      'paymentMethod': paymentMethod?.name,
      'merchant': merchant,
      'tags': tags,
    };
  }
}

double _toDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }

  return double.tryParse(value?.toString() ?? '0') ?? 0;
}
