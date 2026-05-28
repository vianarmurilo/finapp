class TransactionFilter {
  const TransactionFilter({this.type, this.startDate, this.endDate});

  final String? type;
  final DateTime? startDate;
  final DateTime? endDate;

  TransactionFilter copyWith({
    String? type,
    DateTime? startDate,
    DateTime? endDate,
    bool clearDates = false,
  }) {
    return TransactionFilter(
      type: type ?? this.type,
      startDate: clearDates ? null : (startDate ?? this.startDate),
      endDate: clearDates ? null : (endDate ?? this.endDate),
    );
  }
}
