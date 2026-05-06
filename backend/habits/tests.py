from datetime import date, timedelta
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core import mail
from django.conf import settings
from django.utils import timezone
from django.test import override_settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Habit, HabitLog


class HabitApiTests(APITestCase):
	def setUp(self):
		self.today = timezone.localdate()
		self.week_start = self.today - timedelta(days=self.today.weekday())
		self.tomorrow = self.today + timedelta(days=1)
		self.yesterday = self.today - timedelta(days=1)

		self.user_1 = User.objects.create_user(
			username='alice',
			password='Passw0rd123',
			email='alice@example.com',
		)
		self.user_2 = User.objects.create_user(
			username='bob',
			password='Passw0rd123',
			email='bob@example.com',
		)

		self.habit_user_1 = Habit.objects.create(
			user=self.user_1,
			name='Read 20 mins',
			days=['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			start_date=self.week_start,
		)
		self.habit_user_2 = Habit.objects.create(
			user=self.user_2,
			name='Run 5km',
			days=['monday', 'wednesday', 'friday'],
			start_date=self.week_start,
		)

	def authenticate(self, username, password):
		token_response = self.client.post(
			'/api/token/',
			{'username': username, 'password': password},
			format='json',
		)
		self.assertEqual(token_response.status_code, status.HTTP_200_OK)
		access = token_response.data['access']
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_register_user(self):
		payload = {
			'username': 'charlie',
			'email': 'charlie@example.com',
			'password': 'Passw0rd123',
		}
		response = self.client.post('/api/register/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['username'], 'charlie')
		self.assertTrue(User.objects.filter(username='charlie').exists())
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('Bienvenido a VOLICION', mail.outbox[0].subject)
		self.assertIn('charlie@example.com', mail.outbox[0].to)

	def test_register_rejects_duplicate_username_and_email(self):
		payload = {
			'username': 'ALICE',
			'email': 'Alice@Example.com',
			'password': 'Passw0rd123',
		}
		response = self.client.post('/api/register/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		errors = response.data.get('errors', {})
		self.assertIn('username', errors)
		self.assertIn('email', errors)
		self.assertIn('Este nombre de usuario ya está en uso.', errors['username'])
		self.assertIn('Este correo electrónico ya está en uso.', errors['email'])

	def test_register_returns_spanish_messages_for_missing_fields(self):
		response = self.client.post('/api/register/', {}, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		errors = response.data.get('errors', {})
		self.assertIn('El nombre de usuario es obligatorio.', errors.get('username', []))
		self.assertIn('El correo electrónico es obligatorio.', errors.get('email', []))
		self.assertIn('La contraseña es obligatoria.', errors.get('password', []))

	def test_case_insensitive_login_with_username(self):
		response = self.client.post(
			'/api/token/',
			{'username': 'ALICE', 'password': 'Passw0rd123'},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('access', response.data)
		self.assertNotIn('refresh', response.data)
		self.assertIn('habit_tracker_refresh', response.cookies)

	def test_login_returns_spanish_message_for_invalid_credentials(self):
		response = self.client.post(
			'/api/token/',
			{'username': 'alice', 'password': 'wrong-pass'},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertEqual(response.data['detail'], 'Usuario o contraseña incorrectos.')

	def test_login_returns_spanish_message_for_missing_credentials(self):
		response = self.client.post('/api/token/', {}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		errors = response.data.get('errors', {})
		self.assertIn('El usuario es obligatorio.', errors.get('username', []))
		self.assertIn('La contraseña es obligatoria.', errors.get('password', []))

	def test_refresh_uses_http_only_cookie(self):
		login_response = self.client.post(
			'/api/token/',
			{'username': 'alice', 'password': 'Passw0rd123'},
			format='json',
		)
		self.assertEqual(login_response.status_code, status.HTTP_200_OK)

		refresh_response = self.client.post('/api/token/refresh/', {}, format='json')
		self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
		self.assertIn('access', refresh_response.data)
		self.assertNotIn('refresh', refresh_response.data)

	def test_logout_blacklists_and_clears_refresh_cookie(self):
		login_response = self.client.post(
			'/api/token/',
			{'username': 'alice', 'password': 'Passw0rd123'},
			format='json',
		)
		self.assertEqual(login_response.status_code, status.HTTP_200_OK)
		access = login_response.data['access']
		refresh_token = login_response.cookies[settings.AUTH_REFRESH_COOKIE].value

		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
		logout_response = self.client.post('/api/logout/', {}, format='json')
		self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
		self.assertIn('habit_tracker_refresh', logout_response.cookies)

		refresh_response = self.client.post(
			'/api/token/refresh/',
			{},
			format='json',
			HTTP_COOKIE=f"{settings.AUTH_REFRESH_COOKIE}={refresh_token}",
		)
		self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_weekly_returns_only_current_user_habits(self):
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.get(f'/api/habits/weekly/?start_date={self.week_start}')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data['habits']), 1)
		self.assertEqual(response.data['habits'][0]['habit_id'], self.habit_user_1.id)

	def test_cannot_upsert_log_for_other_user_habit(self):
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.post(
			'/api/logs/',
			{
				'habit': self.habit_user_2.id,
				'date': str(self.today),
				'status': 'done',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertFalse(
			HabitLog.objects.filter(
				habit=self.habit_user_2,
				date=str(self.today),
			).exists()
		)

	def test_upsert_log_create_then_update(self):
		self.authenticate('alice', 'Passw0rd123')

		create_response = self.client.post(
			'/api/logs/',
			{
				'habit': self.habit_user_1.id,
				'date': str(self.today),
				'status': 'done',
			},
			format='json',
		)
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		update_response = self.client.post(
			'/api/logs/',
			{
				'habit': self.habit_user_1.id,
				'date': str(self.today),
				'status': 'missed',
			},
			format='json',
		)
		self.assertEqual(update_response.status_code, status.HTTP_200_OK)

		log = HabitLog.objects.get(habit=self.habit_user_1, date=str(self.today))
		self.assertEqual(log.status, 'missed')

	def test_pending_status_removes_existing_log(self):
		self.authenticate('alice', 'Passw0rd123')

		HabitLog.objects.create(
			habit=self.habit_user_1,
			date=str(self.today),
			status='done',
		)

		response = self.client.post(
			'/api/logs/',
			{
				'habit': self.habit_user_1.id,
				'date': str(self.today),
				'status': 'pending',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertFalse(
			HabitLog.objects.filter(
				habit=self.habit_user_1,
				date=str(self.today),
			).exists()
		)

	def test_log_update_is_rejected_for_future_date(self):
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.post(
			'/api/logs/',
			{
				'habit': self.habit_user_1.id,
				'date': str(self.tomorrow),
				'status': 'done',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('date', response.data.get('errors', {}))

	def test_log_update_is_rejected_for_past_date(self):
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.post(
			'/api/logs/',
			{
				'habit': self.habit_user_1.id,
				'date': str(self.yesterday),
				'status': 'missed',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('date', response.data.get('errors', {}))

	def test_editing_days_preserves_past_history(self):
		self.authenticate('alice', 'Passw0rd123')

		HabitLog.objects.create(
			habit=self.habit_user_1,
			date=str(self.today),
			status='done',
		)

		patch_response = self.client.patch(
			f'/api/habits/{self.habit_user_1.id}/',
			{'days': ['tuesday', 'wednesday', 'thursday', 'friday']},
			format='json',
		)
		expected_status = status.HTTP_200_OK if self.today.weekday() == 6 else status.HTTP_403_FORBIDDEN
		self.assertEqual(patch_response.status_code, expected_status)
		if expected_status == status.HTTP_403_FORBIDDEN:
			return

		weekly_response = self.client.get(f'/api/habits/weekly/?start_date={self.week_start}')
		self.assertEqual(weekly_response.status_code, status.HTTP_200_OK)

		habit_row = weekly_response.data['habits'][0]
		self.assertEqual(habit_row['week'][str(self.today)], 'done')

	def test_history_endpoint_returns_daily_weekly_monthly(self):
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.get('/api/habits/history/?days=30')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('daily', response.data)
		self.assertIn('weekly', response.data)
		self.assertIn('monthly', response.data)

	def test_history_returns_empty_until_baseline_when_no_applicable_data(self):
		self.authenticate('alice', 'Passw0rd123')

		future_start = timezone.localdate().replace(year=timezone.localdate().year + 1)
		self.habit_user_1.start_date = future_start
		self.habit_user_1.save(update_fields=['start_date'])

		response = self.client.get('/api/habits/history/?days=30')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data['daily']), 1)
		self.assertIsNone(response.data['daily'][0]['completion'])
		self.assertEqual(response.data['daily'][0]['total'], 0)
		self.assertIsNone(response.data['summary']['average_daily_completion'])

	def test_weekly_returns_null_percentages_before_metrics_baseline(self):
		self.authenticate('alice', 'Passw0rd123')

		future_start = timezone.localdate().replace(year=timezone.localdate().year + 1)
		self.habit_user_1.start_date = future_start
		self.habit_user_1.save(update_fields=['start_date'])

		week_start = timezone.localdate() - timedelta(days=timezone.localdate().weekday())
		response = self.client.get(f'/api/habits/weekly/?start_date={week_start}')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIsNone(response.data['average_completion'])
		self.assertTrue(all(value is None for value in response.data['daily_percentages'].values()))

	def test_profile_patch_updates_extended_fields(self):
		self.authenticate('alice', 'Passw0rd123')

		payload = {
			'first_name': 'Alice',
			'last_name': 'Walker',
			'birth_date': '1995-04-12',
			'weight_kg': '62.50',
			'gender': 'female',
		}
		response = self.client.patch('/api/profile/', payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['first_name'], 'Alice')
		self.assertEqual(response.data['gender'], 'female')

	def test_weekly_includes_streak_metrics(self):
		self.authenticate('alice', 'Passw0rd123')

		HabitLog.objects.create(
			habit=self.habit_user_1,
			date=str(self.today),
			status='done',
		)

		response = self.client.get(f'/api/habits/weekly/?start_date={self.week_start}')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('streak_current', response.data['habits'][0])
		self.assertIn('streak_best', response.data['habits'][0])

	def test_streak_counts_consecutive_done_days(self):
		"""Several consecutive 'done' logs should produce a non-zero streak."""
		self.authenticate('alice', 'Passw0rd123')

		# Habit is Mon-Fri starting on this week's Monday. Mark Mon..today done.
		monday = self.week_start
		days_done = []
		cursor = monday
		while cursor <= self.today and cursor.weekday() < 5:
			HabitLog.objects.create(
				habit=self.habit_user_1,
				date=str(cursor),
				status='done',
			)
			days_done.append(cursor)
			cursor += timedelta(days=1)

		response = self.client.get(f'/api/habits/weekly/?start_date={self.week_start}')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		habit_row = response.data['habits'][0]
		self.assertEqual(habit_row['streak_current'], len(days_done))
		self.assertEqual(habit_row['streak_best'], len(days_done))

	def test_streak_today_pending_does_not_break_streak(self):
		"""A pending status today should be neutral, not reset the streak."""
		self.authenticate('alice', 'Passw0rd123')

		# Mark every prior weekday this week as done; today stays pending.
		monday = self.week_start
		days_done = []
		cursor = monday
		while cursor < self.today and cursor.weekday() < 5:
			HabitLog.objects.create(
				habit=self.habit_user_1,
				date=str(cursor),
				status='done',
			)
			days_done.append(cursor)
			cursor += timedelta(days=1)

		# Skip the test if today isn't a weekday for this habit (no pending day).
		if self.today.weekday() >= 5 or not days_done:
			return

		response = self.client.get(f'/api/habits/weekly/?start_date={self.week_start}')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		habit_row = response.data['habits'][0]
		# Today is still pending — should not break the streak.
		self.assertEqual(habit_row['streak_current'], len(days_done))

	def test_tracker_metrics_endpoint(self):
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.get(f'/api/habits/tracker-metrics/?start_date={self.week_start}')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('focus', response.data)
		self.assertIn('focus_date', response.data)
		self.assertIn('is_current_week', response.data)
		self.assertIn('week', response.data)
		self.assertIn('daily', response.data)
		self.assertIn('evaluated_days', response.data)
		self.assertIn('total_days', response.data)
		self.assertTrue(all(row['date'] <= str(self.today) for row in response.data['daily']))

	def test_tracker_metrics_allows_future_week(self):
		self.authenticate('alice', 'Passw0rd123')

		future_week = self.week_start + timedelta(days=7)
		response = self.client.get(f'/api/habits/tracker-metrics/?start_date={future_week}')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['week']['start_date'], str(future_week))
		self.assertIsNone(response.data['week']['completion'])
		self.assertIsNone(response.data['focus_date'])
		self.assertIsNone(response.data['focus'])
		self.assertEqual(len(response.data['daily']), 0)
		self.assertEqual(response.data['evaluated_days'], 0)
		self.assertEqual(response.data['week_phase'], 'future')

	def test_tracker_metrics_rejects_more_than_one_future_week(self):
		self.authenticate('alice', 'Passw0rd123')

		future_week = self.week_start + timedelta(days=14)
		response = self.client.get(f'/api/habits/tracker-metrics/?start_date={future_week}')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get('code'), 'future_week_limit_exceeded')

	def test_tracker_metrics_normalizes_non_monday_start_date(self):
		self.authenticate('alice', 'Passw0rd123')

		non_monday = self.week_start + timedelta(days=1)
		response = self.client.get(f'/api/habits/tracker-metrics/?start_date={non_monday}')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['week']['start_date'], str(self.week_start))

	def test_weekly_metrics_contains_average_and_daily_percentages(self):
		self.authenticate('alice', 'Passw0rd123')

		HabitLog.objects.create(
			habit=self.habit_user_1,
			date=str(self.today),
			status='done',
		)

		response = self.client.get(f'/api/habits/weekly/?start_date={self.week_start}')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('average_completion', response.data)
		self.assertIn('daily_percentages', response.data)
		self.assertIn(str(self.today), response.data['daily_percentages'])

	def test_soft_delete_preserves_previous_day_metrics(self):
		self.authenticate('alice', 'Passw0rd123')

		HabitLog.objects.create(habit=self.habit_user_1, date=str(self.today), status='done')
		second_habit = Habit.objects.create(
			user=self.user_1,
			name='Study 30 mins',
			days=['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
			start_date=self.week_start,
		)

		response_before = self.client.get(f'/api/habits/history/?start_date={self.today}&end_date={self.today}')
		self.assertEqual(response_before.status_code, status.HTTP_200_OK)
		self.assertEqual(response_before.data['daily'][0]['completion'], 50)

		delete_response = self.client.delete(f'/api/habits/{second_habit.id}/')
		expected_status = status.HTTP_204_NO_CONTENT if self.today.weekday() == 6 else status.HTTP_403_FORBIDDEN
		self.assertEqual(delete_response.status_code, expected_status)
		if expected_status == status.HTTP_403_FORBIDDEN:
			return

		response_after = self.client.get(f'/api/habits/history/?start_date={self.today}&end_date={self.today}')
		self.assertEqual(response_after.status_code, status.HTTP_200_OK)
		self.assertEqual(response_after.data['daily'][0]['completion'], 50)

	def test_leaderboard_endpoint_returns_users(self):
		self.authenticate('alice', 'Passw0rd123')
		HabitLog.objects.create(habit=self.habit_user_1, date=str(self.today), status='done')

		response = self.client.get('/api/habits/leaderboard/?days=30')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('results', response.data)
		if response.data['results']:
			self.assertIn('daily_completion', response.data['results'][0])
			self.assertIn('weekly_completion', response.data['results'][0])
			self.assertIn('monthly_completion', response.data['results'][0])

	def test_leaderboard_includes_users_with_zero_completion(self):
		self.authenticate('alice', 'Passw0rd123')
		cache.clear()

		response = self.client.get('/api/habits/leaderboard/?days=30')
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		usernames = [row['username'] for row in response.data['results']]
		self.assertIn('alice', usernames)
		self.assertIn('bob', usernames)

		for row in response.data['results']:
			if row['username'] == 'alice' or row['username'] == 'bob':
				self.assertEqual(row['daily_completion'], 0)
				self.assertEqual(row['weekly_completion'], 0)
				self.assertEqual(row['monthly_completion'], 0)
				self.assertEqual(row['historical_completion'], 0)

	def test_leaderboard_includes_user_with_only_archived_habits_metrics(self):
		self.authenticate('alice', 'Passw0rd123')
		cache.clear()

		archived_user = User.objects.create_user(
			username='carol',
			password='Passw0rd123',
			email='carol@example.com',
		)
		archived_user.date_joined = timezone.now() - timedelta(days=30)
		archived_user.save(update_fields=['date_joined'])

		archived_habit = Habit.objects.create(
			user=archived_user,
			name='Archived reading',
			days=['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
			start_date=self.today - timedelta(days=10),
			is_archived=True,
			archived_at=self.today,
		)

		for offset in range(1, 6):
			HabitLog.objects.create(
				habit=archived_habit,
				date=str(self.today - timedelta(days=offset)),
				status='done',
			)

		response = self.client.get('/api/habits/leaderboard/?days=30')
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		rows_by_user = {row['username']: row for row in response.data['results']}
		self.assertIn('carol', rows_by_user)
		self.assertGreater(rows_by_user['carol']['historical_completion'], 0)

	def test_leaderboard_excludes_user_without_habits_or_metrics(self):
		self.authenticate('alice', 'Passw0rd123')
		cache.clear()

		User.objects.create_user(
			username='newbie',
			password='Passw0rd123',
			email='newbie@example.com',
		)

		response = self.client.get('/api/habits/leaderboard/?days=30')
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		usernames = [row['username'] for row in response.data['results']]
		self.assertNotIn('newbie', usernames)

	def test_leaderboard_highlights_use_top_score_per_metric(self):
		self.authenticate('alice', 'Passw0rd123')
		cache.clear()

		self.user_1.date_joined = timezone.now() - timedelta(days=2)
		self.user_1.save(update_fields=['date_joined'])
		self.user_2.date_joined = timezone.now() - timedelta(days=10)
		self.user_2.save(update_fields=['date_joined'])

		self.habit_user_1.days = [
			'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
		]
		self.habit_user_1.start_date = self.today - timedelta(days=2)
		self.habit_user_1.save(update_fields=['days', 'start_date'])

		HabitLog.objects.create(
			habit=self.habit_user_1,
			date=str(self.today),
			status='done',
		)

		self.habit_user_2.days = [
			'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
		]
		self.habit_user_2.start_date = self.today - timedelta(days=10)
		self.habit_user_2.save(update_fields=['days', 'start_date'])

		for offset in range(1, 11):
			HabitLog.objects.create(
				habit=self.habit_user_2,
				date=str(self.today - timedelta(days=offset)),
				status='done',
			)

		response = self.client.get('/api/habits/leaderboard/?days=30')
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		historical_highlight = response.data['highlights']['historical']
		self.assertEqual(historical_highlight['score'], 91)
		self.assertEqual(historical_highlight['leaders'][0]['username'], 'bob')

	def test_leaderboard_weekly_highlight_returns_multiple_leaders_on_tie(self):
		self.authenticate('alice', 'Passw0rd123')
		cache.clear()

		self.habit_user_1.days = [
			'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
		]
		self.habit_user_2.days = [
			'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
		]
		self.habit_user_1.start_date = self.today
		self.habit_user_2.start_date = self.today
		self.habit_user_1.save(update_fields=['days', 'start_date'])
		self.habit_user_2.save(update_fields=['days', 'start_date'])

		HabitLog.objects.create(habit=self.habit_user_1, date=str(self.today), status='done')
		HabitLog.objects.create(habit=self.habit_user_2, date=str(self.today), status='done')

		response = self.client.get('/api/habits/leaderboard/?days=30')
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		weekly_highlight = response.data['highlights']['weekly']
		leaders = weekly_highlight['leaders']
		self.assertEqual(weekly_highlight['score'], 100)
		self.assertGreaterEqual(len(leaders), 2)
		leader_usernames = {item['username'] for item in leaders}
		self.assertIn('alice', leader_usernames)
		self.assertIn('bob', leader_usernames)

	def test_profile_remove_avatar_clears_avatar_url(self):
		self.authenticate('alice', 'Passw0rd123')

		response_set = self.client.patch(
			'/api/profile/',
			{'avatar_url': 'https://example.com/avatar.png'},
			format='json',
		)
		self.assertEqual(response_set.status_code, status.HTTP_200_OK)

		response_remove = self.client.patch(
			'/api/profile/',
			{'remove_avatar': True},
			format='json',
		)
		self.assertEqual(response_remove.status_code, status.HTTP_200_OK)
		self.assertEqual(response_remove.data['avatar_url'], '')

	def test_edit_habit_rejected_when_not_sunday(self):
		if self.today.weekday() == 6:
			self.skipTest('Test requires a non-Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')
		response = self.client.patch(
			f'/api/habits/{self.habit_user_1.id}/',
			{'days': ['monday', 'wednesday']},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertIn('detail', response.data)

	def test_delete_habit_rejected_when_not_sunday(self):
		if self.today.weekday() == 6:
			self.skipTest('Test requires a non-Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')
		response = self.client.delete(f'/api/habits/{self.habit_user_1.id}/')
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertIn('detail', response.data)

	def test_create_habit_starts_next_monday(self):
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.post(
			'/api/habits/',
			{
				'name': 'New delayed habit',
				'days': ['monday', 'wednesday'],
			},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)

		expected_start = self.today + timedelta(days=((7 - self.today.weekday()) % 7 or 7))
		created_habit = Habit.objects.get(id=response.data['id'])
		self.assertEqual(created_habit.start_date, expected_start)

	def test_edit_habit_days_apply_next_monday_when_sunday(self):
		if self.today.weekday() != 6:
			self.skipTest('Test requires Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')
		current_days = list(self.habit_user_1.days)

		response = self.client.patch(
			f'/api/habits/{self.habit_user_1.id}/',
			{'days': ['tuesday', 'thursday']},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		self.habit_user_1.refresh_from_db()
		self.assertEqual(self.habit_user_1.days, current_days)

		next_monday = self.today + timedelta(days=1)
		scheduled = self.habit_user_1.schedules.get(effective_from=next_monday)
		self.assertEqual(scheduled.days, ['tuesday', 'thursday'])

	def test_edit_newly_created_next_week_habit_updates_same_upcoming_week(self):
		if self.today.weekday() != 6:
			self.skipTest('Test requires Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')

		create_response = self.client.post(
			'/api/habits/',
			{
				'name': 'Cocinar',
				'days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
			},
			format='json',
		)
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		habit_id = create_response.data['id']
		edit_response = self.client.patch(
			f'/api/habits/{habit_id}/',
			{'days': ['monday']},
			format='json',
		)
		self.assertEqual(edit_response.status_code, status.HTTP_200_OK)

		next_week_start = self.week_start + timedelta(days=7)
		weekly_response = self.client.get(
			f'/api/habits/weekly/?start_date={next_week_start}'
		)
		self.assertEqual(weekly_response.status_code, status.HTTP_200_OK)

		habit_row = next(
			item for item in weekly_response.data['habits']
			if item['habit_id'] == habit_id
		)
		monday = str(next_week_start)
		tuesday = str(next_week_start + timedelta(days=1))
		self.assertEqual(habit_row['week'][monday], 'pending')
		self.assertEqual(habit_row['week'][tuesday], 'skip')
		self.assertEqual(habit_row['days'], ['monday'])

	def test_edit_habit_to_all_days_reflects_in_next_week_days_payload(self):
		if self.today.weekday() != 6:
			self.skipTest('Test requires Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')

		response = self.client.patch(
			f'/api/habits/{self.habit_user_1.id}/',
			{
				'days': [
					'monday',
					'tuesday',
					'wednesday',
					'thursday',
					'friday',
					'saturday',
					'sunday',
				]
			},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		next_week_start = self.week_start + timedelta(days=7)
		weekly_response = self.client.get(
			f'/api/habits/weekly/?start_date={next_week_start}'
		)
		self.assertEqual(weekly_response.status_code, status.HTTP_200_OK)

		habit_row = next(
			item for item in weekly_response.data['habits']
			if item['habit_id'] == self.habit_user_1.id
		)
		next_monday = self.today + timedelta(days=1)
		scheduled = self.habit_user_1.schedules.get(effective_from=next_monday)
		self.assertEqual(
			scheduled.days,
			['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
		)

	def test_weekly_returns_editable_days_for_next_effective_schedule(self):
		if self.today.weekday() != 6:
			self.skipTest('Test requires Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')

		response = self.client.patch(
			f'/api/habits/{self.habit_user_1.id}/',
			{
				'days': [
					'monday',
					'tuesday',
					'wednesday',
					'thursday',
					'friday',
					'saturday',
					'sunday',
				]
			},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		weekly_response = self.client.get(f'/api/habits/weekly/?start_date={self.week_start}')
		self.assertEqual(weekly_response.status_code, status.HTTP_200_OK)

		habit_row = next(
			item for item in weekly_response.data['habits']
			if item['habit_id'] == self.habit_user_1.id
		)
		self.assertEqual(
			habit_row['editable_days'],
			['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
		)

	def test_edit_habit_name_is_rejected_even_on_sunday(self):
		if self.today.weekday() != 6:
			self.skipTest('Test requires Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')

		response = self.client.patch(
			f'/api/habits/{self.habit_user_1.id}/',
			{'name': 'Nombre nuevo no permitido'},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('name', response.data.get('errors', {}))

	def test_delete_habit_effective_next_monday_when_sunday(self):
		if self.today.weekday() != 6:
			self.skipTest('Test requires Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')

		response = self.client.delete(f'/api/habits/{self.habit_user_1.id}/')
		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

		self.habit_user_1.refresh_from_db()
		self.assertEqual(self.habit_user_1.archived_at, self.today + timedelta(days=1))
		self.assertFalse(self.habit_user_1.is_archived)

		weekly_response = self.client.get(f'/api/habits/weekly/?start_date={self.week_start}')
		self.assertEqual(weekly_response.status_code, status.HTTP_200_OK)
		habit_row = next(
			item for item in weekly_response.data['habits']
			if item['habit_id'] == self.habit_user_1.id
		)
		self.assertTrue(habit_row['pending_removal'])
		self.assertEqual(habit_row['removal_effective_date'], str(self.today + timedelta(days=1)))

		second_delete = self.client.delete(f'/api/habits/{self.habit_user_1.id}/')
		self.assertEqual(second_delete.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(second_delete.data.get('code'), 'habit_already_scheduled_for_removal')

		next_week_start = self.week_start + timedelta(days=7)
		next_week_response = self.client.get(
			f'/api/habits/weekly/?start_date={next_week_start}'
		)
		self.assertEqual(next_week_response.status_code, status.HTTP_200_OK)
		next_week_habit_ids = [item['habit_id'] for item in next_week_response.data['habits']]
		self.assertNotIn(self.habit_user_1.id, next_week_habit_ids)

	def test_delete_never_started_habit_removes_it_completely_when_sunday(self):
		if self.today.weekday() != 6:
			self.skipTest('Test requires Sunday runtime day.')

		self.authenticate('alice', 'Passw0rd123')

		create_response = self.client.post(
			'/api/habits/',
			{
				'name': 'Temporary habit',
				'days': ['monday', 'tuesday'],
			},
			format='json',
		)
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		habit_id = create_response.data['id']
		delete_response = self.client.delete(f'/api/habits/{habit_id}/')
		self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

		self.assertFalse(Habit.objects.filter(id=habit_id).exists())

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_profile_password_reset_sends_email_to_authenticated_user(self):
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.post('/api/profile/password-reset/', {}, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('Restablece tu contraseña en VOLICION', mail.outbox[0].subject)
		self.assertIn('alice@example.com', mail.outbox[0].to)

	def test_profile_password_reset_requires_email(self):
		self.user_1.email = ''
		self.user_1.save(update_fields=['email'])
		self.authenticate('alice', 'Passw0rd123')

		response = self.client.post('/api/profile/password-reset/', {}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get('code'), 'email_missing')

	def test_password_reset_confirm_updates_password(self):
		uid = urlsafe_base64_encode(force_bytes(self.user_1.pk))
		token = default_token_generator.make_token(self.user_1)

		response = self.client.post(
			'/api/password-reset/confirm/',
			{
				'uid': uid,
				'token': token,
				'new_password': 'N3wPassw0rd#2026',
			},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('Tu contraseña de VOLICION fue actualizada', mail.outbox[0].subject)

		login_response = self.client.post(
			'/api/token/',
			{'username': 'alice', 'password': 'N3wPassw0rd#2026'},
			format='json',
		)
		self.assertEqual(login_response.status_code, status.HTTP_200_OK)

	def test_password_reset_confirm_invalidates_previous_tokens(self):
		login_response = self.client.post(
			'/api/token/',
			{'username': 'alice', 'password': 'Passw0rd123'},
			format='json',
		)
		self.assertEqual(login_response.status_code, status.HTTP_200_OK)
		access = login_response.data['access']
		refresh_token = login_response.cookies[settings.AUTH_REFRESH_COOKIE].value

		uid = urlsafe_base64_encode(force_bytes(self.user_1.pk))
		token = default_token_generator.make_token(self.user_1)
		reset_response = self.client.post(
			'/api/password-reset/confirm/',
			{
				'uid': uid,
				'token': token,
				'new_password': 'N3wPassw0rd#2026',
			},
			format='json',
		)
		self.assertEqual(reset_response.status_code, status.HTTP_200_OK)

		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
		profile_response = self.client.get('/api/profile/')
		self.assertEqual(profile_response.status_code, status.HTTP_401_UNAUTHORIZED)

		refresh_response = self.client.post(
			'/api/token/refresh/',
			{},
			format='json',
			HTTP_COOKIE=f"{settings.AUTH_REFRESH_COOKIE}={refresh_token}",
		)
		self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_password_reset_confirm_rejects_invalid_token(self):
		uid = urlsafe_base64_encode(force_bytes(self.user_1.pk))

		response = self.client.post(
			'/api/password-reset/confirm/',
			{
				'uid': uid,
				'token': 'invalid-token',
				'new_password': 'N3wPassw0rd#2026',
			},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get('code'), 'reset_link_invalid')

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_password_reset_request_sends_email_for_existing_account(self):
		response = self.client.post(
			'/api/password-reset/request/',
			{'email': 'alice@example.com'},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('Restablece tu contraseña en VOLICION', mail.outbox[0].subject)
		self.assertIn('alice@example.com', mail.outbox[0].to)

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_password_reset_request_returns_generic_success_for_unknown_email(self):
		response = self.client.post(
			'/api/password-reset/request/',
			{'email': 'nobody@example.com'},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(mail.outbox), 0)

	def test_password_reset_request_requires_email(self):
		response = self.client.post('/api/password-reset/request/', {}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get('code'), 'email_required')

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	@patch('habits.views.EmailMultiAlternatives.send', side_effect=Exception('smtp down'))
	def test_profile_password_reset_returns_error_when_email_fails(self, mock_send_mail):
		self.authenticate('alice', 'Passw0rd123')

		with self.assertLogs('habits.views', level='ERROR'):
			response = self.client.post('/api/profile/password-reset/', {}, format='json')

		self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
		self.assertEqual(response.data.get('code'), 'email_send_failed')

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	@patch('habits.views.EmailMultiAlternatives.send', side_effect=Exception('smtp down'))
	def test_password_reset_request_logs_email_failure_but_returns_generic_success(self, mock_send_mail):
		with self.assertLogs('habits.views', level='ERROR'):
			response = self.client.post(
				'/api/password-reset/request/',
				{'email': 'alice@example.com'},
				format='json',
			)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('detail', response.data)


class HealthzTests(APITestCase):
	def test_healthz_returns_200_when_db_and_cache_ok(self):
		response = self.client.get('/api/healthz')
		self.assertEqual(response.status_code, 200)
		body = response.json()
		self.assertEqual(body['status'], 'ok')
		self.assertEqual(body['checks']['db'], 'ok')
		self.assertEqual(body['checks']['cache'], 'ok')

	def test_healthz_rejects_post(self):
		response = self.client.post('/api/healthz')
		self.assertEqual(response.status_code, 405)
