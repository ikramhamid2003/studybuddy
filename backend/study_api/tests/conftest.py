import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """Unauthenticated client for public endpoint tests."""
    return APIClient()


@pytest.fixture
def auth_client():
    """Authenticated client with a test user attached."""
    client = APIClient()
    user = User.objects.create_user(username="testuser", password="testpassword")
    client.force_authenticate(user=user)
    client.user = user
    return client
