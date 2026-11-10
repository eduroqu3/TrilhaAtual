"""
Teste de validação de fluxo ponta a ponta (E2E) com dados do seed_demo.
Cobre:
1. Login por papel (ALUNO, COORDENACAO, PROFESSOR)
2. Consulta de pendências do aluno
3. Aluno responde avaliação com sucesso
4. Tentativa de avaliação duplicada bloqueada com 409
5. Coordenação visualiza adesão agregada por turma (sem nomes)
6. Coordenação modera comentário pedagógico
7. Coordenação fecha ciclo e publica resultados
8. Professor consulta resultados publicados com limiar atingido
9. Logout limpa sessão
"""

import pytest
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_fluxo_completo_ponta_a_ponta(settings):
    settings.TESTING = True
    client = APIClient()

    # 1. Executa seed_demo
    call_command("seed_demo")

    # 2. Login como ALUNO (aluno6.demo possui pendências)
    res_login_aluno = client.post(
        "/api/auth/login/",
        {"username": "aluno6.demo", "password": "demo1234"},
    )
    assert res_login_aluno.status_code == status.HTTP_200_OK
    assert "access_token" in res_login_aluno.cookies

    # GET /api/auth/me/
    res_me_aluno = client.get("/api/auth/me/")
    assert res_me_aluno.status_code == status.HTTP_200_OK
    assert res_me_aluno.data["role"] == "ALUNO"

    # GET /api/aluno/pendencias/
    res_pendencias = client.get("/api/aluno/pendencias/")
    assert res_pendencias.status_code == status.HTTP_200_OK
    assert len(res_pendencias.data) > 0
    ciclo_id = res_pendencias.data[0]["ciclo_id"]
    vinculo_id = res_pendencias.data[0]["vinculos"][0]["id"]

    # GET questionário
    res_quest = client.get(f"/api/aluno/ciclos/{ciclo_id}/vinculos/{vinculo_id}/questionario/")
    assert res_quest.status_code == status.HTTP_200_OK
    p_escala = [p for p in res_quest.data["perguntas"] if p["tipo"] == "ESCALA_1_5"]
    p_texto = [p for p in res_quest.data["perguntas"] if p["tipo"] == "TEXTO"]

    # POST /api/aluno/avaliacoes/
    payload_avaliacao = {
        "ciclo_id": ciclo_id,
        "vinculo_id": vinculo_id,
        "respostas_escala": [{"pergunta_id": p["id"], "valor": 5} for p in p_escala],
        "respostas_texto": [
            {"pergunta_id": p_texto[0]["id"], "texto": "Excelente metodologia de ensino."}
        ],
    }
    res_envio = client.post("/api/aluno/avaliacoes/", payload_avaliacao, format="json")
    assert res_envio.status_code == status.HTTP_201_CREATED

    # Tentativa de duplicata -> 409 Conflict
    res_duplicata = client.post("/api/aluno/avaliacoes/", payload_avaliacao, format="json")
    assert res_duplicata.status_code == status.HTTP_409_CONFLICT

    # Logout do aluno
    client.post("/api/auth/logout/")

    # 3. Login como COORDENACAO
    client = APIClient()
    res_login_coord = client.post(
        "/api/auth/login/",
        {"username": "coord.demo", "password": "demo1234"},
    )
    assert res_login_coord.status_code == status.HTTP_200_OK

    res_me_coord = client.get("/api/auth/me/")
    assert res_me_coord.data["role"] == "COORDENACAO"

    # GET /api/coordenacao/participacao/ -> adesão agregada sem nomes
    res_part = client.get(f"/api/coordenacao/participacao/?ciclo={ciclo_id}")
    assert res_part.status_code == status.HTTP_200_OK
    assert len(res_part.data["turmas"]) > 0
    # Verifica que nomes de alunos não existem na estrutura
    assert "alunos" not in res_part.data["turmas"][0]

    # Fila de moderação
    res_comentarios = client.get("/api/coordenacao/comentarios/?status=PENDENTE")
    assert res_comentarios.status_code == status.HTTP_200_OK
    assert len(res_comentarios.data) > 0
    comentario_id = res_comentarios.data[0]["id"]

    # Modera comentário -> APROVADO
    res_mod = client.patch(
        f"/api/coordenacao/comentarios/{comentario_id}/",
        {"status_moderacao": "APROVADO"},
    )
    assert res_mod.status_code == status.HTTP_200_OK

    # Fecha e Publica o ciclo
    res_fechar = client.post(f"/api/coordenacao/ciclos/{ciclo_id}/fechar/")
    assert res_fechar.status_code == status.HTTP_200_OK

    res_publicar = client.post(f"/api/coordenacao/ciclos/{ciclo_id}/publicar/")
    assert res_publicar.status_code == status.HTTP_200_OK

    # Logout da coordenação
    client.post("/api/auth/logout/")

    # 4. Login como PROFESSOR
    client = APIClient()
    res_login_prof = client.post(
        "/api/auth/login/",
        {"username": "prof.matematica", "password": "demo1234"},
    )
    assert res_login_prof.status_code == status.HTTP_200_OK

    res_me_prof = client.get("/api/auth/me/")
    assert res_me_prof.data["role"] == "PROFESSOR"

    # GET /api/professor/resultados/?ciclo=
    res_resultados = client.get(f"/api/professor/resultados/?ciclo={ciclo_id}")
    assert res_resultados.status_code == status.HTTP_200_OK
    assert len(res_resultados.data["resultados"]) == 1
    res_prof_data = res_resultados.data["resultados"][0]
    assert res_prof_data["limiar_atingido"] is True
    assert "Didática e Clareza" in res_prof_data["medias_por_dimensao"]
    assert len(res_prof_data["comentarios"]) > 0
    # Comentários sem data ou autoria
    for c in res_prof_data["comentarios"]:
        assert "created_at" not in c
        assert "aluno" not in c

    # 5. Logout final
    res_logout = client.post("/api/auth/logout/")
    assert res_logout.status_code == status.HTTP_200_OK
