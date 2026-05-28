import 'package:dio/dio.dart';
import '../models/admin_summary.dart';
import '../models/admin_user_item.dart';

class AdminException implements Exception {
  const AdminException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AdminService {
  const AdminService(this._dio);

  final Dio _dio;

  Never _handleDioError(DioException error, String fallbackMessage) {
    final status = error.response?.statusCode;
    if (status == 401) {
      throw const AdminException('Sessão expirada. Faça login novamente.');
    }
    if (status == 403) {
      throw const AdminException(
        'Acesso negado. Você não tem permissão de administrador.',
      );
    }

    final message = error.response?.data is Map<String, dynamic>
        ? (error.response?.data['message'] as String?)
        : null;

    throw AdminException(message ?? fallbackMessage);
  }

  Future<AdminSummary> getSummary() async {
    try {
      final response = await _dio.get('/admin/summary');
      return AdminSummary.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      _handleDioError(error, 'Falha ao carregar o resumo administrativo.');
    } catch (_) {
      throw const AdminException('Falha ao carregar o resumo administrativo.');
    }
  }

  Future<AdminUsersPage> listUsers({
    required int page,
    required int pageSize,
    String? search,
    required String sortOrder,
  }) async {
    try {
      final response = await _dio.get(
        '/admin/users',
        queryParameters: {
          'page': page,
          'pageSize': pageSize,
          'sortOrder': sortOrder,
          if (search != null && search.trim().isNotEmpty)
            'search': search.trim(),
        },
      );

      return AdminUsersPage.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      _handleDioError(error, 'Falha ao carregar usuários cadastrados.');
    } catch (_) {
      throw const AdminException('Falha ao carregar usuários cadastrados.');
    }
  }

  Future<void> updateUserRole({
    required String userId,
    required String role,
  }) async {
    try {
      await _dio.patch('/admin/users/$userId/role', data: {'role': role});
    } on DioException catch (error) {
      _handleDioError(error, 'Falha ao atualizar perfil do usuário.');
    } catch (_) {
      throw const AdminException('Falha ao atualizar perfil do usuário.');
    }
  }

  Future<void> setUserBlockedState({
    required String userId,
    required bool isBlocked,
  }) async {
    try {
      await _dio.patch(
        '/admin/users/$userId/block',
        data: {'isBlocked': isBlocked},
      );
    } on DioException catch (error) {
      _handleDioError(error, 'Falha ao atualizar bloqueio do usuário.');
    } catch (_) {
      throw const AdminException('Falha ao atualizar bloqueio do usuário.');
    }
  }

  Future<void> deleteUser(String userId) async {
    try {
      await _dio.delete('/admin/users/$userId');
    } on DioException catch (error) {
      _handleDioError(error, 'Falha ao remover usuário.');
    } catch (_) {
      throw const AdminException('Falha ao remover usuário.');
    }
  }

  Future<String> exportUsersCsv({String? search}) async {
    try {
      final response = await _dio.get(
        '/admin/users/export.csv',
        queryParameters: {
          if (search != null && search.trim().isNotEmpty)
            'search': search.trim(),
        },
        options: Options(responseType: ResponseType.plain),
      );

      final data = response.data;
      if (data is String) {
        return data;
      }

      return data?.toString() ?? '';
    } on DioException catch (error) {
      _handleDioError(error, 'Falha ao exportar relatório CSV.');
    } catch (_) {
      throw const AdminException('Falha ao exportar relatório CSV.');
    }
  }
}
