import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../models/email.dart';
import '../../models/pagination.dart';

class InboxState {
  final List<Email> emails;
  final Pagination? pagination;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;
  final String searchQuery;
  final String? domainFilter;

  const InboxState({
    this.emails = const [],
    this.pagination,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.searchQuery = '',
    this.domainFilter,
  });

  InboxState copyWith({
    List<Email>? emails,
    Pagination? pagination,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    String? searchQuery,
    String? domainFilter,
  }) => InboxState(
    emails: emails ?? this.emails,
    pagination: pagination ?? this.pagination,
    isLoading: isLoading ?? this.isLoading,
    isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    error: error,
    searchQuery: searchQuery ?? this.searchQuery,
    domainFilter: domainFilter ?? this.domainFilter,
  );
}

final inboxProvider = StateNotifierProvider.autoDispose<InboxNotifier, InboxState>((ref) {
  final notifier = InboxNotifier(ref.watch(dioProvider));
  notifier.loadEmails();
  notifier.startPolling();
  ref.onDispose(() => notifier.stopPolling());
  return notifier;
});

class InboxNotifier extends StateNotifier<InboxState> {
  final Dio _dio;
  Timer? _pollTimer;

  InboxNotifier(this._dio) : super(const InboxState());

  void startPolling() {
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _pollNewEmails());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> loadEmails({int page = 1}) async {
    if (page == 1) {
      state = state.copyWith(isLoading: true, error: null);
    } else {
      state = state.copyWith(isLoadingMore: true);
    }

    try {
      final response = await _dio.get(ApiEndpoints.emails, queryParameters: {
        'page': page,
        'limit': 20,
        if (state.searchQuery.isNotEmpty) 'search': state.searchQuery,
        if (state.domainFilter != null) 'domain': state.domainFilter,
      });

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final emails = (data['emails'] as List<dynamic>)
            .map((e) => Email.fromJson(e as Map<String, dynamic>))
            .toList();
        final pagination = Pagination.fromJson(data['pagination'] as Map<String, dynamic>);

        state = state.copyWith(
          emails: page == 1 ? emails : [...state.emails, ...emails],
          pagination: pagination,
          isLoading: false,
          isLoadingMore: false,
        );
      } else {
        state = state.copyWith(isLoading: false, isLoadingMore: false, error: 'Failed to load emails');
      }
    } catch (e) {
      debugPrint('[Inbox] Load error: $e');
      state = state.copyWith(isLoading: false, isLoadingMore: false, error: e.toString());
    }
  }

  Future<void> _pollNewEmails() async {
    try {
      final response = await _dio.get(ApiEndpoints.emails, queryParameters: {
        'page': 1, 'limit': 5,
        if (state.searchQuery.isNotEmpty) 'search': state.searchQuery,
        if (state.domainFilter != null) 'domain': state.domainFilter,
      });

      if (response.statusCode == 200 && mounted) {
        final data = response.data as Map<String, dynamic>;
        final newEmails = (data['emails'] as List<dynamic>)
            .map((e) => Email.fromJson(e as Map<String, dynamic>))
            .toList();

        final existingIds = state.emails.map((e) => e.id).toSet();
        final fresh = newEmails.where((e) => !existingIds.contains(e.id)).toList();

        if (fresh.isNotEmpty) {
          state = state.copyWith(emails: [...fresh, ...state.emails]);
        }
      }
    } catch (_) {}
  }

  void setSearch(String query) {
    state = state.copyWith(searchQuery: query);
    loadEmails();
  }

  void setDomainFilter(String? domain) {
    state = state.copyWith(domainFilter: domain);
    loadEmails();
  }

  Future<void> deleteEmails(List<String> ids) async {
    try {
      await _dio.delete(ApiEndpoints.emails, data: {'ids': ids});
      state = state.copyWith(
        emails: state.emails.where((e) => !ids.contains(e.id)).toList(),
      );
    } catch (e) {
      debugPrint('[Inbox] Delete error: $e');
    }
  }

  void loadMore() {
    final pagination = state.pagination;
    if (pagination != null && pagination.hasMore && !state.isLoadingMore) {
      loadEmails(page: pagination.page + 1);
    }
  }
}
