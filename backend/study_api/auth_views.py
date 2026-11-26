"""Login, refresh and logout, with optional cookie sessions (see cookie_auth)."""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .cookie_auth import (
    REFRESH_COOKIE,
    clear_auth_cookies,
    set_auth_cookies,
    wants_cookies,
)
from .throttles import AuthRateThrottle


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — token login with a brute-force throttle.

    In cookie mode the tokens go into httpOnly cookies and the body carries
    only the user's identity.
    """

    throttle_classes = (AuthRateThrottle,)

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != status.HTTP_200_OK or not wants_cookies(request):
            return response

        data = response.data
        set_auth_cookies(response, access=data["access"], refresh=data["refresh"])
        # Identity comes from the same user the tokens were issued for.
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        response.data = {"user": {"id": user.id, "username": user.username}}
        return response


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — renew the access token.

    In cookie mode the refresh token comes from its cookie and the rotated pair
    goes back into cookies. A rejected token clears both cookies.
    """

    def post(self, request, *args, **kwargs):
        if not wants_cookies(request):
            return super().post(request, *args, **kwargs)

        refresh = request.COOKIES.get(REFRESH_COOKIE)
        if not refresh:
            response = Response({"detail": "Not signed in."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response)
            return response

        serializer = self.get_serializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken):
            response = Response(
                {"detail": "Session expired."}, status=status.HTTP_401_UNAUTHORIZED
            )
            clear_auth_cookies(response)
            return response

        tokens = serializer.validated_data
        response = Response({"detail": "Session renewed."})
        set_auth_cookies(response, access=tokens["access"], refresh=tokens.get("refresh"))
        return response


class LogoutView(APIView):
    """POST /api/auth/logout/ — revoke the refresh token and clear the cookies.

    Public on purpose: the refresh token is the credential, and logging out must
    work after the access token has expired. Always answers 204.
    """

    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        refresh = request.COOKIES.get(REFRESH_COOKIE) or request.data.get("refresh")
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass  # already expired or revoked: nothing left to revoke
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response
