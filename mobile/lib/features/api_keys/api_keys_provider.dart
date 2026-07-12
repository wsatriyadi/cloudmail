import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../models/api_key.dart';

class ApiKeysState {
  final List<ApiKey> apiKeys;
  final bool isLoading;
  final String? error;

  const ApiKeysState({
    this.apiKeys = const [],
    this.isLoading = false,
    this.error,
  });

  ApiKeysState copyWith({
    List<ApiKey>? apiKeys,
    bool? isLoading,
    String? error,
  }) => ApiKeysState(
    apiKeys: apiKeys ?? this.apiKeys,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

final apiKeysProvider = StateNotifierProvider.autoDispose<ApiKeysNotifier, ApiKeysState>((ref) {
  final notifier = ApiKeysNotifier(ref.watch(dioProvider));
  notifier.load();
  return notifier;
});

class ApiKeysNotifier extends StateNotifier<ApiKeysState> {
  final Dio _dio;

  ApiKeysNotifier(this._dio) : super(const ApiKeysState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(ApiEndpoints.apiKeys);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final apiKeys = (data['apiKeys'] as List<dynamic>)
            .map((e) => ApiKey.fromJson(e as Map<String, dynamic>))
            .toList();
        state = state.copyWith(apiKeys: apiKeys, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false, error: 'Failed to load API keys');
      }
    } catch (e) {
      debugPrint('[ApiKeys] Load error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<String?> create({
    required String name,
    required List<String> permissions,
    List<String>? ipWhitelist,
    int? rateLimit,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.apiKeys, data: {
        'name': name,
        'permissions': permissions,
        if (ipWhitelist != null && ipWhitelist.isNotEmpty) 'ipWhitelist': ipWhitelist,
        if (rateLimit != null) 'rateLimit': rateLimit,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        final apiKey = ApiKey.fromJson(response.data['apiKey'] as Map<String, dynamic>);
        state = state.copyWith(apiKeys: [apiKey, ...state.apiKeys]);
        return apiKey.key;
      }
    } catch (e) {
      debugPrint('[ApiKeys] Create error: $e');
    }
    return null;
  }

  Future<bool> toggleActive(String id, bool isActive) async {
    try {
      final response = await _dio.put(ApiEndpoints.apiKeys, data: {'id': id, 'isActive': isActive});
      if (response.statusCode == 200) {
        state = state.copyWith(
          apiKeys: state.apiKeys.map((k) {
            if (k.id == id) {
              return ApiKey.fromJson(response.data['apiKey'] as Map<String, dynamic>);
            }
            return k;
          }).toList(),
        );
        return true;
      }
    } catch (e) {
      debugPrint('[ApiKeys] Toggle error: $e');
    }
    return false;
  }

  Future<bool> delete(String id) async {
    try {
      final response = await _dio.delete(ApiEndpoints.apiKeys, data: {'id': id});
      if (response.statusCode == 200) {
        state = state.copyWith(
          apiKeys: state.apiKeys.where((k) => k.id != id).toList(),
        );
        return true;
      }
    } catch (e) {
      debugPrint('[ApiKeys] Delete error: $e');
    }
    return false;
  }
}
