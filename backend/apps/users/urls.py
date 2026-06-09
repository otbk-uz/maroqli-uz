from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('notifications', views.NotificationViewSet, basename='notifications')
router.register('admin/users', views.UserAdminViewSet, basename='admin-users')

urlpatterns = [
    path('me/', views.UserProfileView.as_view(), name='user-me'),
    path('register/', views.UserRegisterView.as_view(), name='user-register'),
    path('google-login/', views.GoogleLoginView.as_view(), name='google-login'),
    path('', include(router.urls)),
]
