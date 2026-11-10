from rest_framework import serializers

from apps.avaliacoes.models import (
    CicloAvaliacao,
    ModeracaoStatus,
    Pergunta,
    RespostaTexto,
)
from apps.relatorios.models import ResumoVinculo


class CicloAvaliacaoCrudSerializer(serializers.ModelSerializer):
    class Meta:
        model = CicloAvaliacao
        fields = (
            "id",
            "nome",
            "escola",
            "abre_em",
            "fecha_em",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user and request.user.escola:
            attrs["escola"] = request.user.escola
        return attrs


class PerguntaCrudSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pergunta
        fields = ("id", "ciclo", "texto", "tipo", "dimensao", "ordem")
        read_only_fields = ("id",)


class ModeracaoComentarioSerializer(serializers.ModelSerializer):
    """
    Exibe comentários em texto SEM NENHUM dado de autoria e SEM timestamps/datas.
    """

    ciclo_nome = serializers.CharField(source="pergunta.ciclo.nome", read_only=True)
    disciplina_nome = serializers.CharField(source="pergunta.dimensao", read_only=True)

    class Meta:
        model = RespostaTexto
        fields = ("id", "texto", "status_moderacao", "ciclo_nome", "disciplina_nome")
        read_only_fields = ("id", "texto", "ciclo_nome", "disciplina_nome")


class ModerarComentarioUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RespostaTexto
        fields = ("status_moderacao",)

    def validate_status_moderacao(self, value):
        if value not in [ModeracaoStatus.APROVADO, ModeracaoStatus.REJEITADO]:
            raise serializers.ValidationError("Status de moderação deve ser APROVADO ou REJEITADO.")
        return value


class ResumoVinculoProfessorSerializer(serializers.ModelSerializer):
    disciplina_nome = serializers.CharField(source="vinculo.disciplina.nome", read_only=True)
    turma_nome = serializers.CharField(source="vinculo.turma.nome", read_only=True)
    comentarios = serializers.SerializerMethodField()

    class Meta:
        model = ResumoVinculo
        fields = (
            "id",
            "disciplina_nome",
            "turma_nome",
            "n_avaliacoes",
            "medias_por_dimensao",
            "media_geral",
            "limiar_atingido",
            "comentarios",
        )

    def get_comentarios(self, obj):
        # Injetado no contexto pela view com ordem aleatória
        comentarios_map = self.context.get("comentarios_map", {})
        return comentarios_map.get(obj.vinculo_id, [])
