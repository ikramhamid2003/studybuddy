from rest_framework.test import APIClient


def test_health_endpoint_is_public_and_reports_ok():
    # Docker, Render and the keep-alive workflow all poll this route without a
    # token, so it must stay unauthenticated as well as healthy.
    resp = APIClient().get("/api/health/")

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
