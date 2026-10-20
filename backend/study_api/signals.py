"""Model signals for application-wide side effects."""

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .signup_notifications import send_signup_notification


@receiver(post_save, sender=get_user_model())
def notify_on_signup(sender, instance, created: bool, **_kwargs) -> None:
    """Send one administrator notification for each newly created account."""
    if created:
        send_signup_notification(instance)
