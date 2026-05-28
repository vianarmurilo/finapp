class AppConstants {
  const AppConstants._();

  static const appName = 'FinMind AI+';
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3333/api',
  );
  static const tokenStorageKey = 'finmind_jwt';
  static const userStorageKey = 'finmind_user';
}
