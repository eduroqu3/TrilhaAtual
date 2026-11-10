from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom SimpleJWT authentication that retrieves the raw access token
    from either the HttpOnly cookie or the Authorization header.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            cookie_name = getattr(settings, "JWT_COOKIE_ACCESS_NAME", "access_token")
            raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
