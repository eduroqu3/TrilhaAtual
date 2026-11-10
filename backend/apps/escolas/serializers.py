from rest_framework import serializers

from apps.escolas.models import Disciplina, Escola, Matricula, Turma, Vinculo


class EscolaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escola
        fields = ("id", "nome", "limiar_minimo", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class TurmaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turma
        fields = ("id", "nome", "ano_letivo", "escola")
        read_only_fields = ("id",)


class DisciplinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disciplina
        fields = ("id", "nome", "codigo", "escola")
        read_only_fields = ("id",)


class MatriculaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Matricula
        fields = ("id", "aluno", "turma", "created_at")
        read_only_fields = ("id", "created_at")


class VinculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vinculo
        fields = ("id", "professor", "turma", "disciplina", "ativo")
        read_only_fields = ("id",)
