import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../storage/local_cache.dart';

class ApiException implements Exception {
  final String code;
  final String message;
  final int statusCode;

  ApiException({
    required this.code,
    required this.message,
    required this.statusCode,
  });

  @override
  String toString() => message;
}

class ApiClient {
  final String baseUrl;
  final http.Client _client;

  ApiClient({
    this.baseUrl = ApiConstants.defaultBaseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  Future<Map<String, String>> _getHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final token = await LocalCache.getToken();
    final userId = await LocalCache.getUserId();

    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    if (userId != null && userId.isNotEmpty) {
      headers['x-dev-user-id'] = userId;
    }

    return headers;
  }

  Future<dynamic> get(String endpoint, {Map<String, String>? queryParams}) async {
    Uri uri = Uri.parse('$baseUrl$endpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }

    try {
      final headers = await _getHeaders();
      final response = await _client.get(uri, headers: headers);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        code: 'NETWORK_ERROR',
        message: 'Unable to reach AEGIS server. Please check your network connection.',
        statusCode: 0,
      );
    }
  }

  Future<dynamic> post(String endpoint, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    try {
      final headers = await _getHeaders();
      final response = await _client.post(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        code: 'NETWORK_ERROR',
        message: 'Unable to dispatch request. Please check network connectivity.',
        statusCode: 0,
      );
    }
  }

  Future<dynamic> patch(String endpoint, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    try {
      final headers = await _getHeaders();
      final response = await _client.patch(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        code: 'NETWORK_ERROR',
        message: 'Failed to update resource.',
        statusCode: 0,
      );
    }
  }

  Future<dynamic> delete(String endpoint) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    try {
      final headers = await _getHeaders();
      final response = await _client.delete(uri, headers: headers);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        code: 'NETWORK_ERROR',
        message: 'Failed to delete resource.',
        statusCode: 0,
      );
    }
  }

  dynamic _processResponse(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(response.body);
    } catch (_) {
      decoded = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (decoded is Map<String, dynamic> && decoded.containsKey('data')) {
        return decoded['data'];
      }
      return decoded;
    }

    final errorCode = decoded is Map && decoded['error'] is Map
        ? decoded['error']['code'] ?? 'ERROR'
        : 'HTTP_${response.statusCode}';

    final errorMessage = decoded is Map && decoded['message'] != null
        ? decoded['message']
        : 'Request failed with status ${response.statusCode}';

    throw ApiException(
      code: errorCode,
      message: errorMessage,
      statusCode: response.statusCode,
    );
  }
}
