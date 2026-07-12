import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/api/api_endpoints.dart';
import '../../models/identity.dart';

const _apiKeyStorageKey = 'cloudmail_api_key';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) => const FlutterSecureStorage());

final apiKeyProvider = StateNotifierProvider<ApiKeyNotifier, String?>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiKeyNotifier(storage);
});

class ApiKeyNotifier extends StateNotifier<String?> {
  final FlutterSecureStorage _storage;
  ApiKeyNotifier(this._storage) : super(null) { _load(); }

  Future<void> _load() async {
    state = await _storage.read(key: _apiKeyStorageKey);
  }

  Future<void> setApiKey(String key) async {
    await _storage.write(key: _apiKeyStorageKey, value: key);
    state = key;
  }

  Future<void> clearApiKey() async {
    await _storage.delete(key: _apiKeyStorageKey);
    state = null;
  }
}

class GenerateState {
  final GeneratedIdentity? identity;
  final List<GeneratedIdentity> history;
  final bool isLoading;
  final String? error;

  const GenerateState({this.identity, this.history = const [], this.isLoading = false, this.error});

  GenerateState copyWith({
    GeneratedIdentity? identity,
    List<GeneratedIdentity>? history,
    bool? isLoading,
    String? error,
  }) => GenerateState(
    identity: identity ?? this.identity,
    history: history ?? this.history,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

final generateProvider = StateNotifierProvider<GenerateNotifier, GenerateState>((ref) {
  final apiKey = ref.watch(apiKeyProvider);
  return GenerateNotifier(apiKey);
});

class GenerateNotifier extends StateNotifier<GenerateState> {
  final String? _apiKey;
  GenerateNotifier(this._apiKey) : super(const GenerateState());

  Future<void> generate() async {
    if (_apiKey == null || _apiKey.isEmpty) {
      state = state.copyWith(error: 'Please set your API key in settings');
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = Dio(BaseOptions(
        baseUrl: ApiEndpoints.baseUrl,
        headers: {'X-API-Key': _apiKey},
      ));

      final response = await dio.post(ApiEndpoints.generate);
      if (response.statusCode == 200) {
        final identity = GeneratedIdentity.fromJson(response.data as Map<String, dynamic>);
        state = state.copyWith(
          identity: identity,
          history: [identity, ...state.history].take(20).toList(),
          isLoading: false,
        );
      } else {
        state = state.copyWith(isLoading: false, error: 'Failed to generate identity');
      }
    } catch (e) {
      debugPrint('[Generate] Error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}
