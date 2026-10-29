from rest_framework import permissions

class IsHRAdmin(permissions.BasePermission):
    """Allows access only to HR Admins."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'HR_ADMIN')

class IsManager(permissions.BasePermission):
    """Allows access to Managers."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'MANAGER')

class IsHRAdminOrManager(permissions.BasePermission):
    """Allows access to HR Admins and Managers."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['HR_ADMIN', 'MANAGER'])

class IsEmployee(permissions.BasePermission):
    """Allows access to Employees."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'EMPLOYEE')
