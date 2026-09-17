import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "studybuddy.settings")

# WSGI servers import this callable to serve the Django app in production.
application = get_wsgi_application()
