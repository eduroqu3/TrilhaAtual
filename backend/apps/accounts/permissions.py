from rest_framework import permissions

from apps.accounts.models import RoleChoices


class IsAluno(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == RoleChoices.ALUNO
        )


class IsProfessor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == RoleChoices.PROFESSOR
        )


class IsCoordenacao(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == RoleChoices.COORDENACAO
        )


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == RoleChoices.ADMIN or request.user.is_superuser)
        )


class IsCoordenacaoOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role in (RoleChoices.COORDENACAO, RoleChoices.ADMIN)
                or request.user.is_superuser
            )
        )
