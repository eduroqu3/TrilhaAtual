from django.contrib import admin

from apps.avaliacoes.models import (
    Avaliacao,
    CicloAvaliacao,
    Participacao,
    Pergunta,
    RespostaEscala,
    RespostaTexto,
)


@admin.register(CicloAvaliacao)
class CicloAvaliacaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "escola", "status", "abre_em", "fecha_em")
    list_filter = ("status", "escola")
    search_fields = ("nome", "escola__nome")


@admin.register(Pergunta)
class PerguntaAdmin(admin.ModelAdmin):
    list_display = ("texto_resumido", "ciclo", "tipo", "dimensao", "ordem")
    list_filter = ("tipo", "ciclo__escola", "ciclo")
    search_fields = ("texto", "dimensao")

    def texto_resumido(self, obj):
        return obj.texto[:60]


@admin.register(Participacao)
class ParticipacaoAdmin(admin.ModelAdmin):
    list_display = ("aluno", "ciclo", "vinculo", "created_at")
    list_filter = ("ciclo__escola", "ciclo")
    search_fields = ("aluno__username", "vinculo__professor__username")


class ReadOnlyNoMassDeleteAdmin(admin.ModelAdmin):
    """
    Admin com visualização somente leitura e sem ação de exclusão em massa,
    garantindo a integridade dos dados anônimos coletados.
    """

    actions = None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Avaliacao)
class AvaliacaoAdmin(ReadOnlyNoMassDeleteAdmin):
    list_display = ("id", "ciclo", "vinculo")
    list_filter = ("ciclo__escola", "ciclo")
    search_fields = ("id", "vinculo__disciplina__nome")


@admin.register(RespostaEscala)
class RespostaEscalaAdmin(ReadOnlyNoMassDeleteAdmin):
    list_display = ("id", "avaliacao", "pergunta", "valor")
    list_filter = ("pergunta__ciclo", "valor")


@admin.register(RespostaTexto)
class RespostaTextoAdmin(admin.ModelAdmin):
    list_display = ("id", "avaliacao", "pergunta", "status_moderacao")
    list_filter = ("status_moderacao", "pergunta__ciclo")
    search_fields = ("texto",)
    actions = None

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
