import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.factories import UsuarioFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return UsuarioFactory(username="aluno_teste", role="ALUNO")


@pytest.mark.django_db
def test_login_sucesso_retorna_cookies_httponly(api_client, user):
    url = reverse("auth-login")
    response = api_client.post(
        url,
        {"username": "aluno_teste", "password": "senha_segura123"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert "user" in response.data
    assert response.data["user"]["username"] == "aluno_teste"
    assert response.data["user"]["role"] == "ALUNO"

    # Verificar cookies
    access_cookie_name = getattr(settings, "JWT_COOKIE_ACCESS_NAME", "access_token")
    refresh_cookie_name = getattr(settings, "JWT_COOKIE_REFRESH_NAME", "refresh_token")

    assert access_cookie_name in response.cookies
    assert refresh_cookie_name in response.cookies

    access_cookie = response.cookies[access_cookie_name]
    refresh_cookie = response.cookies[refresh_cookie_name]

    # HttpOnly e SameSite
    assert access_cookie["httponly"] is True
    assert access_cookie["samesite"] == "Lax"
    assert refresh_cookie["httponly"] is True
    assert refresh_cookie["samesite"] == "Lax"


@pytest.mark.django_db
def test_login_incorreto_retorna_401(api_client, user):
    url = reverse("auth-login")
    response = api_client.post(
        url,
        {"username": "aluno_teste", "password": "senha_errada"},
        format="json",
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    access_cookie_name = getattr(settings, "JWT_COOKIE_ACCESS_NAME", "access_token")
    assert access_cookie_name not in response.cookies


@pytest.mark.django_db
def test_me_sem_login_retorna_401(api_client):
    url = reverse("auth-me")
    response = api_client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_me_com_cookie_retorna_dados_usuario(api_client, user):
    login_url = reverse("auth-login")
    login_res = api_client.post(
        login_url,
        {"username": "aluno_teste", "password": "senha_segura123"},
        format="json",
    )
    assert login_res.status_code == status.HTTP_200_OK

    access_token = login_res.cookies["access_token"].value
    api_client.cookies["access_token"] = access_token

    me_url = reverse("auth-me")
    response = api_client.get(me_url)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["username"] == "aluno_teste"
    assert response.data["role"] == "ALUNO"


@pytest.mark.django_db
def test_refresh_token_via_cookie(api_client, user):
    login_url = reverse("auth-login")
    login_res = api_client.post(
        login_url,
        {"username": "aluno_teste", "password": "senha_segura123"},
        format="json",
    )
    assert login_res.status_code == status.HTTP_200_OK

    refresh_token = login_res.cookies["refresh_token"].value
    api_client.cookies["refresh_token"] = refresh_token

    refresh_url = reverse("auth-refresh")
    refresh_res = api_client.post(refresh_url, format="json")

    assert refresh_res.status_code == status.HTTP_200_OK
    assert "access_token" in refresh_res.cookies


@pytest.mark.django_db
def test_logout_limpa_cookies(api_client, user):
    login_url = reverse("auth-login")
    login_res = api_client.post(
        login_url,
        {"username": "aluno_teste", "password": "senha_segura123"},
        format="json",
    )
    assert login_res.status_code == status.HTTP_200_OK

    refresh_token = login_res.cookies["refresh_token"].value
    api_client.cookies["refresh_token"] = refresh_token

    logout_url = reverse("auth-logout")
    logout_res = api_client.post(logout_url, format="json")

    assert logout_res.status_code == status.HTTP_200_OK
    # Cookies expirados / vazios
    assert logout_res.cookies["access_token"].value == ""
    assert logout_res.cookies["refresh_token"].value == ""
