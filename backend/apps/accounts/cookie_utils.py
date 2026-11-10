from django.conf import settings


def set_jwt_cookies(response, access_token=None, refresh_token=None):
    """
    Sets access and/or refresh tokens into HttpOnly cookies on the response.
    """
    samesite = getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")
    secure = getattr(settings, "JWT_COOKIE_SECURE", False)
    httponly = getattr(settings, "JWT_COOKIE_HTTPONLY", True)
    path = getattr(settings, "JWT_COOKIE_PATH", "/")

    simple_jwt_settings = getattr(settings, "SIMPLE_JWT", {})

    if access_token:
        access_lifetime = simple_jwt_settings.get("ACCESS_TOKEN_LIFETIME")
        max_age = int(access_lifetime.total_seconds()) if access_lifetime else None
        response.set_cookie(
            getattr(settings, "JWT_COOKIE_ACCESS_NAME", "access_token"),
            access_token,
            max_age=max_age,
            httponly=httponly,
            samesite=samesite,
            secure=secure,
            path=path,
        )

    if refresh_token:
        refresh_lifetime = simple_jwt_settings.get("REFRESH_TOKEN_LIFETIME")
        max_age = int(refresh_lifetime.total_seconds()) if refresh_lifetime else None
        response.set_cookie(
            getattr(settings, "JWT_COOKIE_REFRESH_NAME", "refresh_token"),
            refresh_token,
            max_age=max_age,
            httponly=httponly,
            samesite=samesite,
            secure=secure,
            path=path,
        )

    return response


def clear_jwt_cookies(response):
    """
    Removes access and refresh token cookies.
    """
    samesite = getattr(settings, "JWT_COOKIE_SAMESITE", "Lax")
    path = getattr(settings, "JWT_COOKIE_PATH", "/")

    access_name = getattr(settings, "JWT_COOKIE_ACCESS_NAME", "access_token")
    refresh_name = getattr(settings, "JWT_COOKIE_REFRESH_NAME", "refresh_token")

    response.delete_cookie(access_name, path=path, samesite=samesite)
    response.delete_cookie(refresh_name, path=path, samesite=samesite)
    return response
