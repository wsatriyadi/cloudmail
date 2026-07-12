import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../models/user.dart';

class UsersState {
  final List<User> users;
  final bool isLoading;
  final String? error;

  const UsersState({
    this.users = const [],
    this.isLoading = false,
    this.error,
  });

  UsersState copyWith({
    List<User>? users,
    bool? isLoading,
    String? error,
  }) => UsersState(
    users: users ?? this.users,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

final usersProvider = StateNotifierProvider.autoDispose<UsersNotifier, UsersState>((ref) {
  final notifier = UsersNotifier(ref.watch(dioProvider));
  notifier.load();
  return notifier;
});

class UsersNotifier extends StateNotifier<UsersState> {
  final Dio _dio;

  UsersNotifier(this._dio) : super(const UsersState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(ApiEndpoints.users);
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final users = (data['users'] as List<dynamic>)
            .map((e) => User.fromJson(e as Map<String, dynamic>))
            .toList();
        state = state.copyWith(users: users, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false, error: 'Failed to load users');
      }
    } catch (e) {
      debugPrint('[Users] Load error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> updateUser({required String id, String? role, String? name}) async {
    try {
      final response = await _dio.put(ApiEndpoints.users, data: {
        'id': id,
        if (role != null) 'role': role,
        if (name != null) 'name': name,
      });
      if (response.statusCode == 200) {
        state = state.copyWith(
          users: state.users.map((u) {
            if (u.id == id) {
              return User.fromJson(response.data['user'] as Map<String, dynamic>);
            }
            return u;
          }).toList(),
        );
        return true;
      }
    } catch (e) {
      debugPrint('[Users] Update error: $e');
    }
    return false;
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.put('${ApiEndpoints.users}/password', data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[Users] Change password error: $e');
    }
    return false;
  }

  Future<bool> delete(String id) async {
    try {
      final response = await _dio.delete(ApiEndpoints.users, data: {'id': id});
      if (response.statusCode == 200) {
        state = state.copyWith(
          users: state.users.where((u) => u.id != id).toList(),
        );
        return true;
      }
    } catch (e) {
      debugPrint('[Users] Delete error: $e');
    }
    return false;
  }
}
