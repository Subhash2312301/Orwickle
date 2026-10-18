import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/network/secure_storage_service.dart';
import 'core/network/api_client.dart';
import 'features/auth/services/auth_api_service.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/role_selection_screen.dart';
import 'features/dashboard/screens/student_dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final storage = SecureStorageService();

  late final ApiClient apiClient;
  late final AuthProvider authProvider;

  apiClient = ApiClient(
    storage: storage,
    onAuthRevoked: () {
      authProvider.logout();
    },
  );

  final authApiService = AuthApiService(
    apiClient: apiClient,
    storage: storage,
  );

  authProvider = AuthProvider(
    apiService: authApiService,
    storage: storage,
  );

  // Check initial authentication state from secure storage
  await authProvider.checkInitialAuth();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
      ],
      child: const OrwickleApp(),
    ),
  );
}

class OrwickleApp extends StatelessWidget {
  const OrwickleApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return MaterialApp(
      title: 'Orwickle — Dealroom Dossier',
      debugShowCheckedModeBanner: false,
      theme: DossierTheme.lightTheme,
      darkTheme: DossierTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: auth.isAuthenticated ? const StudentDashboardScreen() : const RoleSelectionScreen(),
    );
  }
}
