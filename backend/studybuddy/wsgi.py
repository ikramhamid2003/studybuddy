import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "studybuddy.settings")

from django.conf import settings

# Refuse to serve traffic with the placeholder key: it is public in the repo, so
# anyone could forge JWTs. Checked here (not in settings) so tooling such as
# makemigrations and the test suite still runs without a real key.
if not settings.DEBUG and settings.SECRET_KEY.startswith("django-insecure-"):
    raise RuntimeError("SECRET_KEY must be set to a private value when DEBUG is off.")

# WSGI servers import this callable to serve the Django app in production.
application = get_wsgi_application()
