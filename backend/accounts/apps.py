from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        from django.db import connection
        from .models import ensure_default_hr_account

        if not connection.connection:
            return

        ensure_default_hr_account()
