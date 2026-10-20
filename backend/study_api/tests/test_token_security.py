"""Refresh-token rotation and revocation settings.

Guards the SimpleJWT configuration an expiring session depends on: refresh
tokens rotate on use and the rotated-away token is blacklisted, so revocation
is actually meaningful.
"""

from django.conf import settings


def test_jwt_rotation_and_blacklisting_are_enabled():
    # Guards the settings that make revocation meaningful at all.
    assert settings.SIMPLE_JWT["ROTATE_REFRESH_TOKENS"] is True
    assert settings.SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] is True
    assert "rest_framework_simplejwt.token_blacklist" in settings.INSTALLED_APPS
