from django.db import migrations, models


def migrate_non_binary_to_prefer_not_to_say(apps, schema_editor):
    UserProfile = apps.get_model('habits', 'UserProfile')
    UserProfile.objects.filter(gender='non_binary').update(gender='prefer_not_to_say')


class Migration(migrations.Migration):

    dependencies = [
        ('habits', '0007_habit_habit_user_arch_idx_habit_habit_user_start_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(
            migrate_non_binary_to_prefer_not_to_say,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='gender',
            field=models.CharField(
                choices=[
                    ('male', 'Male'),
                    ('female', 'Female'),
                    ('prefer_not_to_say', 'Prefer not to say'),
                ],
                default='prefer_not_to_say',
                max_length=20,
            ),
        ),
    ]
