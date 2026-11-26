import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

COOKIE = {"HTTP_X_STUDYBUDDY_CLIENT": "web"}
LOGIN = "/api/auth/login/"
REFRESH = "/api/auth/refresh/"
LOGOUT = "/api/auth/logout/"
ME = "/api/auth/me/"
CREDS = {"username": "sam", "password": "pw-12345-secure"}


@pytest.fixture
def user():
    return User.objects.create_user(username="sam", password=CREDS["password"])


def _login(client, **extra):
    return client.post(LOGIN, CREDS, format="json", **extra)


def test_cookie_login_sets_httponly_cookies_and_hides_tokens(user):
    client = APIClient()
    resp = _login(client, **COOKIE)
    assert resp.status_code == 200
    assert resp.json() == {"user": {"id": user.id, "username": "sam"}}
    access, refresh = resp.cookies["sb_access"], resp.cookies["sb_refresh"]
    for cookie in (access, refresh):
        assert cookie["httponly"] and cookie["samesite"] == "Strict"
    assert refresh["path"] == "/api/auth/"
    assert access["path"] == "/"


def test_login_without_client_header_still_returns_tokens(user):
    resp = _login(APIClient())
    assert resp.status_code == 200
    assert {"access", "refresh"} <= resp.json().keys()
    assert "sb_access" not in resp.cookies


def test_bad_credentials_set_no_cookies(user):
    resp = APIClient().post(LOGIN, {**CREDS, "password": "nope"}, format="json", **COOKIE)
    assert resp.status_code == 401
    assert "sb_access" not in resp.cookies


def test_cookie_authenticates_requests(user):
    client = APIClient()
    _login(client, **COOKIE)
    resp = client.get(ME)
    assert resp.status_code == 200 and resp.json()["username"] == "sam"


def test_cookie_requests_that_change_state_need_the_client_header(user):
    client = APIClient()
    _login(client, **COOKIE)
    forged = client.post("/api/flashcards/review/answer/", {}, format="json")
    assert forged.status_code == 403
    allowed = client.post("/api/flashcards/review/answer/", {}, format="json", **COOKIE)
    assert allowed.status_code == 400  # authenticated; the empty body is what is wrong


def test_bearer_header_still_works_without_the_client_header(user):
    tokens = _login(APIClient()).json()
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    assert client.post("/api/flashcards/review/answer/", {}, format="json").status_code == 400


def test_garbage_cookie_is_rejected(user):
    client = APIClient()
    client.cookies["sb_access"] = "not-a-jwt"
    assert client.get(ME).status_code == 401


def test_refresh_from_cookie_rotates_both_cookies(user):
    client = APIClient()
    first = _login(client, **COOKIE)
    old_refresh = first.cookies["sb_refresh"].value
    resp = client.post(REFRESH, {}, format="json", **COOKIE)
    assert resp.status_code == 200
    assert resp.json() == {"detail": "Session renewed."}
    assert resp.cookies["sb_refresh"].value != old_refresh
    assert resp.cookies["sb_access"].value
    assert client.get(ME).status_code == 200


def test_refresh_without_a_cookie_is_401():
    resp = APIClient().post(REFRESH, {}, format="json", **COOKIE)
    assert resp.status_code == 401


def test_refresh_with_revoked_token_clears_cookies(user):
    client = APIClient()
    _login(client, **COOKIE)
    stale = client.cookies["sb_refresh"].value
    client.post(REFRESH, {}, format="json", **COOKIE)  # rotates and blacklists `stale`
    client.cookies["sb_refresh"] = stale
    resp = client.post(REFRESH, {}, format="json", **COOKIE)
    assert resp.status_code == 401
    assert resp.cookies["sb_refresh"].value == ""


def test_body_refresh_still_works_for_token_clients(user):
    tokens = _login(APIClient()).json()
    resp = APIClient().post(REFRESH, {"refresh": tokens["refresh"]}, format="json")
    assert resp.status_code == 200 and "access" in resp.json()


def test_logout_revokes_the_token_and_clears_cookies(user):
    client = APIClient()
    _login(client, **COOKIE)
    refresh = client.cookies["sb_refresh"].value
    resp = client.post(LOGOUT, {}, format="json", **COOKIE)
    assert resp.status_code == 204
    assert resp.cookies["sb_access"].value == "" and resp.cookies["sb_refresh"].value == ""
    reuse = APIClient().post(REFRESH, {"refresh": refresh}, format="json")
    assert reuse.status_code == 401


def test_logout_with_no_session_is_still_204():
    assert APIClient().post(LOGOUT, {}, format="json").status_code == 204
