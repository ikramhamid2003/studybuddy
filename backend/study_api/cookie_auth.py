"""Cookie-based JWT sessions, so the browser never holds a readable token.

The access and refresh tokens live in httpOnly cookies. Script running on the
page, including injected script, cannot read them, which is the point.

Cookie mode is opt-in per request: the web client sends ``X-StudyBuddy-Client``
and then receives cookies instead of tokens in the response body. Requests
without that header behave exactly as before (bearer tokens in the body and in
``Authorization``), so API clients and older frontend builds keep working.

CSRF: browsers attach cookies automatically, so state-changing requests that
authenticate by cookie must also carry ``X-StudyBuddy-Client``. A cross-site
page cannot add a custom header without a CORS preflight, which the API
refuses for foreign origins. The cookies are also ``SameSite=Strict``.
"""

from django.conf import settings
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

CLIENT_HEADER = "HTTP_X_STUDYBUDDY_CLIENT"
ACCESS_COOKIE = "sb_access"
REFRESH_COOKIE = "sb_refresh"
# The refresh token is only ever sent to the auth endpoints.
REFRESH_COOKIE_PATH = "/api/auth/"

SAFE_METHODS = ("GET", "HEAD", "OPTIONS")


def wants_cookies(request) -> bool:
    """True when the caller asked for cookie sessions."""
    return bool(request.META.get(CLIENT_HEADER))


def _cookie_kwargs():
    return {
        "httponly": True,
        "secure": not settings.DEBUG,
        "samesite": "Strict",
    }


def set_auth_cookies(response, access=None, refresh=None):
    lifetimes = settings.SIMPLE_JWT
    if access:
        response.set_cookie(
            ACCESS_COOKIE,
            access,
            max_age=int(lifetimes["ACCESS_TOKEN_LIFETIME"].total_seconds()),
            path="/",
            **_cookie_kwargs(),
        )
    if refresh:
        response.set_cookie(
            REFRESH_COOKIE,
            refresh,
            max_age=int(lifetimes["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            path=REFRESH_COOKIE_PATH,
            **_cookie_kwargs(),
        )


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE, path="/", samesite="Strict")
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, samesite="Strict")


class CookieJWTAuthentication(JWTAuthentication):
    """Bearer header first, then the access-token cookie."""

    def authenticate(self, request):
        if self.get_header(request) is not None:
            return super().authenticate(request)

        raw = request.COOKIES.get(ACCESS_COOKIE)
        if not raw:
            return None

        validated = self.get_validated_token(raw.encode())
        if request.method not in SAFE_METHODS and not wants_cookies(request):
            raise PermissionDenied("Missing client header.")
        return self.get_user(validated), validated
