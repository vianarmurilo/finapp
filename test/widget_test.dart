import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:financeiro/main.dart';

void main() {
  testWidgets('renderiza app shell inicial', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: FinMindApp()));
    await tester.pump(const Duration(milliseconds: 150));

    expect(find.byType(Scaffold), findsWidgets);
  });
}
