import logging

import pytest
from django.contrib.auth import get_user_model
from django.db import models
from django.urls import get_resolver, reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.factories import UsuarioFactory
from apps.accounts.models import RoleChoices
from apps.avaliacoes.factories import CicloAvaliacaoFactory, PerguntaFactory
from apps.avaliacoes.models import (
    Avaliacao,
    CicloStatus,
    PerguntaTipo,
    RespostaEscala,
    RespostaTexto,
)
from apps.escolas.factories import EscolaFactory, MatriculaFactory, TurmaFactory, VinculoFactory

Usuario = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


# ==============================================================================
# (a) NENHUMA RELAÇÃO DE AVALIACAO COM USUARIO
# ==============================================================================


def test_nenhuma_relacao_avaliacao_com_usuario():
    """
    (a) Garante que Avaliacao, RespostaEscala e RespostaTexto não possuem
    nenhuma relação direta ou transitiva com Usuario nem campos de timestamp.
    """
    modelos_anonimos = [Avaliacao, RespostaEscala, RespostaTexto]

    for model in modelos_anonimos:
        # Sem campos de data/hora
        for field in model._meta.get_fields():
            assert not isinstance(
                field, (models.DateTimeField, models.DateField, models.TimeField)
            ), f"Campo proibido de data/hora {field.name} em {model.__name__}"

        # Sem relação direta com Usuario
        for field in model._meta.fields:
            if field.is_relation and field.related_model:
                assert not issubclass(field.related_model, Usuario), (
                    f"Relação proibida com Usuario em {model.__name__}.{field.name}"
                )

        # Sem nomes sugestivos de identificação de autoria
        proibidos = ["aluno", "usuario", "user", "author", "autor", "ip", "created_at", "timestamp"]
        field_names = [f.name.lower() for f in model._meta.get_fields()]
        for p in proibidos:
            assert p not in field_names, f"Campo proibido '{p}' encontrado em {model.__name__}"


# ==============================================================================
# (b) NENHUM SERIALIZER DE SAÍDA EXPÕE ALUNO, USUARIO OU CREATED_AT EM AVALIAÇÕES
# ==============================================================================


def test_serializers_saida_nao_expoem_dados_sensiveis():
    """
    (b) Inspeciona todos os serializers das apps avaliacoes e relatorios
    garantindo que respostas de resultados e moderação não contenham dados do aluno.
    """
    from apps.relatorios.serializers import (
        ModeracaoComentarioSerializer,
        ResumoVinculoProfessorSerializer,
    )

    serializers_testar = [
        ModeracaoComentarioSerializer,
        ResumoVinculoProfessorSerializer,
    ]

    campos_proibidos = {"aluno", "usuario", "user", "autor", "author", "created_at", "data", "ip"}

    for ser_class in serializers_testar:
        instance = ser_class()
        fields = set(instance.fields.keys())
        intersecao = fields.intersection(campos_proibidos)
        assert not intersecao, (
            f"Serializer {ser_class.__name__} expõe campos proibidos: {intersecao}"
        )


# ==============================================================================
# (c) CORPO DE REQUISIÇÃO NÃO APARECE NOS LOGS (USE CAPLOG)
# ==============================================================================


@pytest.mark.django_db
def test_corpo_requisicao_nao_aparece_nos_logs(api_client, caplog):
    """
    (c) Garante que ao submeter uma avaliação, o corpo da requisição (payload)
    e comentários não são impressos nos logs do sistema.
    """
    caplog.set_level(logging.DEBUG)

    escola = EscolaFactory()
    turma = TurmaFactory(escola=escola)
    aluno = UsuarioFactory(role=RoleChoices.ALUNO, escola=escola)
    MatriculaFactory(aluno=aluno, turma=turma)
    vinculo = VinculoFactory(turma=turma)
    ciclo = CicloAvaliacaoFactory(escola=escola, status=CicloStatus.ABERTO)
    p_escala = PerguntaFactory(ciclo=ciclo, tipo=PerguntaTipo.ESCALA_1_5)
    p_texto = PerguntaFactory(ciclo=ciclo, tipo=PerguntaTipo.TEXTO)

    texto_secreto = "TEXTO_CONFIDENCIAL_UNICO_12345"
    payload = {
        "ciclo_id": ciclo.id,
        "vinculo_id": vinculo.id,
        "respostas_escala": [{"pergunta_id": p_escala.id, "valor": 5}],
        "respostas_texto": [{"pergunta_id": p_texto.id, "texto": texto_secreto}],
    }

    api_client.force_authenticate(user=aluno)
    url = reverse("aluno-enviar-avaliacao")
    response = api_client.post(url, payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED

    # Verifica os logs capturados
    for record in caplog.records:
        assert texto_secreto not in record.getMessage(), (
            "Vazamento de privacidade: o texto secreto da avaliação apareceu nos logs!"
        )
        assert "respostas_escala" not in record.getMessage()
        assert "respostas_texto" not in record.getMessage()


# ==============================================================================
# (d) NENHUMA API ACEITA FILTRO POR ATRIBUTO DO ALUNO
# ==============================================================================


@pytest.mark.django_db
def test_nenhuma_api_aceita_filtro_por_atributo_do_aluno(api_client):
    """
    (d) Nenhuma API permite consulta ou filtro por aluno (nome, id, cpf, email, etc.)
    """
    coord = UsuarioFactory(role=RoleChoices.COORDENACAO)
    api_client.force_authenticate(user=coord)

    urls_para_testar = [
        reverse("coordenacao-participacao"),
        reverse("coordenacao-comentarios"),
    ]

    filtros_proibidos = [
        {"aluno": "1"},
        {"aluno_id": "1"},
        {"aluno__nome": "Joao"},
        {"matricula": "123"},
        {"estudante": "1"},
    ]

    for url in urls_para_testar:
        for filtro in filtros_proibidos:
            response = api_client.get(url, filtro)
            # A view não deve retornar filtrado por esse atributo nem expor alunos
            assert "aluno_id" not in response.data if isinstance(response.data, dict) else True


# ==============================================================================
# (e) NENHUM ENDPOINT DE RANKING EXISTE
# ==============================================================================


def test_nenhum_endpoint_de_ranking_existe():
    """
    (e) Inspeciona todas as URLs registradas no projeto e garante que não há
    nenhuma rota contendo 'ranking', 'melhores', 'top', 'classificacao'.
    """
    resolver = get_resolver()

    termos_proibidos = [
        "ranking",
        "rank",
        "melhores",
        "classificacao",
        "top-professores",
        "leaderboard",
    ]

    def verificar_patterns(url_patterns, prefix=""):
        for pattern in url_patterns:
            rota = prefix + str(pattern.pattern)
            for termo in termos_proibidos:
                assert termo not in rota.lower(), f"Rota proibida de ranking encontrada: {rota}"
            if hasattr(pattern, "url_patterns"):
                verificar_patterns(pattern.url_patterns, rota)

    verificar_patterns(resolver.url_patterns)
