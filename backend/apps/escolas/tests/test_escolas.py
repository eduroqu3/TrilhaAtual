import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.factories import UsuarioFactory
from apps.accounts.models import RoleChoices, Usuario
from apps.escolas.factories import EscolaFactory, TurmaFactory
from apps.escolas.models import Turma, Vinculo


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def escola_a():
    return EscolaFactory(nome="Escola Alfa")


@pytest.fixture
def escola_b():
    return EscolaFactory(nome="Escola Beta")


@pytest.fixture
def aluno_a(escola_a):
    return UsuarioFactory(role=RoleChoices.ALUNO, escola=escola_a)


@pytest.fixture
def prof_a(escola_a):
    return UsuarioFactory(role=RoleChoices.PROFESSOR, escola=escola_a)


@pytest.fixture
def coord_a(escola_a):
    return UsuarioFactory(role=RoleChoices.COORDENACAO, escola=escola_a)


@pytest.fixture
def admin_global():
    return UsuarioFactory(role=RoleChoices.ADMIN, escola=None)


@pytest.mark.django_db
def test_usuario_nao_admin_sem_escola_levanta_validacao():
    user = Usuario(username="sem_escola", role=RoleChoices.ALUNO, escola=None)
    with pytest.raises(ValidationError):
        user.clean()


@pytest.mark.django_db
def test_admin_sem_escola_eh_valido():
    admin = Usuario(username="admin_global", role=RoleChoices.ADMIN, escola=None)
    admin.clean()


@pytest.mark.django_db
def test_isolamento_de_queryset_entre_escolas(api_client, escola_a, escola_b, aluno_a):
    turma_a = TurmaFactory(escola=escola_a, nome="Turma Alfa 1")
    turma_b = TurmaFactory(escola=escola_b, nome="Turma Beta 1")

    api_client.force_authenticate(user=aluno_a)

    url = reverse("turma-list")
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    turma_ids = [t["id"] for t in response.data]
    assert turma_a.id in turma_ids
    assert turma_b.id not in turma_ids


@pytest.mark.django_db
def test_admin_global_acessa_todas_as_escolas(api_client, escola_a, escola_b, admin_global):
    turma_a = TurmaFactory(escola=escola_a)
    turma_b = TurmaFactory(escola=escola_b)

    api_client.force_authenticate(user=admin_global)

    url = reverse("turma-list")
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    turma_ids = [t["id"] for t in response.data]
    assert turma_a.id in turma_ids
    assert turma_b.id in turma_ids


@pytest.mark.django_db
def test_permissoes_importacao_csv(api_client, aluno_a, prof_a, coord_a, admin_global, escola_a):
    url = reverse("escolas-importar")
    csv_content = b"tipo,username,nome,turma\nALUNO,aluno_novo,Novo Aluno,1A"
    arquivo = SimpleUploadedFile("dados.csv", csv_content, content_type="text/csv")

    # Aluno tenta importar -> 403 Forbidden
    api_client.force_authenticate(user=aluno_a)
    res = api_client.post(url, {"arquivo": arquivo}, format="multipart")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # Professor tenta importar -> 403 Forbidden
    api_client.force_authenticate(user=prof_a)
    arquivo.seek(0)
    res = api_client.post(url, {"arquivo": arquivo}, format="multipart")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # Coordenação consegue importar -> 201 Created
    api_client.force_authenticate(user=coord_a)
    arquivo.seek(0)
    res = api_client.post(url, {"arquivo": arquivo}, format="multipart")
    assert res.status_code == status.HTTP_201_CREATED
    assert res.data["sucesso"] is True
    assert res.data["criados"]["alunos"] == 1


@pytest.mark.django_db
def test_importacao_csv_valida_completa(api_client, coord_a, escola_a):
    api_client.force_authenticate(user=coord_a)
    url = reverse("escolas-importar")

    csv_data = (
        "tipo,username,nome,sobrenome,turma,disciplina\n"
        "TURMA,,,,3A,\n"
        "DISCIPLINA,,Matematica,,,\n"
        "PROFESSOR,prof_carlos,Carlos,Silva,,\n"
        "ALUNO,aluno_joao,Joao,Santos,3A,\n"
        "VINCULO,prof_carlos,,,3A,Matematica\n"
    ).encode("utf-8")

    arquivo = SimpleUploadedFile("dados_completos.csv", csv_data, content_type="text/csv")
    res = api_client.post(url, {"arquivo": arquivo}, format="multipart")

    assert res.status_code == status.HTTP_201_CREATED
    assert res.data["sucesso"] is True
    assert res.data["criados"]["turmas"] >= 1
    assert res.data["criados"]["professores"] == 1
    assert res.data["criados"]["alunos"] == 1
    assert res.data["criados"]["vinculos"] == 1
    assert res.data["criados"]["matriculas"] == 1

    assert Usuario.objects.filter(username="aluno_joao", escola=escola_a).exists()
    assert Usuario.objects.filter(username="prof_carlos", escola=escola_a).exists()
    assert Turma.objects.filter(nome="3A", escola=escola_a).exists()
    assert Vinculo.objects.filter(
        professor__username="prof_carlos",
        turma__nome="3A",
        disciplina__nome="Matematica",
    ).exists()


@pytest.mark.django_db
def test_importacao_csv_invalida_retorna_relatorio_de_erros(api_client, coord_a, escola_a):
    api_client.force_authenticate(user=coord_a)
    url = reverse("escolas-importar")

    csv_data = (
        "tipo,username,nome,turma\n"
        "ALUNO,,Aluno Sem Username,1A\n"
        "TIPO_INEXISTENTE,usuario1,Nome,1A\n"
    ).encode("utf-8")

    arquivo = SimpleUploadedFile("dados_invalidos.csv", csv_data, content_type="text/csv")
    res = api_client.post(url, {"arquivo": arquivo}, format="multipart")

    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.data["sucesso"] is False
    assert len(res.data["erros"]) == 2
    assert "Linha 2" in res.data["erros"][0]
    assert "Campo 'username' obrigatório" in res.data["erros"][0]
    assert "Linha 3" in res.data["erros"][1]
    assert "desconhecido" in res.data["erros"][1]
