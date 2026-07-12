import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../models/stats.dart';

class ActivityChart extends StatelessWidget {
  final List<ActivityData> data;
  const ActivityChart({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (data.isEmpty) {
      return const SizedBox(height: 200, child: Center(child: Text('No activity data')));
    }

    final maxY = data.fold<int>(0, (max, d) => d.count > max ? d.count : max).toDouble();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Email Activity', style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text('Last ${data.length} days', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxY < 1 ? 5 : maxY * 1.2,
                  barTouchData: BarTouchData(
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        final d = data[group.x.toInt()];
                        return BarTooltipItem(
                          '${_formatDate(d.date)}\n${d.count} emails',
                          TextStyle(color: theme.colorScheme.onPrimary, fontSize: 12),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        getTitlesWidget: (value, meta) {
                          if (value == value.roundToDouble()) {
                            return Text('${value.toInt()}', style: TextStyle(fontSize: 10, color: theme.colorScheme.outline));
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index >= data.length || data.length <= 7 || index % (data.length ~/ 7) == 0) {
                            if (index < data.length) {
                              return Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(_shortDate(data[index].date),
                                  style: TextStyle(fontSize: 9, color: theme.colorScheme.outline)),
                              );
                            }
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: theme.colorScheme.outline.withAlpha(30),
                      strokeWidth: 1,
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: data.asMap().entries.map((entry) {
                    return BarChartGroupData(
                      x: entry.key,
                      barRods: [
                        BarChartRodData(
                          toY: entry.value.count.toDouble(),
                          color: theme.colorScheme.primary,
                          width: data.length > 14 ? 6 : 12,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String date) {
    try {
      return DateFormat.MMMd().format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }

  String _shortDate(String date) {
    try {
      return DateFormat.Md().format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }
}
