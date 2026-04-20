"""Serializers for habit tracking API endpoints."""

import re
from datetime import timedelta

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Habit, HabitLog, HabitSchedule, UserProfile


VALID_DAYS = {
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
}


def _next_monday(from_date):
    """Return the Monday of the next week relative to `from_date`."""
    days_until_monday = (7 - from_date.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    return from_date + timedelta(days=days_until_monday)


def _translate_password_messages(messages):
    """Translate common Django password validator messages to neutral Spanish."""
    translated = []
    for message in messages:
        lower_message = message.lower()
        if "too short" in lower_message:
            translated.append("La contraseña es muy corta. Debe tener al menos 8 caracteres.")
            continue
        if "too common" in lower_message:
            translated.append("La contraseña es demasiado común. Elige una más segura.")
            continue
        if "entirely numeric" in lower_message:
            translated.append("La contraseña no puede ser solo números.")
            continue
        if "too similar" in lower_message:
            translated.append("La contraseña es muy parecida a tus datos de cuenta.")
            continue
        translated.append(message)
    return translated

class HabitSerializer(serializers.ModelSerializer):
    """Serialize habits and enforce weekday list consistency."""

    days = serializers.ListField(child=serializers.CharField())

    class Meta:
        model = Habit
        fields = '__all__'
        read_only_fields = ['user', 'is_archived', 'archived_at']

    def validate_name(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError("Name cannot be empty")
        return normalized

    def validate_days(self, value):
        if not isinstance(value, list) or not value:
            raise serializers.ValidationError("Days must be a non-empty list")

        normalized = []
        for day in value:
            if not isinstance(day, str):
                raise serializers.ValidationError("Each day must be a string")

            normalized_day = day.strip().lower()
            if normalized_day not in VALID_DAYS:
                raise serializers.ValidationError(
                    f"Invalid day '{day}'. Allowed days: {sorted(VALID_DAYS)}"
                )

            if normalized_day not in normalized:
                normalized.append(normalized_day)

        return normalized

    def create(self, validated_data):
        return Habit.objects.create(**validated_data)

    def update(self, instance, validated_data):
        new_name = validated_data.pop("name", None)
        if new_name is not None and new_name != instance.name:
            raise serializers.ValidationError(
                {"name": "El nombre del hábito no se puede editar."}
            )

        days_was_updated = "days" in validated_data
        requested_days = validated_data.pop("days", None)
        previous_days = list(instance.days)

        updated_instance = super().update(instance, validated_data)

        if days_was_updated and requested_days is not None and previous_days != requested_days:
            effective_from = _next_monday(timezone.localdate())
            if effective_from < updated_instance.start_date:
                effective_from = updated_instance.start_date

            HabitSchedule.objects.update_or_create(
                habit=updated_instance,
                effective_from=effective_from,
                defaults={"days": requested_days},
            )

        return updated_instance

class HabitLogSerializer(serializers.ModelSerializer):
    """Serialize persisted habit logs."""

    class Meta:
        model = HabitLog
        fields = '__all__'
        read_only_fields = ['habit']


class HabitLogUpsertSerializer(serializers.Serializer):
    """Validate upsert payload for per-day habit status updates."""

    habit = serializers.PrimaryKeyRelatedField(queryset=Habit.objects.all())
    date = serializers.DateField()
    status = serializers.ChoiceField(
        choices=[*HabitLog.STATUS_CHOICES, ("pending", "Pending")]
    )

    def validate_habit(self, habit):
        request = self.context.get("request")
        if not request or habit.user_id != request.user.id:
            raise serializers.ValidationError("You cannot update logs for this habit")
        if habit.is_archived:
            raise serializers.ValidationError("You cannot update logs for archived habits")
        if habit.archived_at and habit.archived_at <= timezone.localdate():
            raise serializers.ValidationError("You cannot update logs for archived habits")
        return habit

    def validate(self, attrs):
        today = timezone.localdate()
        if attrs["date"] != today:
            raise serializers.ValidationError(
                {"date": "You can only update logs for today."}
            )

        if attrs["status"] == "done" and attrs["date"] > today:
            raise serializers.ValidationError(
                {"status": "You cannot mark a habit as done before its date."}
            )
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    """Register users with case-insensitive uniqueness checks."""

    username = serializers.CharField(
        error_messages={
            "required": "El nombre de usuario es obligatorio.",
            "blank": "El nombre de usuario es obligatorio.",
        }
    )
    email = serializers.EmailField(
        error_messages={
            "required": "El correo electrónico es obligatorio.",
            "blank": "El correo electrónico es obligatorio.",
            "invalid": "Ingresa un correo electrónico válido.",
        }
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "required": "La contraseña es obligatoria.",
            "blank": "La contraseña es obligatoria.",
            "min_length": "La contraseña debe tener al menos 8 caracteres.",
        },
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def validate(self, attrs):
        username = attrs["username"].strip()
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        errors = {}
        if User.objects.filter(username__iexact=username).exists():
            errors["username"] = ["Este nombre de usuario ya está en uso."]
        if User.objects.filter(email__iexact=email).exists():
            errors["email"] = ["Este correo electrónico ya está en uso."]

        if errors:
            raise serializers.ValidationError(errors)

        try:
            validate_password(password, user=User(username=username, email=email))
        except DjangoValidationError as exc:
            errors["password"] = _translate_password_messages(list(exc.messages))

        if not re.search(r"[A-Z]", password):
            errors.setdefault("password", []).append(
                "La contraseña debe incluir al menos una letra mayúscula."
            )
        if not re.search(r"\d", password):
            errors.setdefault("password", []).append(
                "La contraseña debe incluir al menos un número."
            )

        if errors:
            raise serializers.ValidationError(errors)

        attrs["username"] = username
        attrs["email"] = email
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serialize and validate editable profile fields for authenticated users."""

    user_id = serializers.IntegerField(source='user.id', read_only=True)
    first_name = serializers.CharField(source='user.first_name', allow_blank=True, required=False)
    last_name = serializers.CharField(source='user.last_name', allow_blank=True, required=False)
    email = serializers.EmailField(source='user.email', required=False)
    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    remove_avatar = serializers.BooleanField(write_only=True, required=False, default=False)
    avatar_file_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'user_id',
            'username',
            'email',
            'first_name',
            'last_name',
            'avatar',
            'remove_avatar',
            'avatar_file_url',
            'avatar_url',
            'birth_date',
            'weight_kg',
            'gender',
        ]

    def get_avatar_file_url(self, obj):
        if not obj.avatar:
            return None

        request = self.context.get('request')
        url = obj.avatar.url
        return request.build_absolute_uri(url) if request else url

    def validate_avatar(self, image):
        """Validate avatar mime type and max file size."""
        if image is None:
            return image

        allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
        max_size_bytes = 2 * 1024 * 1024

        if image.content_type not in allowed_types:
            raise serializers.ValidationError('Avatar must be a JPG, PNG, or WEBP image.')

        if image.size > max_size_bytes:
            raise serializers.ValidationError('Avatar image must be 2MB or smaller.')

        return image

    def validate_birth_date(self, value):
        """Ensure birth date is not set in the future."""
        if value and value > timezone.localdate():
            raise serializers.ValidationError('Birth date cannot be in the future.')
        return value

    def validate_weight_kg(self, value):
        """Enforce a sane positive range for body weight."""
        if value is None:
            return value
        if value <= 0:
            raise serializers.ValidationError('Weight must be greater than zero.')
        if value > 500:
            raise serializers.ValidationError('Weight value looks unrealistic. Use kilograms.')
        return value

    def update(self, instance, validated_data):
        remove_avatar = validated_data.pop('remove_avatar', False)
        user_data = validated_data.pop('user', {})

        if remove_avatar:
            if instance.avatar:
                instance.avatar.delete(save=False)
            instance.avatar = None
            instance.avatar_url = ''

        for field, value in validated_data.items():
            setattr(instance, field, value)

        for field, value in user_data.items():
            setattr(instance.user, field, value)

        instance.user.save(update_fields=list(user_data.keys()) if user_data else None)
        instance.save()
        return instance


class CaseInsensitiveTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Authenticate with case-insensitive username matching."""

    default_error_messages = {
        "missing_credentials": "Ingresa tu usuario y contraseña.",
        "invalid_credentials": "Usuario o contraseña incorrectos.",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].error_messages["required"] = (
            "El usuario es obligatorio."
        )
        self.fields[self.username_field].error_messages["blank"] = (
            "El usuario es obligatorio."
        )
        self.fields["password"].error_messages["required"] = (
            "La contraseña es obligatoria."
        )
        self.fields["password"].error_messages["blank"] = (
            "La contraseña es obligatoria."
        )

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        password = attrs.get("password")

        if not username or not password:
            raise AuthenticationFailed(self.error_messages["missing_credentials"])

        user = User.objects.filter(username__iexact=username.strip()).first()
        if not user or not user.check_password(password):
            raise AuthenticationFailed(self.error_messages["invalid_credentials"])

        attrs[self.username_field] = user.get_username()
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        token["token_version"] = profile.token_version
        return token


class VersionedTokenRefreshSerializer(TokenRefreshSerializer):
    """Refresh serializer that rejects tokens issued before a password reset."""

    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        user_id = refresh.get("user_id")
        token_version = int(refresh.get("token_version", 0))

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise TokenError("Token de sesión inválido.")

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if token_version != profile.token_version:
            raise TokenError("Tu sesión expiró porque cambió la contraseña.")

        return super().validate(attrs)