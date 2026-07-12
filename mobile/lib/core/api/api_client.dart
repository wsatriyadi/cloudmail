import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'api_endpoints.dart';

final cookieJarProvider = Provider<PersistCookieJar>((ref) {
  throw UnimplementedError('Override at startup');
});

final dioProvider = Provider<Dio>((ref) {
  final cookieJar = ref.watch(cookieJarProvider);
  final dio = Dio(BaseOptions(
    baseUrl: ApiEndpoints.baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    contentType: Headers.jsonContentType,
    responseType: ResponseType.json,
    validateStatus: (status) => status != null && status < 500,
  ));

  dio.interceptors.addAll([
    CookieManager(cookieJar),
    _LogInterceptor(),
  ]);

  return dio;
});

class _LogInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('[API] ${options.method} ${options.path}');
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint('[API ERROR] ${err.response?.statusCode} ${err.message}');
    handler.next(err);
  }
}

Future<PersistCookieJar> createCookieJar() async {
  final dir = await getApplicationDocumentsDirectory();
  return PersistCookieJar(storage: FileStorage('${dir.path}/.cookies/'));
}
