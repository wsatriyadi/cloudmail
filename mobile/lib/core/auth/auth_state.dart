sealed class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class Authenticated extends AuthState {
  final String name;
  final String email;
  final String role;

  const Authenticated({required this.name, required this.email, required this.role});
}

class Unauthenticated extends AuthState {
  final String? error;
  const Unauthenticated({this.error});
}
