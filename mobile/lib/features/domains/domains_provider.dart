import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../models/domain.dart';

class DomainsState {
  final List<Domain> domains;
  final bool isLoading;
  final String? error;

  const DomainsState({
    this.domains = const [],
    this.isLoading = false,
    this.error,
  });

  DomainsState copyWith({
    List<Domain>? domains,
    bool? isLoading,
    String? error,
  }) => DomainsState(
    domains: domains ?? this.domains,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

final domainsProvider = StateNotifierProvider.autoDispose<DomainsNotifier, DomainsState>((ref) {
  final notifier = DomainsNotifier(ref.watch(dioProvider));
  notifier.load();
  return notifier;
});

class DomainsNotifier extends StateNotifier<DomainsState> {
  final Dio _dio;

  DomainsNotifier(this._dio) : super(const DomainsState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(ApiEndpoints.domains);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final domains = (data['domains'] as List<dynamic>)
            .map((e) => Domain.fromJson(e as Map<String, dynamic>))
            .toList();
        state = state.copyWith(domains: domains, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false, error: 'Failed to load domains');
      }
    } catch (e) {
      debugPrint('[Domains] Load error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> create(String domain) async {
    try {
      final response = await _dio.post(ApiEndpoints.domains, data: {'domain': domain});
      if (response.statusCode == 200 || response.statusCode == 201) {
        final d = Domain.fromJson(response.data['domain'] as Map<String, dynamic>);
        state = state.copyWith(domains: [d, ...state.domains]);
        return true;
      }
    } catch (e) {
      debugPrint('[Domains] Create error: $e');
    }
    return false;
  }

  Future<bool> toggleActive(String id, bool isActive) async {
    try {
      final response = await _dio.put(ApiEndpoints.domains, data: {'id': id, 'isActive': isActive});
      if (response.statusCode == 200) {
        state = state.copyWith(
          domains: state.domains.map((d) {
            if (d.id == id) {
              return Domain.fromJson(response.data['domain'] as Map<String, dynamic>);
            }
            return d;
          }).toList(),
        );
        return true;
      }
    } catch (e) {
      debugPrint('[Domains] Toggle error: $e');
    }
    return false;
  }

  Future<bool> delete(String id) async {
    try {
      final response = await _dio.delete(ApiEndpoints.domains, data: {'id': id});
      if (response.statusCode == 200) {
        state = state.copyWith(
          domains: state.domains.where((d) => d.id != id).toList(),
        );
        return true;
      }
    } catch (e) {
      debugPrint('[Domains] Delete error: $e');
    }
    return false;
  }
}
