import 'package:shared_preferences/shared_preferences.dart';
import 'package:qdia_mobile/services/api_service.dart';

class FavoritesService {
  static final FavoritesService instance = FavoritesService._();
  FavoritesService._();

  static const _key = 'qdia_favorites_local';

  Future<Set<int>> getLocalIds() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_key);
    if (raw == null) return {};
    return raw.map(int.parse).toSet();
  }

  Future<void> _saveLocal(Set<int> ids) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_key, ids.map((e) => e.toString()).toList());
  }

  Future<List<int>> syncFromApi() async {
    if (!ApiService.instance.isLoggedIn) {
      return (await getLocalIds()).toList();
    }
    try {
      final ids = await ApiService.instance.getFavorites();
      await _saveLocal(ids.toSet());
      return ids;
    } catch (_) {
      return (await getLocalIds()).toList();
    }
  }

  Future<bool> isFavorite(int productId) async {
    final ids = await getLocalIds();
    return ids.contains(productId);
  }

  Future<bool> toggle(int productId) async {
    final ids = await getLocalIds();
    final add = !ids.contains(productId);
    if (add) {
      ids.add(productId);
    } else {
      ids.remove(productId);
    }
    await _saveLocal(ids);

    if (ApiService.instance.isLoggedIn) {
      try {
        if (add) {
          await ApiService.instance.addFavorite(productId);
        } else {
          await ApiService.instance.removeFavorite(productId);
        }
      } catch (_) {}
    }
    return add;
  }

  Future<List<int>> exportIds() async {
    final ids = await getLocalIds();
    return ids.toList();
  }
}
