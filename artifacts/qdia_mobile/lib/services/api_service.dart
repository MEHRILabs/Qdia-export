import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class ApiConfig {
  static const baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:8080',
  );
}

class ApiService {
  static final ApiService instance = ApiService._();
  ApiService._();

  String? _token;
  int? _userId;
  String? _userName;
  String? _userEmail;

  bool get isLoggedIn => _token != null && _token!.isNotEmpty;
  String? get authToken => _token;
  int? get userId => _userId;
  String? get userName => _userName;
  String? get userEmail => _userEmail;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('qdia_token');
    final userJson = prefs.getString('qdia_user');
    if (userJson != null && userJson.isNotEmpty) {
      try {
        final user = jsonDecode(userJson) as Map<String, dynamic>;
        _userId = (user['id'] as num?)?.toInt();
        _userName = user['name']?.toString();
        _userEmail = user['email']?.toString();
      } catch (_) {}
    }
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('qdia_token', token);
  }

  Future<void> saveUser(Map<String, dynamic> user) async {
    _userId = (user['id'] as num?)?.toInt();
    _userName = user['name']?.toString();
    _userEmail = user['email']?.toString();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('qdia_user', jsonEncode(user));
  }

  Future<void> saveSession(Map<String, dynamic> loginResponse) async {
    final token = loginResponse['token']?.toString();
    if (token != null && token.isNotEmpty) {
      await saveToken(token);
    }
    final user = loginResponse['user'];
    if (user is Map<String, dynamic>) {
      await saveUser(user);
    }
  }

  Future<void> clearToken() async {
    _token = null;
    _userId = null;
    _userName = null;
    _userEmail = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('qdia_token');
    await prefs.remove('qdia_user');
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  dynamic _decodeBody(http.Response res) {
    if (res.body.isEmpty) return {};
    return jsonDecode(res.body);
  }

  Map<String, dynamic> _decode(http.Response res) {
    final decoded = _decodeBody(res);
    if (res.statusCode >= 400) {
      final err = decoded is Map ? decoded['error'] : null;
      throw Exception(err ?? 'Erreur ${res.statusCode}');
    }
    if (decoded is List) return {'data': decoded};
    return decoded as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> get(String path) async {
    final res = await http.get(Uri.parse('${ApiConfig.baseUrl}$path'), headers: _headers);
    return _decode(res);
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final res = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final res = await http.delete(Uri.parse('${ApiConfig.baseUrl}$path'), headers: _headers);
    return _decode(res);
  }

  // ─── Auth ───
  Future<Map<String, dynamic>> register(String email, String password, {String? name}) =>
      post('/api/auth/register', {
        'email': email,
        'password': password,
        if (name != null) 'name': name,
      });

  Future<Map<String, dynamic>> login(String email, String password) =>
      post('/api/auth/login', {'email': email, 'password': password});

  Future<Map<String, dynamic>> loginGoogle(String email, String name, {String? googleId}) =>
      post('/api/auth/google', {
        'email': email,
        'name': name,
        if (googleId != null) 'google_id': googleId,
      });

  Future<Map<String, dynamic>> sendOtp(String phone) =>
      post('/api/auth/phone/send', {'phone': phone});

  Future<Map<String, dynamic>> verifyOtp(String phone, String code) =>
      post('/api/auth/phone/verify', {'phone': phone, 'code': code});

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) =>
      patch('/api/auth/profile', data);

  Future<Map<String, dynamic>> verificationStatus() => get('/api/verification/status');

  // ─── Products ───
  Future<List<dynamic>> getProducts({
    String? search,
    String? scope,
    int? categoryId,
    String? category,
    double? moqMin,
    double? moqMax,
    double? priceMin,
    double? priceMax,
    String? originWilaya,
    int? supplierId,
    String? incoterm,
    int page = 1,
    int limit = 50,
  }) async {
    final params = <String, String>{};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (scope != null) params['scope'] = scope;
    if (categoryId != null) params['category_id'] = '$categoryId';
    if (category != null && category.isNotEmpty) params['category'] = category;
    if (moqMin != null) params['moq_min'] = '$moqMin';
    if (moqMax != null) params['moq_max'] = '$moqMax';
    if (priceMin != null) params['price_min'] = '$priceMin';
    if (priceMax != null) params['price_max'] = '$priceMax';
    if (originWilaya != null && originWilaya.isNotEmpty) params['origin_wilaya'] = originWilaya;
    if (supplierId != null) params['supplier_id'] = '$supplierId';
    if (incoterm != null && incoterm.isNotEmpty) params['incoterm'] = incoterm;
    params['page'] = '$page';
    params['limit'] = '$limit';
    final q = params.isEmpty
        ? ''
        : '?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}';
    final data = await get('/api/products$q');
    return (data['data'] ?? data['products'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> getProduct(int id) => get('/api/products/$id');

  Future<Map<String, dynamic>> lookupProduct(String code) =>
      get('/api/products/lookup?code=${Uri.encodeComponent(code)}');

  Future<List<dynamic>> getProductCategories() async {
    final data = await get('/api/products/meta/categories');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> getProductEnrichmentStatus() => get('/api/products/enrich/status');

  Future<Map<String, dynamic>> enrichProducts({
    int limit = 50,
    bool generatePhotos = true,
    bool skipPricing = false,
  }) =>
      post('/api/products/enrich', {
        'limit': limit,
        'generate_photos': generatePhotos,
        'skip_pricing': skipPricing,
      });

  Future<Map<String, dynamic>> publishProduct(Map<String, dynamic> body) =>
      post('/api/products', body);

  Future<Map<String, dynamic>> deleteProduct(int id) => delete('/api/products/$id');

  // ─── RFQ ───
  Future<Map<String, dynamic>> createRfq(Map<String, dynamic> body) => post('/api/rfq', body);

  Future<List<dynamic>> getRfqs() async {
    final data = await get('/api/rfq');
    final raw = data['data'] ?? data;
    return raw is List ? raw : [];
  }

  Future<Map<String, dynamic>> acceptRfqWithPayment(int id, String method, {String? swiftRef, String? lcNumber}) =>
      patch('/api/rfq/$id', {
        'action': 'accept',
        'payment_method': method,
        if (swiftRef != null) 'swift_reference': swiftRef,
        if (lcNumber != null) 'lc_number': lcNumber,
      });

  Future<Map<String, dynamic>> rejectRfq(int id) => patch('/api/rfq/$id', {'action': 'reject'});

  Future<Map<String, dynamic>> shipRfq(int id, String tracking) =>
      patch('/api/rfq/$id', {'action': 'ship', 'tracking_number': tracking});

  Future<List<dynamic>> getTransactions() async {
    final data = await get('/api/payments/transactions');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> fundPayment(int id) => post('/api/payments/$id/fund', {});

  Future<Map<String, dynamic>> releasePayment(int id) => post('/api/payments/$id/release', {});

  Future<List<dynamic>> getMessageThreads() async {
    final data = await get('/api/messages/threads');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<List<dynamic>> getMessageThread(int partnerId) async {
    final data = await get('/api/messages/thread/$partnerId');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> updateProduct(int id, Map<String, dynamic> body) =>
      http.put(
        Uri.parse('${ApiConfig.baseUrl}/api/products/$id'),
        headers: _headers,
        body: jsonEncode(body),
      ).then(_decode);

  Future<Map<String, dynamic>> duplicateProduct(int id) =>
      post('/api/products/$id/duplicate', {});

  Future<List<dynamic>> getCategories() async {
    final data = await get('/api/categories');
    return (data['data'] ?? data['categories'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> invoiceAiLines(Map<String, dynamic> body) =>
      post('/api/billing/invoices/ai-lines', body);

  Future<Map<String, dynamic>> getInvoices() => get('/api/billing/invoices');

  Future<bool> downloadInvoicePreviewPdf(Map<String, dynamic> body) async {
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/api/billing/invoices/preview-pdf');
      final res = await http.post(uri, headers: _headers, body: jsonEncode(body));
      if (res.statusCode != 200) return false;
      final bytes = res.bodyBytes;
      // Vérifie la signature PDF (%PDF) — sinon c'est une erreur JSON.
      if (bytes.length < 4 || bytes[0] != 0x25 || bytes[1] != 0x50 || bytes[2] != 0x44 || bytes[3] != 0x46) {
        return false;
      }
      final dir = await getTemporaryDirectory();
      final safeName = (body['number']?.toString() ?? 'facture')
          .replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');
      final file = File('${dir.path}/$safeName.pdf');
      await file.writeAsBytes(bytes, flush: true);
      final result = await OpenFilex.open(file.path, type: 'application/pdf');
      return result.type == ResultType.done;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> bulkImport({required List<String> urls}) =>
      post('/api/ai/bulk-import', {
        'source_urls': urls,
        'scrape_images': true,
        'enrich_with_ai': true,
        'publish': false,
      });

  Future<void> registerFcmToken(String token) {
    final platform = defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    return post('/api/notifications/fcm/register', {'token': token, 'platform': platform}).then((_) {});
  }

  Future<Map<String, dynamic>> subscriptionCheckout(String plan) =>
      post('/api/subscriptions/checkout', {'plan': plan});

  String catalogPdfUrl() => '${ApiConfig.baseUrl}/api/documents/catalog.pdf';

  String certificatePdfUrl(int productId) =>
      '${ApiConfig.baseUrl}/api/documents/products/$productId/certificate.pdf';

  Future<Map<String, dynamic>> quoteRfq(
    int id, {
    required double quotePrice,
    String? quoteMessage,
    String? quoteIncoterm,
  }) =>
      patch('/api/rfq/$id', {
        'action': 'quote',
        'quote_price': quotePrice,
        if (quoteMessage != null) 'quote_message': quoteMessage,
        if (quoteIncoterm != null) 'quote_incoterm': quoteIncoterm,
      });

  // ─── Dashboard ───
  Future<Map<String, dynamic>> getDashboardStats() => get('/api/dashboard/stats');

  // ─── Messages ───
  Future<List<dynamic>> getMessages() async {
    final data = await get('/api/messages');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> sendMessage({
    required int receiverId,
    required String body,
    int? rfqId,
  }) =>
      post('/api/messages', {
        'receiver_id': receiverId,
        'body': body,
        if (rfqId != null) 'rfq_id': rfqId,
      });

  // ─── Favorites ───
  Future<List<int>> getFavorites() async {
    final data = await get('/api/favorites');
    return ((data['product_ids'] ?? []) as List).cast<int>();
  }

  Future<void> addFavorite(int productId) => post('/api/favorites/$productId', {});

  Future<void> removeFavorite(int productId) => delete('/api/favorites/$productId');

  // ─── Reviews ───
  Future<Map<String, dynamic>> getReviews(int productId) => get('/api/products/$productId/reviews');

  Future<Map<String, dynamic>> postReview(int productId, int rating, {String? comment}) =>
      post('/api/products/$productId/reviews', {
        'rating': rating,
        if (comment != null) 'comment': comment,
      });

  // ─── Marketplace — Panier & commandes ───
  Future<List<dynamic>> getCart() async {
    final data = await get('/api/cart');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> addToCart({
    required int productId,
    required int quantity,
    String incoterm = 'FOB',
    String? notes,
  }) =>
      post('/api/cart', {
        'product_id': productId,
        'quantity': quantity,
        'incoterm': incoterm,
        if (notes != null) 'notes': notes,
      });

  Future<void> removeFromCart(int itemId) => delete('/api/cart/$itemId').then((_) {});

  Future<Map<String, dynamic>> checkoutCart({String paymentMethod = 'escrow'}) =>
      post('/api/cart/checkout', {'payment_method': paymentMethod});

  Future<List<dynamic>> getOrders() async {
    final data = await get('/api/orders');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<List<dynamic>> reorder(int orderId) async {
    final data = await post('/api/orders/$orderId/reorder', {});
    return (data['data'] ?? []) as List<dynamic>;
  }

  // ─── Trade Assurance / Litiges ───
  Future<List<dynamic>> getDisputes() async {
    final data = await get('/api/disputes');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> createDispute({
    required int transactionId,
    required String reason,
    int? orderId,
    int? supplierId,
    String? description,
  }) =>
      post('/api/disputes', {
        'transaction_id': transactionId,
        'reason': reason,
        if (orderId != null) 'order_id': orderId,
        if (supplierId != null) 'supplier_id': supplierId,
        if (description != null) 'description': description,
      });

  // ─── OEM / ODM & Échantillons ───
  Future<Map<String, dynamic>> createOemRequest({
    required int productId,
    required String requestType,
    required String specs,
    int? supplierId,
    String? logoUrl,
    int? quantity,
  }) =>
      post('/api/oem-requests', {
        'product_id': productId,
        'request_type': requestType,
        'specs': specs,
        if (supplierId != null) 'supplier_id': supplierId,
        if (logoUrl != null) 'logo_url': logoUrl,
        if (quantity != null) 'quantity': quantity,
      });

  Future<Map<String, dynamic>> createSampleRequest({
    required int productId,
    required String shippingAddress,
    int quantity = 1,
    int? supplierId,
  }) =>
      post('/api/sample-requests', {
        'product_id': productId,
        'quantity': quantity,
        'shipping_address': shippingAddress,
        if (supplierId != null) 'supplier_id': supplierId,
      });

  // ─── Avis fournisseur ───
  Future<Map<String, dynamic>> getSupplierReviews(int supplierId) =>
      get('/api/suppliers/$supplierId/reviews');

  Future<Map<String, dynamic>> postSupplierReview(int supplierId, int rating, {String? comment}) =>
      post('/api/suppliers/$supplierId/reviews', {
        'rating': rating,
        if (comment != null) 'comment': comment,
      });

  // ─── Suivi colis ───
  Future<Map<String, dynamic>> trackParcel({required String number, String? carrier}) async {
    final params = <String, String>{'number': number};
    if (carrier != null && carrier.isNotEmpty) params['carrier'] = carrier;
    final q = '?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}';
    return get('/api/tracking$q');
  }

  Future<Map<String, dynamic>> trackParcelByPath(String carrier, String number) =>
      get('/api/tracking/$carrier/$number');

  // ─── Recommandations ───
  Future<List<dynamic>> getRecommendations({int? productId, int limit = 8}) async {
    final params = <String, String>{'limit': '$limit'};
    if (productId != null) params['product_id'] = '$productId';
    final q = '?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}';
    final data = await get('/api/products/recommendations$q');
    return (data['data'] ?? []) as List<dynamic>;
  }

  String webSocketUrl() {
    final wsBase = ApiConfig.baseUrl
        .replaceFirst('https://', 'wss://')
        .replaceFirst('http://', 'ws://');
    return '$wsBase/api/ws?token=${Uri.encodeComponent(_token ?? '')}';
  }

  // ─── Compliance ───
  Future<Map<String, dynamic>> complianceAlerts(String destination, String category) =>
      get('/api/compliance/alerts?destination=${Uri.encodeComponent(destination)}&category=${Uri.encodeComponent(category)}');

  // ─── Ports & Customs ───
  Future<Map<String, dynamic>> getPorts() => get('/api/ports');

  Future<Map<String, dynamic>> calculateCustoms({
    required String category,
    required String destinationCode,
    required double cifValueDzd,
    String? portCode,
  }) =>
      post('/api/customs/calculate', {
        'product_category': category,
        'destination_code': destinationCode,
        'cif_value_dzd': cifValueDzd,
        if (portCode != null) 'port_code': portCode,
      });

  // ─── AI Sessions ───
  Future<Map<String, dynamic>> createAiSession({int? supplierId}) =>
      post('/api/ai/sessions', {if (supplierId != null) 'supplier_id': supplierId});

  Future<Map<String, dynamic>> getAiSession(String id) => get('/api/ai/sessions/$id');

  Future<Map<String, dynamic>> resetAiSession(String id) =>
      post('/api/ai/sessions/$id/reset', {});

  Future<Map<String, dynamic>> generateProduct(String sessionId, String description) =>
      post('/api/ai/generate-product', {
        'session_id': sessionId,
        'description': description,
      });

  Future<Map<String, dynamic>> calculatePricing(String sessionId, Map<String, dynamic> input) =>
      post('/api/ai/calculate-pricing', {'session_id': sessionId, ...input});

  Future<Map<String, dynamic>> studioProcess({
    required String sessionId,
    required String imageBase64,
    required String action,
    String? productName,
  }) =>
      post('/api/ai/studio', {
        'session_id': sessionId,
        'image_base64': imageBase64,
        'action': action,
        if (productName != null) 'product_name': productName,
      });

  /// Chat IA — parse SSE stream into a single reply string
  Future<String> aiChat(String message, {String? sessionId}) async {
    final req = http.Request('POST', Uri.parse('${ApiConfig.baseUrl}/api/ai/chat'));
    req.headers.addAll(_headers);
    req.body = jsonEncode({
      'message': message,
      if (sessionId != null) 'session_id': sessionId,
    });

    try {
      final streamed = await req.send();
      final body = await streamed.stream.transform(utf8.decoder).join();
      if (streamed.statusCode >= 400) {
        throw Exception('Erreur chat IA ${streamed.statusCode}');
      }
      final buffer = StringBuffer();
      for (final line in body.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          final data = jsonDecode(line.substring(6)) as Map<String, dynamic>;
          if (data['content'] != null) buffer.write(data['content']);
        } catch (_) {}
      }
      return buffer.toString().isEmpty ? 'Réponse IA indisponible.' : buffer.toString();
    } catch (_) {
      return 'Agent IA hors ligne — vérifiez la connexion API.';
    }
  }

  // ─── Catalogue Master Data ───
  Future<Map<String, dynamic>> getCatalogStats() => get('/api/catalog/stats');

  Future<List<dynamic>> getCatalogVariants({String? status, int limit = 50}) async {
    final params = <String, String>{'limit': '$limit'};
    if (status != null) params['status'] = status;
    final q = '?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}';
    final data = await get('/api/catalog/variants$q');
    return (data['data'] ?? []) as List<dynamic>;
  }

  Future<Map<String, dynamic>> importCatalogExcel({
    required List<int> fileBytes,
    bool autoPublish = false,
  }) =>
      post('/api/catalog/import', {
        'file_base64': base64Encode(fileBytes),
        'auto_publish': autoPublish,
      });

  Future<Map<String, dynamic>> enrichCatalog({int limit = 20, bool generatePhotos = true}) =>
      post('/api/catalog/enrich', {'limit': limit, 'generate_photos': generatePhotos});

  Future<Map<String, dynamic>> publishReadyCatalog({int limit = 50}) =>
      post('/api/catalog/publish-ready', {'limit': limit});

  // ─── Analytics (dashboard ventes/achats/dettes/créances) ───
  Future<Map<String, dynamic>> getAnalyticsOverview() => get('/api/analytics/overview');

  // ─── Cache produits (offline) ───
  static const productsCacheKey = 'qdia_products_cache';

  Future<void> cacheProducts(List<dynamic> products) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(productsCacheKey, jsonEncode(products));
  }

  Future<List<dynamic>?> loadCachedProducts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(productsCacheKey);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as List<dynamic>;
    } catch (_) {
      return null;
    }
  }
}

/// WebSocket temps réel — messages, commandes, litiges
class QdiaWebSocket {
  QdiaWebSocket();

  final _events = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get events => _events.stream;

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  bool _connected = false;

  bool get isConnected => _connected;

  Future<void> connect() async {
    await ApiService.instance.loadToken();
    if (!ApiService.instance.isLoggedIn) return;
    await disconnect();
    try {
      _channel = WebSocketChannel.connect(Uri.parse(ApiService.instance.webSocketUrl()));
      _subscription = _channel!.stream.listen(
        (raw) {
          try {
            final event = jsonDecode(raw as String) as Map<String, dynamic>;
            if (event['type'] == 'connected') _connected = true;
            _events.add(event);
          } catch (_) {}
        },
        onError: (_) => _connected = false,
        onDone: () => _connected = false,
      );
    } catch (_) {
      _connected = false;
    }
  }

  void sendTyping(int receiverId) {
    if (!_connected || _channel == null) return;
    _channel!.sink.add(jsonEncode({'type': 'typing', 'receiver_id': receiverId}));
  }

  Future<void> disconnect() async {
    _connected = false;
    await _subscription?.cancel();
    _subscription = null;
    await _channel?.sink.close();
    _channel = null;
  }

  void dispose() {
    _events.close();
  }
}
