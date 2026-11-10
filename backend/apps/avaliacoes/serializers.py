from rest_framework import serializers

from apps.avaliacoes.models import (
    CicloAvaliacao,
    Pergunta,
    PerguntaTipo,
)
from apps.escolas.models import Vinculo


class PerguntaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pergunta
        fields = ("id", "texto", "tipo", "dimensao", "ordem")


class CicloAvaliacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CicloAvaliacao
        fields = ("id", "nome", "status", "abre_em", "fecha_em", "escola")


class VinculoPendenteSerializer(serializers.ModelSerializer):
    professor_nome = serializers.SerializerMethodField()
    disciplina_nome = serializers.CharField(source="disciplina.nome")
    turma_nome = serializers.CharField(source="turma.nome")

    class Meta:
        model = Vinculo
        fields = ("id", "professor_nome", "disciplina_nome", "turma_nome")

    def get_professor_nome(self, obj):
        return obj.professor.get_full_name() or obj.professor.username


class RespostaEscalaInputSerializer(serializers.Serializer):
    pergunta_id = serializers.IntegerField()
    valor = serializers.IntegerField(min_value=1, max_value=5)


class RespostaTextoInputSerializer(serializers.Serializer):
    pergunta_id = serializers.IntegerField()
    texto = serializers.CharField(allow_blank=False, trim_whitespace=True)


class EnviarAvaliacaoSerializer(serializers.Serializer):
    ciclo_id = serializers.IntegerField()
    vinculo_id = serializers.IntegerField()
    respostas_escala = RespostaEscalaInputSerializer(many=True, required=False)
    respostas_texto = RespostaTextoInputSerializer(many=True, required=False)

    def validate(self, attrs):
        ciclo_id = attrs.get("ciclo_id")
        respostas_escala = attrs.get("respostas_escala", [])
        respostas_texto = attrs.get("respostas_texto", [])

        # Valida que as perguntas pertencem de fato ao ciclo
        todas_perguntas = {p.id: p for p in Pergunta.objects.filter(ciclo_id=ciclo_id)}

        for item in respostas_escala:
            pid = item["pergunta_id"]
            if pid not in todas_perguntas:
                raise serializers.ValidationError(
                    f"Pergunta {pid} não pertence ao ciclo {ciclo_id}."
                )
            if todas_perguntas[pid].tipo != PerguntaTipo.ESCALA_1_5:
                raise serializers.ValidationError(
                    f"Pergunta {pid} é do tipo texto, não escala numérica."
                )

        for item in respostas_texto:
            pid = item["pergunta_id"]
            if pid not in todas_perguntas:
                raise serializers.ValidationError(
                    f"Pergunta {pid} não pertence ao ciclo {ciclo_id}."
                )
            if todas_perguntas[pid].tipo != PerguntaTipo.TEXTO:
                raise serializers.ValidationError(
                    f"Pergunta {pid} é do tipo escala, não texto livre."
                )

        return attrs
