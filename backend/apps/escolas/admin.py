from django.contrib import admin

from apps.escolas.models import Disciplina, Escola, Matricula, Turma, Vinculo


@admin.register(Escola)
class EscolaAdmin(admin.ModelAdmin):
    list_display = ("nome", "limiar_minimo", "created_at")
    search_fields = ("nome",)


@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = ("nome", "ano_letivo", "escola")
    list_filter = ("escola", "ano_letivo")
    search_fields = ("nome", "escola__nome")


@admin.register(Disciplina)
class DisciplinaAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "escola")
    list_filter = ("escola",)
    search_fields = ("nome", "codigo", "escola__nome")


@admin.register(Matricula)
class MatriculaAdmin(admin.ModelAdmin):
    list_display = ("aluno", "turma", "created_at")
    list_filter = ("turma__escola", "turma")
    search_fields = ("aluno__username", "aluno__first_name", "turma__nome")


@admin.register(Vinculo)
class VinculoAdmin(admin.ModelAdmin):
    list_display = ("professor", "turma", "disciplina", "ativo")
    list_filter = ("turma__escola", "ativo", "disciplina")
    search_fields = ("professor__username", "disciplina__nome", "turma__nome")
