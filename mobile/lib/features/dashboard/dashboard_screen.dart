import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/widgets/loading_widget.dart';
import '../../core/widgets/error_widget.dart';
import '../../models/stats.dart';
import 'widgets/stat_card.dart';
import 'widgets/activity_chart.dart';

final dashboardStatsProvider = FutureProvider.autoDispose<DashboardStats>((ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get(ApiEndpoints.stats);
  if (response.statusCode == 200) {
    return DashboardStats.fromJson(response.data as Map<String, dynamic>);
  }
  throw DioException(requestOptions: response.requestOptions, message: 'Failed to load stats');
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dashboardStatsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardStatsProvider),
        child: statsAsync.when(
          loading: () => const LoadingWidget(message: 'Loading stats...'),
          error: (err, _) => AppErrorWidget(
            message: err.toString(),
            onRetry: () => ref.invalidate(dashboardStatsProvider),
          ),
          data: (stats) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Overview', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 1.5,
                children: [
                  StatCard(title: 'Total Emails', value: stats.totalEmails, icon: Icons.email,
                    color: theme.colorScheme.primary),
                  StatCard(title: 'Today', value: stats.todayEmails, icon: Icons.today,
                    color: Colors.green),
                  StatCard(title: 'Domains', value: stats.activeDomains, icon: Icons.dns,
                    color: Colors.orange),
                  StatCard(title: 'API Keys', value: stats.activeApiKeys, icon: Icons.key,
                    color: Colors.purple),
                ],
              ),
              const SizedBox(height: 16),
              ActivityChart(data: stats.activityData),
            ],
          ),
        ),
      ),
    );
  }
}
