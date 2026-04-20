"""JWT authentication helpers for versioned token invalidation."""

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import UserProfile


class TokenVersionJWTAuthentication(JWTAuthentication):
    """Reject tokens issued before the current user token version."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        token_version = int(validated_token.get("token_version", 0))

        if token_version != profile.token_version:
            raise AuthenticationFailed(
                "Tu sesión expiró porque cambió la contraseña.",
                code="password_changed",
            )

        return user