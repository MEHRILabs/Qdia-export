/// Configuration QDIA Export DZ — identique au site web
class AppConfig {
  static const googleClientId = String.fromEnvironment(
    'GOOGLE_CLIENT_ID',
    defaultValue: '532566442601-gmtsn9g0d1q6bh9oj93lh2s1muopcrfd.apps.googleusercontent.com',
  );

  static const playStoreUrl =
      'https://play.google.com/store/apps/details?id=dz.qdia.export';
  static const appStoreUrl = 'https://apps.apple.com/app/qdia-export-dz/id000000000';
  static const productWebBase = 'https://qdiadz.com/products';
}
