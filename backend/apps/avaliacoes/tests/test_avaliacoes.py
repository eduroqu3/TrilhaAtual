import pytest
from django.contrib.auth import get_user_model
from django.db import models
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.factories import UsuarioFactory
from apps.accounts.models import RoleChoices
from apps.avaliacoes.factories import CicloAvaliacaoFactory, PerguntaFactory
from apps.avaliacoes.models import (
    Avaliacao,
    CicloStatus,
    Participacao,
    PerguntaTipo,
    RespostaEscala,
    RespostaTexto,
)
from apps.escolas.factories import EscolaFactory, MatriculaFactory, TurmaFactory, VinculoFactory

Usuario = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def escola():
    return EscolaFactory(nome="Escola Modelo")


@pytest.fixture
def turma(escola):
    return TurmaFactory(escola=escola, nome="Turma 101")


@pytest.fixture
def turma_outra(escola):
    return TurmaFactory(escola=escola, nome="Turma 102")


@pytest.fixture
def aluno(escola, turma):
    user = UsuarioFactory(role=RoleChoices.ALUNO, escola=escola)
    MatriculaFactory(aluno=user, turma=turma)
    return user


@pytest.fixture
def vinculo(escola, turma):
    return VinculoFactory(turma=turma)


@pytest.fixture
def vinculo_outra_turma(escola, turma_outra):
    return VinculoFactory(turma=turma_outra)


@pytest.fixture
def ciclo_aberto(escola):
    return CicloAvaliacaoFactory(escola=escola, status=CicloStatus.ABERTO)


@pytest.fixture
def ciclo_fechado(escola):
    return CicloAvaliacaoFactory(escola=escola, status=CicloStatus.FECHADO)


@pytest.fixture
def perguntas(ciclo_aberto):
    p1 = PerguntaFactory(
        ciclo=ciclo_aberto,
        tipo=PerguntaTipo.ESCALA_1_5,
        dimensao="Didática",
        ordem=1,
    )
    p2 = PerguntaFactory(
        ciclo=ciclo_aberto,
        tipo=PerguntaTipo.TEXTO,
        dimensao="Geral",
        ordem=2,
    )
    return p1, p2


# ==============================================================================
# TESTE DE ARQUITETURA E ANONIMATO
# ==============================================================================


def test_introspeccao_anonimato_inegociavel():
    """
    REGRA INEGOCIÁVEL:
    FALHA se Avaliacao, RespostaEscala ou RespostaTexto tiverem qualquer relação
    (direta ou transitiva) com Usuario ou qualquer campo de data/hora.
    """
    models_anonimos = [Avaliacao, RespostaEscala, RespostaTexto]

    for model in models_anonimos:
        # 1. Verifica campos de data/hora (DateTimeField, DateField, TimeField)
        for field in model._meta.get_fields():
            assert not isinstance(
                field, (models.DateTimeField, models.DateField, models.TimeField)
            ), f"O modelo {model.__name__} contém campo de data/hora proibido: {field.name}"

        # 2. Verifica relações diretas com Usuario
        for field in model._meta.fields:
            if field.is_relation and field.related_model:
                msg = f"{model.__name__} tem relação com Usuario: {field.name}"
                assert not issubclass(field.related_model, Usuario), msg

        # 3. Verifica relações transitivas/reversas
        # Nem Avaliacao, nem RespostaEscala, nem RespostaTexto podem ter campo aluno/usuario
        field_names = [f.name.lower() for f in model._meta.get_fields()]
        assert "aluno" not in field_names, f"{model.__name__} tem referência a 'aluno'"
        assert "usuario" not in field_names, f"{model.__name__} tem referência a 'usuario'"
        assert "user" not in field_names, f"{model.__name__} tem referência a 'user'"
        assert "created_at" not in field_names, f"{model.__name__} tem 'created_at'"
        assert "timestamp" not in field_names, f"{model.__name__} tem 'timestamp'"


# ==============================================================================
# TESTES DE FLUXO DE AVALIAÇÃO DO ALUNO
# ==============================================================================


@pytest.mark.django_db
def test_aluno_pendencias(api_client, aluno, ciclo_aberto, vinculo):
    api_client.force_authenticate(user=aluno)
    url = reverse("aluno-pendencias")
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["ciclo_id"] == ciclo_aberto.id
    assert len(response.data[0]["vinculos"]) == 1
    assert response.data[0]["vinculos"][0]["id"] == vinculo.id


@pytest.mark.django_db
def test_aluno_questionario(api_client, aluno, ciclo_aberto, vinculo, perguntas):
    api_client.force_authenticate(user=aluno)
    url = reverse(
        "aluno-questionario",
        kwargs={"ciclo_id": ciclo_aberto.id, "vinculo_id": vinculo.id},
    )
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data["perguntas"]) == 2


@pytest.mark.django_db
def test_envio_avaliacao_valido(api_client, aluno, ciclo_aberto, vinculo, perguntas):
    p1, p2 = perguntas
    api_client.force_authenticate(user=aluno)
    url = reverse("aluno-enviar-avaliacao")

    payload = {
        "ciclo_id": ciclo_aberto.id,
        "vinculo_id": vinculo.id,
        "respostas_escala": [{"pergunta_id": p1.id, "valor": 5}],
        "respostas_texto": [{"pergunta_id": p2.id, "texto": "Ótima explicação!"}],
    }

    response = api_client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED

    # Verifica gravação atômica: Participacao e Avaliacao criadas
    assert Participacao.objects.filter(aluno=aluno, ciclo=ciclo_aberto, vinculo=vinculo).exists()
    assert Avaliacao.objects.filter(ciclo=ciclo_aberto, vinculo=vinculo).exists()
    assert RespostaEscala.objects.filter(pergunta=p1, valor=5).exists()
    assert RespostaTexto.objects.filter(pergunta=p2, texto="Ótima explicação!").exists()


@pytest.mark.django_db
def test_envio_avaliacao_duplicada_retorna_409_sem_criar_nada(
    api_client, aluno, ciclo_aberto, vinculo, perguntas
):
    p1, p2 = perguntas
    api_client.force_authenticate(user=aluno)
    url = reverse("aluno-enviar-avaliacao")

    payload = {
        "ciclo_id": ciclo_aberto.id,
        "vinculo_id": vinculo.id,
        "respostas_escala": [{"pergunta_id": p1.id, "valor": 4}],
    }

    # Primeiro envio -> 201
    res1 = api_client.post(url, payload, format="json")
    assert res1.status_code == status.HTTP_201_CREATED

    total_avaliacoes = Avaliacao.objects.count()
    total_participacoes = Participacao.objects.count()

    # Segundo envio duplicado -> 409 Conflict
    res2 = api_client.post(url, payload, format="json")
    assert res2.status_code == status.HTTP_409_CONFLICT

    # Nada mais foi criado
    assert Avaliacao.objects.count() == total_avaliacoes
    assert Participacao.objects.count() == total_participacoes


@pytest.mark.django_db
def test_envio_avaliacao_ciclo_fechado_retorna_400(api_client, aluno, ciclo_fechado, vinculo):
    api_client.force_authenticate(user=aluno)
    url = reverse("aluno-enviar-avaliacao")

    payload = {
        "ciclo_id": ciclo_fechado.id,
        "vinculo_id": vinculo.id,
        "respostas_escala": [],
    }

    response = api_client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "não está aberto" in response.data["detail"]


@pytest.mark.django_db
def test_envio_avaliacao_aluno_de_outra_turma_retorna_403(
    api_client, aluno, ciclo_aberto, vinculo_outra_turma
):
    api_client.force_authenticate(user=aluno)
    url = reverse("aluno-enviar-avaliacao")

    payload = {
        "ciclo_id": ciclo_aberto.id,
        "vinculo_id": vinculo_outra_turma.id,
        "respostas_escala": [],
    }

    response = api_client.post(url, payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "não está matriculado" in response.data["detail"]
