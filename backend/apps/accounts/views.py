from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.cookie_utils import clear_jwt_cookies, set_jwt_cookies
from apps.accounts.serializers import UsuarioSerializer


class LoginThrottle(ScopedRateThrottle):
    scope = "login"


class CookieTokenObtainPairView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        serializer = TokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0]) from e

        tokens = serializer.validated_data
        access_token = tokens.get("access")
        refresh_token = tokens.get("refresh")

        user_serializer = UsuarioSerializer(serializer.user)
        response = Response(
            {
                "detail": "Login realizado com sucesso.",
                "user": user_serializer.data,
            },
            status=status.HTTP_200_OK,
        )
        set_jwt_cookies(response, access_token=access_token, refresh_token=refresh_token)
        return response


class CookieTokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        cookie_name = getattr(settings, "JWT_COOKIE_REFRESH_NAME", "refresh_token")
        refresh_token = request.COOKIES.get(cookie_name) or request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"detail": "Refresh token não fornecido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0]) from e

        new_access = serializer.validated_data.get("access")
        new_refresh = serializer.validated_data.get("refresh")

        response = Response(
            {"detail": "Token renovado com sucesso."},
            status=status.HTTP_200_OK,
        )
        set_jwt_cookies(response, access_token=new_access, refresh_token=new_refresh)
        return response


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        cookie_name = getattr(settings, "JWT_COOKIE_REFRESH_NAME", "refresh_token")
        refresh_token = request.COOKIES.get(cookie_name) or request.data.get("refresh")

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, AttributeError):
                # Token might be invalid or expired or already blacklisted
                pass

        response = Response(
            {"detail": "Logout realizado com sucesso."},
            status=status.HTTP_200_OK,
        )
        clear_jwt_cookies(response)
        return response


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
