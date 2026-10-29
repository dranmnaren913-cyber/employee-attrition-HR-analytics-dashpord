from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    HRRegistrationView,
    AccountManagementView,
    AccountDetailManagementView,
    CurrentUserView,
    LogoutView,
    ForgotPasswordView,
    ResetPasswordView
)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('register-hr/', HRRegistrationView.as_view(), name='auth_register_hr'),
    path('accounts/', AccountManagementView.as_view(), name='auth_accounts'),
    path('accounts/<int:account_id>/', AccountDetailManagementView.as_view(), name='auth_account_detail'),
    path('refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('me/', CurrentUserView.as_view(), name='auth_me'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth_reset_password'),
]
