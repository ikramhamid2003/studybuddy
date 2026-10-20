"""Email notifications for newly created StudyBuddy accounts."""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_signup_notification(user) -> None:
    """Notify the configured administrator about a new account.

    This deliberately includes only account metadata. Passwords, JWTs, and
    other authentication secrets must never be sent in email.
    """
    recipient = getattr(settings, "SIGNUP_NOTIFICATION_EMAIL", "").strip()
    if not recipient:
        return

    joined_at = user.date_joined.astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    message = (
        "A new StudyBuddy user has signed up.\n\n"
        f"Username: {user.username}\n"
        f"Email: {user.email or '(not provided)'}\n"
        f"Joined: {joined_at}\n"
        f"User ID: {user.pk}\n"
    )
    try:
        send_mail(
            subject=f"New StudyBuddy signup: {user.username}",
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[recipient],
            fail_silently=False,
        )
    except Exception:
        # Notification delivery must never turn a successful signup into a 500.
        logger.exception("Could not send signup notification for user %s", user.pk)
