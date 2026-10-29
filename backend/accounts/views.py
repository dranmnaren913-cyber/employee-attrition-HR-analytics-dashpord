import secrets
from django.core.cache import cache
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    HRRegistrationSerializer,
    UserAccountCreateSerializer,
    ManagedAccountSerializer,
    ManagedAccountUpdateSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class HRRegistrationView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = HRRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': 'HR account created. You can now sign in.',
                'email': user.email,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AccountManagementView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'HR_ADMIN':
            return Response({'detail': 'Only HR administrators can view all accounts.'}, status=status.HTTP_403_FORBIDDEN)

        accounts = User.objects.select_related('department', 'employee', 'created_by').all()
        search = request.query_params.get('search', '').strip()
        role = request.query_params.get('role', '').strip()
        if search:
            accounts = accounts.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(department__department_name__icontains=search)
            )
        if role in dict(User.ROLE_CHOICES):
            accounts = accounts.filter(role=role)
        serializer = ManagedAccountSerializer(accounts.order_by('-created_at'), many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ('HR_ADMIN', 'MANAGER'):
            return Response({'detail': 'You cannot create accounts.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserAccountCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            return Response(ManagedAccountSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AccountDetailManagementView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, account_id):
        if request.user.role != 'HR_ADMIN':
            return Response({'detail': 'Only HR administrators can manage accounts.'}, status=status.HTTP_403_FORBIDDEN)
        account = get_object_or_404(User, pk=account_id)
        serializer = ManagedAccountUpdateSerializer(
            account,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if serializer.is_valid():
            return Response(ManagedAccountSerializer(serializer.save()).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        if 'new_password' in request.data or 'current_password' in request.data:
            serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'message': 'Password updated successfully',
                    'user': UserProfileSerializer(request.user, context={'request': request}).data,
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile updated successfully',
                'user': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # With JWT, frontend deletes tokens; backend can log or handle blacklisting
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)


class ForgotPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.get(email__iexact=email)
            token = f'{secrets.randbelow(1_000_000):06d}'
            cache.set(f'password_reset:{user.pk}', token, timeout=600)
            return Response({
                'message': 'Your 6-digit password reset code is ready. Enter it below to choose a new password.',
                'reset_code': token,
                'email': user.email
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']

            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

            cache_key = f'password_reset:{user.pk}'
            stored_token = cache.get(cache_key)
            if not stored_token or not secrets.compare_digest(stored_token, token):
                return Response({'error': 'Invalid or expired reset code.'}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.save()
            cache.delete(cache_key)
            return Response({'message': 'Password has been reset successfully. You can now log in.'}, status=status.HTTP_200_OK)
                
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
