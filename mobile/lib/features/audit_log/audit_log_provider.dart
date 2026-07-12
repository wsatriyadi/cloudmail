import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../models/audit_log.dart';
import '../../models/pagination.dart';

class AuditLogState {
  final List<AuditLog> logs;
  final Pagination? pagination;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;

  const AuditLogState({
    this.logs = const [],
    this.pagination,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
  });

  AuditLogState copyWith({
    List<AuditLog>? logs,
    Pagination? pagination,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
  }) => AuditLogState(
    logs: logs ?? this.logs,
    pagination: pagination ?? this.pagination,
    isLoading: isLoading ?? this.isLoading,
    isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    error: error,
  );
}

final auditLogProvider = StateNotifierProvider.autoDispose<AuditLogNotifier, AuditLogState>((ref) {
  final notifier = AuditLogNotifier(ref.watch(dioProvider));
  notifier.load();
  return notifier;
});

class AuditLogNotifier extends StateNotifier<AuditLogState> {
  final Dio _dio;

  AuditLogNotifier(this._dio) : super(const AuditLogState());

  Future<void> load({int page = 1}) async {
    if (page == 1) {
      state = state.copyWith(isLoading: true, error: null);
    } else {
      state = state.copyWith(isLoadingMore: true);
    }

    try {
      final response = await _dio.get(ApiEndpoints.auditLog, queryParameters: {
        'page': page,
        'limit': 50,
      });

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final logs = (data['logs'] as List<dynamic>)
            .map((e) => AuditLog.fromJson(e as Map<String, dynamic>))
            .toList();
        final pagination = Pagination.fromJson(data['pagination'] as Map<String, dynamic>);

        state = state.copyWith(
          logs: page == 1 ? logs : [...state.logs, ...logs],
          pagination: pagination,
          isLoading: false,
          isLoadingMore: false,
        );
      } else {
        state = state.copyWith(isLoading: false, isLoadingMore: false, error: 'Failed to load audit log');
      }
    } catch (e) {
      debugPrint('[AuditLog] Load error: $e');
      state = state.copyWith(isLoading: false, isLoadingMore: false, error: e.toString());
    }
  }

  void loadMore() {
    final pagination = state.pagination;
    if (pagination != null && pagination.hasMore && !state.isLoadingMore) {
      load(page: pagination.page + 1);
    }
  }
}
