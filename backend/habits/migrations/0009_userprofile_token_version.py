from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('habits', '0008_remove_non_binary_gender_option'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='token_version',
            field=models.PositiveIntegerField(default=0),
        ),
    ]