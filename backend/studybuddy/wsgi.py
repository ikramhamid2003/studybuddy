import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "studybuddy.settings")

from django.conf import settings

from .settings import secret_key_is_public

# Refuse to serve traffic with a published key: it is in the repo, so anyone
# could forge JWTs. That covers the settings default and the value shipped in
# backend/.env.example, plus anything too short to be a real secret. Checked
# here (not in settings) so tooling such as makemigrations and the test suite
# still runs without a real key.
if not settings.DEBUG and secret_key_is_public(settings.SECRET_KEY):
    raise RuntimeError(
        "SECRET_KEY must be set to a private value when DEBUG is off. Generate one "
        'with: python -c "import secrets; print(secrets.token_urlsafe(50))"'
    )

# WSGI servers import this callable to serve the Django app in production.
application = get_wsgi_application()
