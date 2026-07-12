import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../models/alias.dart';

class AliasesState {
  final List<Alias> aliases;
  final bool isLoading;
  final String? error;

  const AliasesState({
    this.aliases = const [],
    this.isLoading = false,
    this.error,
  });

  AliasesState copyWith({
    List<Alias>? aliases,
    bool? isLoading,
    String? error,
  }) => AliasesState(
    aliases: aliases ?? this.aliases,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

final aliasesProvider = StateNotifierProvider.autoDispose<AliasesNotifier, AliasesState>((ref) {
  final notifier = AliasesNotifier(ref.watch(dioProvider));
  notifier.load();
  return notifier;
});

class AliasesNotifier extends StateNotifier<AliasesState> {
  final Dio _dio;

  AliasesNotifier(this._dio) : super(const AliasesState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(ApiEndpoints.aliases);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final aliases = (data['aliases'] as List<dynamic>)
            .map((e) => Alias.fromJson(e as Map<String, dynamic>))
            .toList();
        state = state.copyWith(aliases: aliases, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false, error: 'Failed to load aliases');
      }
    } catch (e) {
      debugPrint('[Aliases] Load error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> create({
    required String localPart,
    required String domain,
    String? description,
    int? expiresInMinutes,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.aliases, data: {
        'localPart': localPart,
        'domain': domain,
        if (description != null && description.isNotEmpty) 'description': description,
        if (expiresInMinutes != null) 'expiresInMinutes': expiresInMinutes,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        final alias = Alias.fromJson(response.data['alias'] as Map<String, dynamic>);
        state = state.copyWith(aliases: [alias, ...state.aliases]);
        return true;
      }
    } catch (e) {
      debugPrint('[Aliases] Create error: $e');
    }
    return false;
  }

  Future<bool> delete(String id) async {
    try {
      final response = await _dio.delete(ApiEndpoints.aliases, data: {'id': id});
      if (response.statusCode == 200) {
        state = state.copyWith(
          aliases: state.aliases.where((a) => a.id != id).toList(),
        );
        return true;
      }
    } catch (e) {
      debugPrint('[Aliases] Delete error: $e');
    }
    return false;
  }
}
