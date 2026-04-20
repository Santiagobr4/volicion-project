"""API views and metric helpers for the habit tracking backend."""

import logging
from datetime import datetime, timedelta
from collections import defaultdict

from django.contrib.auth.models import User
from django.core.cache import cache
from django.db.models import Count, Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import SuspiciousOperation
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.mail import EmailMultiAlternatives
from django.utils.http import urlsafe_base64_encode
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.exceptions import ValidationError
from django.db import transaction
from django.template.loader import render_to_string

from .models import Habit, HabitLog, HabitSchedule, UserProfile
from .serializers import (
    HabitLogSerializer,
    HabitLogUpsertSerializer,
    HabitSerializer,
    CaseInsensitiveTokenObtainPairSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    VersionedTokenRefreshSerializer,
)
from .throttles import LoginRateThrottle, RegisterRateThrottle

logger = logging.getLogger(__name__)

WEEKDAY_NAMES = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)


def _error_payload(message, code=None, **extra):
    """Return backward-compatible error payload structure.

    Keeps `error` for existing clients and adds `detail` for DRF-consistent parsing.
    """
    payload = {"error": message, "detail": message}
    if code:
        payload["code"] = code
    if extra:
        payload.update(extra)
    return payload


def _weekday_name(target_date):
    """Return locale-independent weekday label used by schedule data."""
    return WEEKDAY_NAMES[target_date.weekday()]


def _invalidate_leaderboard_cache(target_date=None):
    """Invalidate leaderboard cache entries for a given date.

    Ranking payloads are cached by day key (leaderboard:v2:YYYY-MM-DD).
    """
    date_value = target_date or timezone.localdate()
    cache_key = f"leaderboard:v2:{date_value.isoformat()}"
    cache.delete(cache_key)
    cache.delete(f"{cache_key}:lock")


def _build_email_context(user, **extra_context):
    """Build shared email template context for brand-consistent messages."""
    display_name = (user.first_name or "").strip() or user.username
    context = {
        "brand_name": "VOLICION",
        "display_name": display_name,
        "frontend_url": settings.FRONTEND_APP_URL.rstrip("/"),
        "support_email": settings.DEFAULT_FROM_EMAIL,
    }
    context.update(extra_context)
    return context


def _send_templated_email(user, subject, template_name, context):
    """Send a multipart email rendered from reusable templates."""
    template_context = _build_email_context(user, **context)
    html_message = render_to_string(f"habits/emails/{template_name}.html", template_context)
    text_message = render_to_string(f"habits/emails/{template_name}.txt", template_context)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_message, "text/html")
    email.send(fail_silently=False)


def _send_password_reset_email(user):
    """Send password-reset email with uid/token link for a user."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = (
        f"{settings.FRONTEND_APP_URL.rstrip('/')}"
        f"{settings.PASSWORD_RESET_PATH}?uid={uid}&token={token}"
    )

    _send_templated_email(
        user,
        "Restablece tu contraseña en VOLICION",
        "password_reset",
        {
            "reset_link": reset_link,
        },
    )


def _send_welcome_email(user):
    """Send a welcome email after successful registration."""
    _send_templated_email(
        user,
        "Bienvenido a VOLICION",
        "welcome",
        {},
    )


def _send_password_changed_email(user):
    """Send a confirmation email after a password change."""
    _send_templated_email(
        user,
        "Tu contraseña de VOLICION fue actualizada",
        "password_changed",
        {},
    )


def _increment_token_version(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    with transaction.atomic():
        profile = UserProfile.objects.select_for_update().get(user=user)
        profile.token_version += 1
        profile.save(update_fields=["token_version"])
        return profile.token_version


def _next_monday(from_date):
    """Return the Monday of the next week relative to `from_date`."""
    days_until_monday = (7 - from_date.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    return from_date + timedelta(days=days_until_monday)


def _build_schedule_map(habits):
    """Build a dictionary of schedule snapshots by habit id.

    Uses prefetched `schedules` relation when available to avoid extra queries.
    """
    if not habits:
        return defaultdict(list)

    schedule_map = defaultdict(list)

    prefetched = True
    for habit in habits:
        prefetched_entries = getattr(habit, '_prefetched_objects_cache', {}).get('schedules')
        if prefetched_entries is None:
            prefetched = False
            break
        schedule_map[habit.id] = sorted(prefetched_entries, key=lambda item: item.effective_from)

    if prefetched:
        return schedule_map

    schedules = HabitSchedule.objects.filter(habit__in=habits).order_by('effective_from')
    for schedule in schedules:
        schedule_map[schedule.habit_id].append(schedule)
    return schedule_map


def _days_for_habit_on_date(habit, target_date, schedule_map):
    """Resolve active weekdays for a habit on a target date."""
    entries = schedule_map.get(habit.id, [])
    days = []
    for schedule in entries:
        if schedule.effective_from <= target_date:
            days = schedule.days
        else:
            break
    return days


def _habit_has_activity_on_date(habit, target_date, schedule_map, logs_map=None):
    """Return True when a habit should be visible on a date."""
    if target_date < habit.start_date:
        return False
    if habit.archived_at and target_date >= habit.archived_at:
        return False

    if logs_map and logs_map.get((habit.id, str(target_date))):
        return True

    weekday = _weekday_name(target_date)
    return weekday in _days_for_habit_on_date(habit, target_date, schedule_map)


def _metrics_baseline_date(user, habit_list):
    """Return the baseline date used for metric visibility."""
    if not user.date_joined:
        user_start = timezone.localdate()
    else:
        user_start = timezone.localtime(user.date_joined).date()

    return user_start


def _registration_week_start(user):
    """Return Monday of the week where the account was created."""
    if not user.date_joined:
        return timezone.localdate() - timedelta(days=timezone.localdate().weekday())

    joined_date = timezone.localtime(user.date_joined).date()
    return joined_date - timedelta(days=joined_date.weekday())


def _week_progress_phase(evaluated_days, total_days=7):
    """Classify the week progress so the frontend can tone insights appropriately."""
    if evaluated_days <= 0:
        return "future"
    if evaluated_days >= total_days:
        return "complete"
    if evaluated_days <= 2:
        return "start"
    if evaluated_days <= 4:
        return "mid"
    return "late"


def _habit_is_active_on_date(habit, target_date):
    """Determine if a habit is active on a given date."""
    if target_date < habit.start_date:
        return False
    if habit.archived_at and target_date >= habit.archived_at:
        return False
    return True


def _compute_range_metrics(user, start_date, end_date, habit_list=None, schedule_map=None, logs_map=None):
    """Compute daily, weekly, and monthly completion metrics for a date range.

    Optional preloaded collections can be passed to reduce repeated queries.
    """
    if habit_list is None:
        habit_list = list(Habit.objects.filter(user=user))
    else:
        habit_list = list(habit_list)

    baseline = _metrics_baseline_date(user, habit_list)

    if not habit_list:
        return {
            "range": {
                "start_date": str(start_date),
                "end_date": str(end_date),
                "baseline_date": str(baseline),
            },
            "summary": {
                "average_daily_completion": None,
                "active_days": 0,
            },
            "daily": [],
            "weekly": [],
            "monthly": [],
        }

    effective_start = max(start_date, baseline)
    if effective_start > end_date:
        return {
            "range": {
                "start_date": str(start_date),
                "end_date": str(end_date),
                "baseline_date": str(baseline),
            },
            "summary": {
                "average_daily_completion": None,
                "active_days": 0,
            },
            "daily": [],
            "weekly": [],
            "monthly": [],
        }

    dates = []
    cursor = effective_start
    while cursor <= end_date:
        dates.append(cursor)
        cursor += timedelta(days=1)

    schedule_map = schedule_map or _build_schedule_map(habit_list)

    if logs_map is None:
        logs = HabitLog.objects.filter(
            habit__user=user,
            date__range=(effective_start, end_date),
        )
        logs_map = {(log.habit_id, str(log.date)): log.status for log in logs}

    daily_rows = []
    weekly_agg = defaultdict(lambda: {"done": 0, "total": 0})
    monthly_agg = defaultdict(lambda: {"done": 0, "total": 0})

    for current_date in dates:
        done_count = 0
        total_count = 0
        weekday = _weekday_name(current_date)

        for habit in habit_list:
            status_value = logs_map.get((habit.id, str(current_date)))
            if status_value is None:
                if not _habit_is_active_on_date(habit, current_date):
                    continue

                active_days = _days_for_habit_on_date(habit, current_date, schedule_map)
                if weekday not in active_days:
                    continue

            total_count += 1
            if status_value == "done":
                done_count += 1

        completion = round((done_count / total_count) * 100, 0) if total_count else None
        date_key = str(current_date)
        week_start = current_date - timedelta(days=current_date.weekday())
        month_key = current_date.strftime("%Y-%m")

        daily_rows.append(
            {
                "date": date_key,
                "completion": completion,
                "done": done_count,
                "total": total_count,
            }
        )

        weekly_agg[str(week_start)]["done"] += done_count
        weekly_agg[str(week_start)]["total"] += total_count
        monthly_agg[month_key]["done"] += done_count
        monthly_agg[month_key]["total"] += total_count

    weekly_rows = []
    for week_start, stats in sorted(weekly_agg.items()):
        total = stats["total"]
        completion = round((stats["done"] / total) * 100, 0) if total else None
        weekly_rows.append(
            {
                "start_date": week_start,
                "label": f"Week of {week_start}",
                "completion": completion,
                "done": stats["done"],
                "total": total,
            }
        )

    monthly_rows = []
    for month, stats in sorted(monthly_agg.items()):
        total = stats["total"]
        completion = round((stats["done"] / total) * 100, 0) if total else None
        monthly_rows.append(
            {
                "month": month,
                "label": month,
                "completion": completion,
                "done": stats["done"],
                "total": total,
            }
        )

    summary_values = [d["completion"] for d in daily_rows if d["total"] > 0]
    summary_average = round(sum(summary_values) / len(summary_values), 0) if summary_values else None

    return {
        "range": {
            "start_date": str(start_date),
            "end_date": str(end_date),
            "baseline_date": str(baseline),
        },
        "summary": {
            "average_daily_completion": summary_average,
            "active_days": len(summary_values),
        },
        "daily": daily_rows,
        "weekly": weekly_rows,
        "monthly": monthly_rows,
    }


def _overall_completion(rows):
    """Calculate weighted overall completion from metric rows."""
    total_done = sum(row.get("done", 0) for row in rows if row.get("total", 0) > 0)
    total_applicable = sum(row.get("total", 0) for row in rows if row.get("total", 0) > 0)

    if total_applicable <= 0:
        return None

    return round((total_done / total_applicable) * 100, 0)


def _compute_habit_streaks(habit, schedule_map, logs_map, end_date):
    """Compute current and best streak for a habit up to a target date."""
    applicable_dates = []
    cursor = habit.start_date

    while cursor <= end_date:
        weekday = _weekday_name(cursor)
        active_days = _days_for_habit_on_date(habit, cursor, schedule_map)
        if weekday in active_days or logs_map.get((habit.id, str(cursor))):
            applicable_dates.append(cursor)
        cursor += timedelta(days=1)

    if not applicable_dates:
        return {"streak_current": 0, "streak_best": 0}

    best_streak = 0
    running = 0
    for current_date in applicable_dates:
        status_value = logs_map.get((habit.id, str(current_date)))
        if status_value == "done":
            running += 1
            best_streak = max(best_streak, running)
        else:
            running = 0

    current_streak = 0
    for current_date in reversed(applicable_dates):
        status_value = logs_map.get((habit.id, str(current_date)))
        if status_value == "done":
            current_streak += 1
        else:
            break

    return {
        "streak_current": current_streak,
        "streak_best": best_streak,
    }


class HabitViewSet(viewsets.ModelViewSet):
    """CRUD endpoints and analytics actions for user habits."""

    serializer_class = HabitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return active habits for the authenticated user."""
        today = timezone.localdate()
        return Habit.objects.filter(user=self.request.user).filter(
            Q(archived_at__isnull=True) | Q(archived_at__gt=today)
        )

    def perform_create(self, serializer):
        """Attach authenticated user to newly created habit."""
        serializer.save(
            user=self.request.user,
            start_date=_next_monday(timezone.localdate()),
        )
        _invalidate_leaderboard_cache()

    def perform_update(self, serializer):
        """Persist habit updates and invalidate ranking cache."""
        serializer.save()
        _invalidate_leaderboard_cache()

    def _require_sunday(self):
        """Enforce Sunday-only updates/deletes for habit definitions."""
        if timezone.localdate().weekday() != 6:
            return Response(
                {"detail": "You can only edit or delete habits on Sunday."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def _pending_removal_response(self):
        return Response(
            _error_payload(
                "Este hábito ya está programado para eliminarse el próximo lunes.",
                code="habit_already_scheduled_for_removal",
            ),
            status=status.HTTP_400_BAD_REQUEST,
        )

    def _is_pending_removal(self, habit):
        return bool(habit.archived_at and habit.archived_at > timezone.localdate())

    def update(self, request, *args, **kwargs):
        sunday_check = self._require_sunday()
        if sunday_check:
            return sunday_check
        habit = self.get_object()
        if self._is_pending_removal(habit):
            return self._pending_removal_response()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        sunday_check = self._require_sunday()
        if sunday_check:
            return sunday_check
        habit = self.get_object()
        if self._is_pending_removal(habit):
            return self._pending_removal_response()
        return super().partial_update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        effective_removal = _next_monday(timezone.localdate())

        # If habit never started and has no logs, remove it completely.
        if instance.start_date >= effective_removal and not HabitLog.objects.filter(habit=instance).exists():
            instance.delete()
            _invalidate_leaderboard_cache()
            return

        instance.archived_at = effective_removal
        instance.save(update_fields=['archived_at'])
        _invalidate_leaderboard_cache()

    def destroy(self, request, *args, **kwargs):
        sunday_check = self._require_sunday()
        if sunday_check:
            return sunday_check
        habit = self.get_object()
        if self._is_pending_removal(habit):
            return self._pending_removal_response()
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='by-date')
    def by_date(self, request):
        """Return user habits scheduled for a specific date with their status."""
        date_str = request.query_params.get('date')

        if not date_str:
            return Response(_error_payload("Date is required", code="date_required"), status=400)

        try:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(_error_payload("Invalid date format", code="invalid_date_format"), status=400)

        weekday = _weekday_name(date)

        habits = list(Habit.objects.filter(user=request.user))
        result = []
        schedule_map = _build_schedule_map(habits)

        logs = HabitLog.objects.filter(
            habit__user=request.user,
            date=date
        )
        logs_map = {log.habit_id: log for log in logs}

        for habit in habits:
            log = logs_map.get(habit.id)

            if not _habit_has_activity_on_date(habit, date, schedule_map, logs_map):
                continue

            result.append({
                "habit_id": habit.id,
                "name": habit.name,
                "status": log.status if log else "pending",
            })

        return Response(result)

    @action(detail=False, methods=['get'], url_path='weekly')
    def weekly(self, request):
        """Return weekly habit matrix plus aggregate completion metrics."""
        start_date_str = request.query_params.get('start_date')

        if not start_date_str:
            return Response(_error_payload("start_date is required", code="start_date_required"), status=400)

        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(_error_payload("Invalid date format", code="invalid_date_format"), status=400)

        week_dates = [start_date + timedelta(days=i) for i in range(7)]
        registration_week_start = _registration_week_start(request.user)

        if start_date < registration_week_start:
            return Response(
                {
                    **_error_payload(
                        "Weeks before your registration date are not available.",
                        code="registration_week_floor",
                    ),
                    "earliest_week_start": str(registration_week_start),
                },
                status=400,
            )

        habits = list(self.get_queryset())
        result = []
        schedule_map = _build_schedule_map(habits)

        logs = HabitLog.objects.filter(
            habit__user=request.user,
            date__range=(week_dates[0], week_dates[-1])
        )

        logs_map = {(log.habit_id, str(log.date)): log for log in logs}

        daily_stats = {str(date): {"done": 0, "total": 0} for date in week_dates}

        for habit in habits:
            has_applicable_day = False
            for current_date in week_dates:
                if _habit_has_activity_on_date(habit, current_date, schedule_map, logs_map):
                    has_applicable_day = True
                    break

            if not has_applicable_day:
                continue

            week_data = {}

            total_applicable = 0
            total_done = 0

            for date in week_dates:
                weekday = _weekday_name(date)
                date_str = str(date)
                log = logs_map.get((habit.id, date_str))

                if log:
                    total_applicable += 1
                    daily_stats[date_str]["total"] += 1
                    week_data[date_str] = log.status

                    if log.status == "done":
                        total_done += 1
                        daily_stats[date_str]["done"] += 1
                    continue

                if date < habit.start_date:
                    week_data[date_str] = "skip"
                    continue

                if not _habit_is_active_on_date(habit, date):
                    week_data[date_str] = "skip"
                    continue

                if weekday not in _days_for_habit_on_date(habit, date, schedule_map):
                    week_data[date_str] = "skip"
                    continue

                total_applicable += 1
                daily_stats[date_str]["total"] += 1
                week_data[date_str] = "pending"

            completion_rate = (
                (total_done / total_applicable) * 100
                if total_applicable > 0 else 100
            )

            streaks = _compute_habit_streaks(
                habit,
                schedule_map,
                logs_map,
                timezone.localdate(),
            )

            pending_removal = False
            if habit.archived_at:
                pending_removal = habit.archived_at == (week_dates[-1] + timedelta(days=1))

            editable_effective_date = _next_monday(timezone.localdate())
            if editable_effective_date < habit.start_date:
                editable_effective_date = habit.start_date

            result.append({
                "habit_id": habit.id,
                "name": habit.name,
                "days": _days_for_habit_on_date(habit, week_dates[0], schedule_map),
                "editable_days": _days_for_habit_on_date(
                    habit,
                    editable_effective_date,
                    schedule_map,
                ),
                "week": week_data,
                "completion_rate": round(completion_rate, 0),
                "streak_current": streaks["streak_current"],
                "streak_best": streaks["streak_best"],
                "pending_removal": pending_removal,
                "removal_effective_date": str(habit.archived_at) if habit.archived_at else None,
            })

        baseline = _metrics_baseline_date(request.user, habits)
        daily_percentages = {}

        for date, stats in daily_stats.items():
            total = stats["total"]
            done = stats["done"]
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()

            if date_obj < baseline:
                daily_percentages[date] = None
                continue

            if total > 0:
                daily_percentages[date] = round((done / total) * 100, 0)
            else:
                daily_percentages[date] = None

        valid_days = [
            v for d, v in daily_percentages.items()
            if daily_stats[d]["total"] > 0 and v is not None
        ]

        average_completion = round(
            sum(valid_days) / len(valid_days),
            0
        ) if valid_days else None

        return Response({
            "habits": result,
            "daily_percentages": daily_percentages,
            "average_completion": average_completion,
            "baseline_date": str(baseline),
        })

    @action(detail=False, methods=['get'], url_path='tracker-metrics')
    def tracker_metrics(self, request):
        """Return compact tracker metrics for the selected week."""
        today = timezone.localdate()
        current_week_start = today - timedelta(days=today.weekday())
        max_future_week_start = current_week_start + timedelta(days=7)
        registration_week_start = _registration_week_start(request.user)

        start_date_str = request.query_params.get('start_date')
        if start_date_str:
            try:
                week_start = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(_error_payload("Invalid start_date format", code="invalid_start_date"), status=400)
            week_start = week_start - timedelta(days=week_start.weekday())
        else:
            week_start = current_week_start

        if week_start < registration_week_start:
            return Response(
                {
                    **_error_payload(
                        "Weeks before your registration date are not available.",
                        code="registration_week_floor",
                    ),
                    "earliest_week_start": str(registration_week_start),
                },
                status=400,
            )

        if week_start > max_future_week_start:
            return Response(
                _error_payload(
                    "Only one future week is available.",
                    code="future_week_limit_exceeded",
                ),
                status=400,
            )

        week_end = week_start + timedelta(days=6)
        if week_start > today:
            return Response(
                {
                    "focus": None,
                    "focus_date": None,
                    "is_current_week": False,
                    "week": {
                        "start_date": str(week_start),
                        "end_date": str(week_end),
                        "completion": None,
                    },
                    "daily": [],
                    "evaluated_days": 0,
                    "total_days": 7,
                    "progress_end_date": None,
                    "week_phase": "future",
                    "baseline_date": str(_metrics_baseline_date(request.user, [])),
                }
            )

        focus_date = min(week_end, today)
        payload = _compute_range_metrics(request.user, week_start, week_end)
        evaluated_daily = [
            row for row in payload["daily"] if row["date"] <= str(today)
        ]

        focus_row = next(
            (row for row in evaluated_daily if row["date"] == str(focus_date)),
            {
                "date": str(focus_date),
                "completion": None,
                "done": 0,
                "total": 0,
            },
        )
        week_completion = _overall_completion(evaluated_daily)
        evaluated_days = len(evaluated_daily)

        return Response(
            {
                "focus": focus_row,
                "focus_date": str(focus_date),
                "is_current_week": week_start == current_week_start,
                "week": {
                    "start_date": str(week_start),
                    "end_date": str(week_end),
                    "completion": week_completion,
                },
                "daily": evaluated_daily,
                "evaluated_days": evaluated_days,
                "total_days": 7,
                "progress_end_date": str(focus_date),
                "week_phase": _week_progress_phase(evaluated_days),
                "baseline_date": payload["range"]["baseline_date"],
            }
        )

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """Return historical metric series for custom or preset ranges."""
        end_date_str = request.query_params.get('end_date')
        start_date_str = request.query_params.get('start_date')
        days_str = request.query_params.get('days', '90')

        try:
            end_date = (
                datetime.strptime(end_date_str, "%Y-%m-%d").date()
                if end_date_str
                else timezone.localdate()
            )
        except ValueError:
            return Response(_error_payload("Invalid end_date format", code="invalid_end_date"), status=400)

        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(_error_payload("Invalid start_date format", code="invalid_start_date"), status=400)
        else:
            try:
                days = max(7, min(365, int(days_str)))
            except ValueError:
                return Response(_error_payload("days must be a valid integer", code="invalid_days"), status=400)
            start_date = end_date - timedelta(days=days - 1)

        if start_date > end_date:
            return Response(_error_payload("start_date must be before end_date", code="invalid_range"), status=400)

        payload = _compute_range_metrics(request.user, start_date, end_date)
        return Response(payload)

    @action(detail=False, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request):
        """Return ranking metrics using schedule-aware calculations."""
        cache_key = f"leaderboard:v2:{timezone.localdate().isoformat()}"
        cache_ttl = int(getattr(settings, 'LEADERBOARD_CACHE_TTL', 600))
        lock_key = f"{cache_key}:lock"
        cached_payload = cache.get(cache_key)
        if cached_payload is not None:
            response = Response(cached_payload)
            response['Cache-Control'] = f'private, max-age={cache_ttl}'
            return response

        lock_acquired = cache.add(lock_key, '1', timeout=30)
        if not lock_acquired:
            cached_payload = cache.get(cache_key)
            if cached_payload is not None:
                response = Response(cached_payload)
                response['Cache-Control'] = f'private, max-age={cache_ttl}'
                return response

        try:
            today = timezone.localdate()
            week_start = today - timedelta(days=today.weekday())
            month_start = today.replace(day=1)

            top_limit = int(getattr(settings, 'LEADERBOARD_TOP_RESULTS', 20))
            leaders_limit = int(getattr(settings, 'LEADERBOARD_LEADERS_LIMIT', 10))

            max_users = int(getattr(settings, 'LEADERBOARD_MAX_USERS', 200))
            api_today = str(today)
            api_week_start = str(week_start)
            api_month_start = str(month_start)

            users = list(
                User.objects.filter(is_superuser=False)
                .annotate(
                    habits_count=Count(
                        'habit',
                        distinct=True,
                    )
                )
                .filter(habits_count__gt=0)
                .select_related('profile')
                .prefetch_related(
                    Prefetch(
                        'habit_set',
                        queryset=Habit.objects
                        .only('id', 'user_id', 'name', 'days', 'start_date', 'archived_at')
                        .prefetch_related(
                            Prefetch(
                                'schedules',
                                queryset=HabitSchedule.objects.only(
                                    'habit_id',
                                    'effective_from',
                                    'days',
                                ).order_by('effective_from'),
                            )
                        ),
                        to_attr='all_habits',
                    )
                )
                .order_by('username')[:max_users]
            )

            selected_user_ids = [user.id for user in users]
            logs_by_user = defaultdict(list)
            if selected_user_ids:
                earliest_baseline = min(
                    _metrics_baseline_date(user, [])
                    for user in users
                )
                logs = HabitLog.objects.filter(habit__user_id__in=selected_user_ids).order_by('date')
                logs = logs.filter(
                    date__range=(earliest_baseline, today),
                ).select_related('habit').only('habit_id', 'habit__user_id', 'date', 'status')
                for log in logs:
                    logs_by_user[log.habit.user_id].append(log)

            # Calculate schedule-aware metrics for each user
            user_metrics = []
            for user in users:
                habits = list(getattr(user, 'all_habits', []))
                if not habits:
                    continue

                schedule_map = _build_schedule_map(habits)
                logs_map = {
                    (log.habit_id, str(log.date)): log.status
                    for log in logs_by_user.get(user.id, [])
                }

                baseline = _metrics_baseline_date(user, habits)
                all_metrics = _compute_range_metrics(
                    user, baseline, today, habits, schedule_map, logs_map
                )

                all_daily_rows = all_metrics['daily']
                if not all_daily_rows:
                    continue

                today_row = next(
                    (row for row in all_daily_rows if row['date'] == api_today),
                    None,
                )
                daily_completion = (today_row or {}).get('completion') or 0

                weekly_rows = [
                    row for row in all_daily_rows
                    if row['date'] >= api_week_start
                ]
                weekly_completion = _overall_completion(weekly_rows) or 0

                monthly_rows = [
                    row for row in all_daily_rows
                    if row['date'] >= api_month_start
                ]
                monthly_completion = _overall_completion(monthly_rows) or 0

                historical_completion = _overall_completion(all_daily_rows) or 0

                # Include users with active habits even when all metrics are 0%.
                user_metrics.append({
                    'user': user,
                    'daily_completion': daily_completion or 0,
                    'weekly_completion': weekly_completion or 0,
                    'monthly_completion': monthly_completion or 0,
                    'historical_completion': historical_completion or 0,
                })

            # Sort by completion metrics (daily primary, then weekly, monthly, historical as tiebreaker)
            user_metrics.sort(
                key=lambda x: (
                    -x['daily_completion'],
                    -x['weekly_completion'],
                    -x['monthly_completion'],
                    -x['historical_completion'],
                    x['user'].username,
                )
            )

            # Build ranking results
            ranking = []
            for metric in user_metrics[:top_limit]:
                user = metric['user']
                profile = getattr(user, 'profile', None)
                avatar_url = None
                if profile and profile.avatar:
                    avatar_url = request.build_absolute_uri(profile.avatar.url)

                ranking.append({
                    'username': user.username,
                    'display_name': (user.first_name or '').strip() or user.username,
                    'avatar_file_url': avatar_url,
                    'daily_completion': round(metric['daily_completion'], 0),
                    'weekly_completion': round(metric['weekly_completion'], 0),
                    'monthly_completion': round(metric['monthly_completion'], 0),
                    'historical_completion': round(metric['historical_completion'], 0),
                })

            total_ranked_users = len(user_metrics)

            # Build metric leaders
            metric_leaders = {}
            for metric_key in ['daily_completion', 'weekly_completion', 'historical_completion']:
                if not user_metrics:
                    metric_leaders[metric_key] = {'score': None, 'leaders': []}
                    continue

                top_score = max(metric[metric_key] for metric in user_metrics)
                leaders = [
                    m for m in user_metrics
                    if abs(m[metric_key] - top_score) < 0.5
                ][:leaders_limit]

                metric_leaders[metric_key] = {
                    'score': round(top_score, 0),
                    'leaders': [
                        {
                            'username': m['user'].username,
                            'display_name': (m['user'].first_name or '').strip() or m['user'].username,
                            metric_key: round(m[metric_key], 0),
                        }
                        for m in leaders
                    ],
                }

            payload = {
                'range': {
                    'day': {
                        'start_date': str(today),
                        'end_date': str(today),
                    },
                    'week': {
                        'start_date': str(week_start),
                        'end_date': str(today),
                    },
                    'month': {
                        'start_date': str(month_start),
                        'end_date': str(today),
                    },
                },
                'highlights': {
                    'daily': {
                        'score': metric_leaders['daily_completion']['score'],
                        'leaders': metric_leaders['daily_completion']['leaders'],
                        'total': total_ranked_users,
                    },
                    'weekly': {
                        'score': metric_leaders['weekly_completion']['score'],
                        'leaders': metric_leaders['weekly_completion']['leaders'],
                        'total': total_ranked_users,
                    },
                    'historical': {
                        'score': metric_leaders['historical_completion']['score'],
                        'leaders': metric_leaders['historical_completion']['leaders'],
                        'total': total_ranked_users,
                    },
                },
                'results': ranking,
            }

            cache.set(cache_key, payload, timeout=cache_ttl)
        finally:
            if lock_acquired:
                cache.delete(lock_key)

        response = Response(payload)
        response['Cache-Control'] = f'private, max-age={cache_ttl}'
        return response


class HabitLogViewSet(viewsets.ModelViewSet):
    """Endpoint for user-scoped habit log reads and upserts."""

    serializer_class = HabitLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HabitLog.objects.filter(habit__user=self.request.user)

    def create(self, request, *args, **kwargs):
        payload_serializer = HabitLogUpsertSerializer(
            data=request.data,
            context={"request": request},
        )
        payload_serializer.is_valid(raise_exception=True)

        habit = payload_serializer.validated_data["habit"]
        log_date = payload_serializer.validated_data["date"]
        status_value = payload_serializer.validated_data["status"]

        if status_value == "pending":
            HabitLog.objects.filter(habit=habit, date=log_date).delete()
            _invalidate_leaderboard_cache()
            return Response(
                {
                    "habit": habit.id,
                    "date": str(log_date),
                    "status": "pending",
                },
                status=status.HTTP_200_OK,
            )

        log, created = HabitLog.objects.update_or_create(
            habit=habit,
            date=log_date,
            defaults={"status": status_value}
        )
        _invalidate_leaderboard_cache()

        serializer = self.get_serializer(log)
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=response_status)


class RegisterView(APIView):
    """Public endpoint for account creation."""

    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        try:
            _send_welcome_email(user)
        except Exception:
            logger.exception("Failed to send welcome email for user_id=%s", user.id)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProfileView(APIView):
    """Authenticated endpoint to read and update the current user profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except (OSError, SuspiciousOperation):
            return Response(
                _error_payload(
                    "No se pudo guardar la imagen de perfil. Intenta de nuevo en unos segundos.",
                    code="avatar_storage_error",
                ),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProfilePasswordResetView(APIView):
    """Authenticated endpoint to email a password-reset link to current user."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        user = request.user

        if not user.email:
            return Response(
                _error_payload(
                    "Tu cuenta no tiene un correo registrado para recuperar contraseña.",
                    code="email_missing",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            _send_password_reset_email(user)
        except Exception:
            logger.exception("Failed to send authenticated password reset email for user_id=%s", user.id)
            return Response(
                _error_payload(
                    "No se pudo enviar el correo de recuperación. Intenta nuevamente en unos minutos.",
                    code="email_send_failed",
                ),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "detail": "Te enviamos un correo con instrucciones para restablecer tu contraseña.",
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """Public endpoint to request a password-reset email from login."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        if not email:
            return Response(
                _error_payload(
                    "El correo electrónico es obligatorio.",
                    code="email_required",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email, is_active=True).first()

        # Avoid account enumeration: return the same success payload either way.
        if user and user.has_usable_password():
            try:
                _send_password_reset_email(user)
            except Exception:
                logger.exception("Failed to send public password reset email for user_id=%s", user.id)

        return Response(
            {
                "detail": "Si existe una cuenta con ese correo, te enviamos instrucciones para restablecer la contraseña.",
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Public endpoint to set a new password with uid/token credentials."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not uid or not token or not new_password:
            return Response(
                _error_payload(
                    "uid, token y new_password son obligatorios.",
                    code="reset_payload_required",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                _error_payload(
                    "El enlace de recuperación no es válido o expiró.",
                    code="reset_link_invalid",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                _error_payload(
                    "El enlace de recuperación no es válido o expiró.",
                    code="reset_link_invalid",
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user)
        except ValidationError as exc:
            return Response(
                _error_payload(
                    "La nueva contraseña no cumple los requisitos de seguridad.",
                    code="password_validation_error",
                    errors=exc.messages,
                ),
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        _increment_token_version(user)

        try:
            _send_password_changed_email(user)
        except Exception:
            logger.exception("Failed to send password-changed email for user_id=%s", user.id)

        return Response(
            {"detail": "Tu contraseña se actualizó correctamente."},
            status=status.HTTP_200_OK,
        )


class CaseInsensitiveTokenObtainPairView(TokenObtainPairView):
    """JWT token endpoint using case-insensitive username auth serializer."""

    throttle_classes = [LoginRateThrottle]
    serializer_class = CaseInsensitiveTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        """Issue access token in body and refresh token in HttpOnly cookie."""
        response = super().post(request, *args, **kwargs)

        refresh_token = response.data.pop('refresh', None)
        if refresh_token:
            response.set_cookie(
                key=settings.AUTH_REFRESH_COOKIE,
                value=refresh_token,
                max_age=settings.AUTH_REFRESH_COOKIE_MAX_AGE,
                httponly=settings.AUTH_REFRESH_COOKIE_HTTP_ONLY,
                secure=settings.AUTH_REFRESH_COOKIE_SECURE,
                samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
                path=settings.AUTH_REFRESH_COOKIE_PATH,
            )

        response['Cache-Control'] = 'no-store'
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Refresh access token using HttpOnly refresh-token cookie."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        refresh_value = request.data.get('refresh') or request.COOKIES.get(settings.AUTH_REFRESH_COOKIE)
        if not refresh_value:
            return Response(
                _error_payload('No se encontró el token de actualización.', code='refresh_missing'),
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = VersionedTokenRefreshSerializer(data={'refresh': refresh_value})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            return Response(
                _error_payload('El token de actualización es inválido o ya no está disponible.', code='refresh_invalid'),
                status=status.HTTP_401_UNAUTHORIZED,
            )
        response = Response(serializer.validated_data, status=status.HTTP_200_OK)

        new_refresh = response.data.pop('refresh', None)
        if new_refresh:
            response.set_cookie(
                key=settings.AUTH_REFRESH_COOKIE,
                value=new_refresh,
                max_age=settings.AUTH_REFRESH_COOKIE_MAX_AGE,
                httponly=settings.AUTH_REFRESH_COOKIE_HTTP_ONLY,
                secure=settings.AUTH_REFRESH_COOKIE_SECURE,
                samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
                path=settings.AUTH_REFRESH_COOKIE_PATH,
            )

        response['Cache-Control'] = 'no-store'
        return response


class LogoutView(APIView):
    """Clear refresh cookie and blacklist refresh token when available."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_value = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE)
        if refresh_value:
            try:
                token = RefreshToken(refresh_value)
                token.blacklist()
            except Exception:
                # Keep logout idempotent even if token is expired/invalid.
                pass

        response = Response({'detail': 'Sesión cerrada correctamente.'}, status=status.HTTP_200_OK)
        response.delete_cookie(
            settings.AUTH_REFRESH_COOKIE,
            path=settings.AUTH_REFRESH_COOKIE_PATH,
            samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
        )
        response['Cache-Control'] = 'no-store'
        return response