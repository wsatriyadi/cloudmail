import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/api/api_client.dart';
import 'core/auth/auth_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final cookieJar = await createCookieJar();

  final container = ProviderContainer(
    overrides: [
      cookieJarProvider.overrideWithValue(cookieJar),
    ],
  );

  container.read(authProvider.notifier).checkSession();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const CloudMailApp(),
    ),
  );
}
