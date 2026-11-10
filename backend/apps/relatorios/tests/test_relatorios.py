import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.factories import UsuarioFactory
from apps.accounts.models import RoleChoices
from apps.avaliacoes.factories import CicloAvaliacaoFactory, PerguntaFactory
from apps.avaliacoes.models import (
    Avaliacao,
    CicloStatus,
    ModeracaoStatus,
    PerguntaTipo,
    RespostaEscala,
    RespostaTexto,
)
from apps.escolas.factories import EscolaFactory, MatriculaFactory, TurmaFactory, VinculoFactory
from apps.relatorios.services import FechamentoCicloService


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def escola():
    # Limiar mínimo default 5
    return EscolaFactory(nome="Escola Primária", limiar_minimo=5)


@pytest.fixture
def turma(escola):
    return TurmaFactory(escola=escola)


@pytest.fixture
def coord(escola):
    return UsuarioFactory(role=RoleChoices.COORDENACAO, escola=escola)


@pytest.fixture
def prof_a(escola):
    return UsuarioFactory(role=RoleChoices.PROFESSOR, escola=escola)


@pytest.fixture
def prof_b(escola):
    return UsuarioFactory(role=RoleChoices.PROFESSOR, escola=escola)


@pytest.fixture
def vinculo_a(turma, prof_a):
    return VinculoFactory(turma=turma, professor=prof_a)


@pytest.fixture
def vinculo_b(turma, prof_b):
    return VinculoFactory(turma=turma, professor=prof_b)


@pytest.fixture
def ciclo(escola):
    return CicloAvaliacaoFactory(escola=escola, status=CicloStatus.ABERTO)


@pytest.fixture
def pergunta_escala(ciclo):
    return PerguntaFactory(
        ciclo=ciclo,
        tipo=PerguntaTipo.ESCALA_1_5,
        dimensao="Didática",
    )


@pytest.fixture
def pergunta_texto(ciclo):
    return PerguntaFactory(
        ciclo=ciclo,
        tipo=PerguntaTipo.TEXTO,
        dimensao="Comentários",
    )


def criar_avaliacoes_para_vinculo(ciclo, vinculo, n, pergunta_escala, pergunta_texto=None):
    """
    Cria N avaliações anônimas para o vínculo especificado.
    """
    for i in range(n):
        av = Avaliacao.objects.create(ciclo=ciclo, vinculo=vinculo)
        RespostaEscala.objects.create(avaliacao=av, pergunta=pergunta_escala, valor=5)
        if pergunta_texto:
            RespostaTexto.objects.create(
                avaliacao=av,
                pergunta=pergunta_texto,
                texto=f"Comentario {i} para {vinculo.professor.username}",
                status_moderacao=ModeracaoStatus.APROVADO,
            )


# ==============================================================================
# TESTES DE RELATÓRIOS E LIMIAR
# ==============================================================================


@pytest.mark.django_db
def test_abaixo_do_limiar_nada_eh_retornado_ao_professor(
    api_client, escola, ciclo, vinculo_a, prof_a, pergunta_escala, pergunta_texto
):
    # Escola tem limiar_minimo=5, vamos criar apenas 4 avaliações (abaixo do limiar)
    criar_avaliacoes_para_vinculo(ciclo, vinculo_a, 4, pergunta_escala, pergunta_texto)

    # Fecha e publica o ciclo
    FechamentoCicloService.fechar_e_gerar_resumos(ciclo)
    ciclo.status = CicloStatus.PUBLICADO
    ciclo.save()

    api_client.force_authenticate(user=prof_a)
    url = f"{reverse('professor-resultados')}?ciclo={ciclo.id}"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data["resultados"]) == 0  # Nenhum resultado porque limiar_atingido=False


@pytest.mark.django_db
def test_acima_ou_igual_ao_limiar_retorna_resultados(
    api_client, escola, ciclo, vinculo_a, prof_a, pergunta_escala, pergunta_texto
):
    # 5 avaliações (atinge exatamente o limiar 5)
    criar_avaliacoes_para_vinculo(ciclo, vinculo_a, 5, pergunta_escala, pergunta_texto)

    FechamentoCicloService.fechar_e_gerar_resumos(ciclo)
    ciclo.status = CicloStatus.PUBLICADO
    ciclo.save()

    api_client.force_authenticate(user=prof_a)
    url = f"{reverse('professor-resultados')}?ciclo={ciclo.id}"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data["resultados"]) == 1
    resultado = response.data["resultados"][0]
    assert resultado["n_avaliacoes"] == 5
    assert resultado["limiar_atingido"] is True
    assert resultado["medias_por_dimensao"]["Didática"] == 5.0
    assert len(resultado["comentarios"]) == 5


@pytest.mark.django_db
def test_ciclo_aberto_ou_fechado_nao_retorna_resultados_ao_professor(
    api_client, ciclo, vinculo_a, prof_a, pergunta_escala
):
    criar_avaliacoes_para_vinculo(ciclo, vinculo_a, 6, pergunta_escala)

    api_client.force_authenticate(user=prof_a)
    url = f"{reverse('professor-resultados')}?ciclo={ciclo.id}"

    # Ciclo ainda ABERTO -> 403 Forbidden
    response_aberto = api_client.get(url)
    assert response_aberto.status_code == status.HTTP_403_FORBIDDEN

    # Ciclo FECHADO mas não PUBLICADO -> 403 Forbidden
    FechamentoCicloService.fechar_e_gerar_resumos(ciclo)
    response_fechado = api_client.get(url)
    assert response_fechado.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_professor_a_nao_ve_resultados_do_professor_b(
    api_client, ciclo, vinculo_a, vinculo_b, prof_a, prof_b, pergunta_escala
):
    # 6 avaliações para Prof A e 6 para Prof B
    criar_avaliacoes_para_vinculo(ciclo, vinculo_a, 6, pergunta_escala)
    criar_avaliacoes_para_vinculo(ciclo, vinculo_b, 6, pergunta_escala)

    FechamentoCicloService.fechar_e_gerar_resumos(ciclo)
    ciclo.status = CicloStatus.PUBLICADO
    ciclo.save()

    api_client.force_authenticate(user=prof_a)
    url = f"{reverse('professor-resultados')}?ciclo={ciclo.id}"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data["resultados"]) == 1
    # Verifica que o resultado exibido pertence apenas ao vinculo_a
    assert response.data["resultados"][0]["turma_nome"] == vinculo_a.turma.nome


@pytest.mark.django_db
def test_comentarios_nao_aprovados_sao_omitidos_do_professor(
    api_client, ciclo, vinculo_a, prof_a, pergunta_escala, pergunta_texto
):
    # 5 avaliações com textos: 3 aprovados, 1 pendente, 1 rejeitado
    for i in range(5):
        av = Avaliacao.objects.create(ciclo=ciclo, vinculo=vinculo_a)
        RespostaEscala.objects.create(avaliacao=av, pergunta=pergunta_escala, valor=5)

        status_mod = (
            ModeracaoStatus.APROVADO
            if i < 3
            else (ModeracaoStatus.PENDENTE if i == 3 else ModeracaoStatus.REJEITADO)
        )
        RespostaTexto.objects.create(
            avaliacao=av,
            pergunta=pergunta_texto,
            texto=f"Comentário {i}",
            status_moderacao=status_mod,
        )

    FechamentoCicloService.fechar_e_gerar_resumos(ciclo)
    ciclo.status = CicloStatus.PUBLICADO
    ciclo.save()

    api_client.force_authenticate(user=prof_a)
    url = f"{reverse('professor-resultados')}?ciclo={ciclo.id}"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    comentarios = response.data["resultados"][0]["comentarios"]
    assert len(comentarios) == 3
    # Nenhuma data ou timestamp presente
    for c in comentarios:
        assert "created_at" not in c
        assert "data" not in c


# ==============================================================================
# TESTES DE COORDENAÇÃO (ADESÃO E MODERAÇÃO)
# ==============================================================================


@pytest.mark.django_db
def test_coordenacao_participacao_taxa_agregada(api_client, coord, ciclo, turma, vinculo_a):
    # 2 alunos matriculados na turma
    aluno1 = UsuarioFactory(role=RoleChoices.ALUNO, escola=coord.escola)
    aluno2 = UsuarioFactory(role=RoleChoices.ALUNO, escola=coord.escola)
    MatriculaFactory(aluno=aluno1, turma=turma)
    MatriculaFactory(aluno=aluno2, turma=turma)

    # Apenas aluno1 avalia
    from apps.avaliacoes.models import Participacao

    Participacao.objects.create(aluno=aluno1, ciclo=ciclo, vinculo=vinculo_a)

    api_client.force_authenticate(user=coord)
    url = f"{reverse('coordenacao-participacao')}?ciclo={ciclo.id}"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    turmas = response.data["turmas"]
    assert len(turmas) >= 1
    dados_turma = next(t for t in turmas if t["turma_id"] == turma.id)
    assert dados_turma["total_alunos"] == 2
    assert dados_turma["alunos_responderam"] == 1
    assert dados_turma["taxa_adesao_percentual"] == 50.0
    # Nunca retorna nomes de alunos
    assert "alunos" not in dados_turma


@pytest.mark.django_db
def test_coordenacao_moderacao_comentarios(api_client, coord, ciclo, vinculo_a, pergunta_texto):
    av = Avaliacao.objects.create(ciclo=ciclo, vinculo=vinculo_a)
    coment = RespostaTexto.objects.create(
        avaliacao=av,
        pergunta=pergunta_texto,
        texto="Comentário para moderação",
        status_moderacao=ModeracaoStatus.PENDENTE,
    )

    api_client.force_authenticate(user=coord)

    # 1. Listar comentários pendentes
    url_list = reverse("coordenacao-comentarios")
    res_list = api_client.get(url_list)
    assert res_list.status_code == status.HTTP_200_OK
    assert len(res_list.data) == 1
    assert res_list.data[0]["id"] == coment.id
    assert res_list.data[0]["status_moderacao"] == ModeracaoStatus.PENDENTE
    # Sem dados de aluno ou data
    assert "aluno" not in res_list.data[0]
    assert "created_at" not in res_list.data[0]

    # 2. Aprovar comentário
    url_patch = reverse("coordenacao-comentario-moderar", kwargs={"pk": coment.id})
    res_patch = api_client.patch(url_patch, {"status_moderacao": ModeracaoStatus.APROVADO})
    assert res_patch.status_code == status.HTTP_200_OK

    coment.refresh_from_db()
    assert coment.status_moderacao == ModeracaoStatus.APROVADO
