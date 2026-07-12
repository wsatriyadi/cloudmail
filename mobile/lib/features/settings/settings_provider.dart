import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../models/setting.dart';

class SettingsState {
  final List<Setting> settings;
  final bool isLoading;
  final String? error;

  const SettingsState({
    this.settings = const [],
    this.isLoading = false,
    this.error,
  });

  SettingsState copyWith({
    List<Setting>? settings,
    bool? isLoading,
    String? error,
  }) => SettingsState(
    settings: settings ?? this.settings,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

final settingsProvider = StateNotifierProvider.autoDispose<SettingsNotifier, SettingsState>((ref) {
  final notifier = SettingsNotifier(ref.watch(dioProvider));
  notifier.load();
  return notifier;
});

class SettingsNotifier extends StateNotifier<SettingsState> {
  final Dio _dio;

  SettingsNotifier(this._dio) : super(const SettingsState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(ApiEndpoints.settings);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final settings = (data['settings'] as List<dynamic>)
            .map((e) => Setting.fromJson(e as Map<String, dynamic>))
            .toList();
        state = state.copyWith(settings: settings, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false, error: 'Failed to load settings');
      }
    } catch (e) {
      debugPrint('[Settings] Load error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> updateSetting(String key, String value) async {
    try {
      final response = await _dio.put(ApiEndpoints.settings, data: {
        'key': key,
        'value': value,
      });
      if (response.statusCode == 200) {
        state = state.copyWith(
          settings: state.settings.map((s) {
            if (s.key == key) {
              return Setting.fromJson(response.data['setting'] as Map<String, dynamic>);
            }
            return s;
          }).toList(),
        );
        return true;
      }
    } catch (e) {
      debugPrint('[Settings] Update error: $e');
    }
    return false;
  }
}
