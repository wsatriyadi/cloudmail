import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import 'auth_state.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(dioProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  final Dio _dio;

  AuthNotifier(this._dio) : super(const AuthInitial());

  Future<void> checkSession() async {
    state = const AuthLoading();
    try {
      final response = await _dio.get(ApiEndpoints.session);
      final data = response.data as Map<String, dynamic>;
      if (data.containsKey('user') && data['user'] != null) {
        final user = data['user'] as Map<String, dynamic>;
        state = Authenticated(
          name: user['name'] as String? ?? '',
          email: user['email'] as String? ?? '',
          role: user['role'] as String? ?? 'user',
        );
      } else {
        state = const Unauthenticated();
      }
    } catch (e) {
      debugPrint('[Auth] Session check failed: $e');
      state = const Unauthenticated();
    }
  }

  Future<void> login(String email, String password) async {
    state = const AuthLoading();
    try {
      final csrfResponse = await _dio.get(ApiEndpoints.csrfToken);
      final csrfToken = (csrfResponse.data as Map<String, dynamic>)['csrfToken'] as String;

      final loginResponse = await _dio.post(
        ApiEndpoints.loginCallback,
        data: {
          'email': email,
          'password': password,
          'csrfToken': csrfToken,
          'redirect': 'false',
        },
        options: Options(
          contentType: Headers.formUrlEncodedContentType,
          followRedirects: false,
          validateStatus: (status) => status != null && status < 500,
        ),
      );

      if (loginResponse.statusCode == 200 || loginResponse.statusCode == 302) {
        await checkSession();
      } else {
        final errorMsg = loginResponse.data is Map
            ? (loginResponse.data as Map)['error']?.toString() ?? 'Login failed'
            : 'Login failed';
        state = Unauthenticated(error: errorMsg);
      }
    } on DioException catch (e) {
      state = Unauthenticated(error: e.message ?? 'Network error');
    } catch (e) {
      state = Unauthenticated(error: e.toString());
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiEndpoints.signOut);
    } catch (_) {}
    state = const Unauthenticated();
  }
}
