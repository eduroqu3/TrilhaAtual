from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.accounts.models import Usuario


@admin.register(Usuario)
class CustomUsuarioAdmin(UserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "role", "escola", "is_staff")
    list_filter = ("role", "escola", "is_staff", "is_superuser", "is_active")
    fieldsets = UserAdmin.fieldsets + (
        ("Informações Institucionais", {"fields": ("role", "escola")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Informações Institucionais", {"fields": ("role", "escola")}),
    )
