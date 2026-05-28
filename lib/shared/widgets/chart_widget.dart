import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../features/dashboard/models/dashboard_data.dart';

class ChartWidget extends StatefulWidget {
  const ChartWidget({super.key, required this.byCategory});

  final List<CategoryExpense> byCategory;

  @override
  State<ChartWidget> createState() => _ChartWidgetState();
}

class _ChartWidgetState extends State<ChartWidget> {
  int _mode = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.byCategory.isEmpty) {
      return const SizedBox(
        height: 180,
        child: Center(child: Text('Sem dados para grafico')),
      );
    }

    final total = widget.byCategory.fold<double>(
      0,
      (sum, item) => sum + item.amount,
    );

    Widget chart;
    if (_mode == 0) {
      chart = PieChart(
        PieChartData(
          sectionsSpace: 2,
          centerSpaceRadius: 38,
          sections: widget.byCategory.take(5).toList().asMap().entries.map((
            entry,
          ) {
            final idx = entry.key;
            final item = entry.value;
            final percent = total == 0 ? 0 : (item.amount / total) * 100;
            final color = Colors.primaries[idx % Colors.primaries.length];

            return PieChartSectionData(
              color: color,
              value: item.amount,
              title: '${percent.toStringAsFixed(0)}%',
              radius: 68,
              titleStyle: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            );
          }).toList(),
        ),
      );
    } else if (_mode == 1) {
      chart = BarChart(
        BarChartData(
          gridData: const FlGridData(show: false),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: true, reservedSize: 42),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  final idx = value.toInt();
                  if (idx < 0 || idx >= widget.byCategory.length) {
                    return const SizedBox.shrink();
                  }
                  final label = widget.byCategory[idx].name;
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      label.length > 7 ? '${label.substring(0, 7)}…' : label,
                      style: const TextStyle(fontSize: 10),
                    ),
                  );
                },
              ),
            ),
          ),
          borderData: FlBorderData(show: false),
          barGroups: widget.byCategory.take(6).toList().asMap().entries.map((
            entry,
          ) {
            return BarChartGroupData(
              x: entry.key,
              barRods: [
                BarChartRodData(
                  toY: entry.value.amount,
                  width: 16,
                  borderRadius: BorderRadius.circular(6),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0A9396), Color(0xFF005F73)],
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      );
    } else {
      final spots = widget.byCategory.take(6).toList().asMap().entries.map((
        entry,
      ) {
        return FlSpot(entry.key.toDouble(), entry.value.amount);
      }).toList();

      chart = LineChart(
        LineChartData(
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          titlesData: const FlTitlesData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              barWidth: 3,
              color: const Color(0xFFEE9B00),
              belowBarData: BarAreaData(
                show: true,
                color: const Color(0xFFEE9B00).withValues(alpha: 0.2),
              ),
              dotData: const FlDotData(show: true),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        SegmentedButton<int>(
          showSelectedIcon: false,
          selected: {_mode},
          onSelectionChanged: (value) => setState(() => _mode = value.first),
          segments: const [
            ButtonSegment(value: 0, label: Text('Pizza')),
            ButtonSegment(value: 1, label: Text('Barras')),
            ButtonSegment(value: 2, label: Text('Linha')),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 220,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 280),
            child: chart,
          ),
        ),
      ],
    );
  }
}
