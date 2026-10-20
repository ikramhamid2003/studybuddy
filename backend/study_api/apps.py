from django.apps import AppConfig


class StudyApiConfig(AppConfig):
    """Django application configuration for the study API app."""

    name = "study_api"

    def ready(self) -> None:
        # Register account-creation side effects once Django's app registry is ready.
        from . import signals  # noqa: F401
