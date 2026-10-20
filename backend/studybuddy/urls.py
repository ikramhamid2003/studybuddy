from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenBlacklistView

urlpatterns = [
    # Keep the API under /api/ so the React client can use one stable base URL.
    path("admin/", admin.site.urls),
    path("api/", include("study_api.urls")),
    # Token blacklist endpoint for logout
    path("api/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    # OpenAPI schema + Swagger UI for the API surface
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
