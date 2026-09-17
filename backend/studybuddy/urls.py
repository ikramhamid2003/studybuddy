from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Keep the API under /api/ so the React client can use one stable base URL.
    path("admin/", admin.site.urls),
    path("api/", include("study_api.urls")),
]
