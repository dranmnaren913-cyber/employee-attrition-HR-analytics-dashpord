from django.db import migrations


def deactivate_legacy_demo_accounts(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    database = schema_editor.connection.alias
    User.objects.using(database).filter(
        email__in=['manager@hranalytics.com', 'employee@hranalytics.com'],
        created_by__isnull=True,
    ).update(is_active=False, password='!')


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0003_user_created_by'),
    ]

    operations = [
        migrations.RunPython(deactivate_legacy_demo_accounts, migrations.RunPython.noop),
    ]