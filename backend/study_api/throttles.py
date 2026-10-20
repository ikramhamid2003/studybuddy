"""Per-scope rate limits for the expensive LLM/RAG endpoints.

Expensive LLM/RAG views get a tighter ceiling than cheap list/status calls,
while anonymous callers keep the global anon bucket.
"""

from __future__ import annotations

from rest_framework.throttling import (
    AnonRateThrottle,
    SimpleRateThrottle,
    UserRateThrottle,
)


class ActionRateThrottle(SimpleRateThrottle):
    """Apply an extra authenticated ceiling only to expensive actions.

    ``StudyBuddyUserRateThrottle`` already owns the shared ``user`` bucket.
    Letting this throttle count ordinary actions in that same bucket would
    consume two requests per call and make the configured global limit lie.
    """

    scope = "user"

    def allow_request(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return True

        # Only the expensive views opt into a tighter scope via throttle_scope;
        # everything else rides the shared `user` bucket owned by
        # StudyBuddyUserRateThrottle, so this throttle stays out of the way.
        view_scope = getattr(view, "throttle_scope", None)
        if view_scope not in {"generate", "rag", "chat"}:
            return True
        self.scope = view_scope

        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_cache_key(self, request, view) -> str | None:
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": request.user.pk,
        }


class StudyBuddyAnonRateThrottle(AnonRateThrottle):
    """Keep the default anonymous ceiling (unchanged scope name: anon)."""

    scope = "anon"


class StudyBuddyUserRateThrottle(UserRateThrottle):
    """Global authenticated ceiling that sits alongside ActionRateThrottle."""

    scope = "user"
