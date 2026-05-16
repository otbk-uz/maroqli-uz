from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.UserProfileView.as_view(), name='user-me'),
    path('register/', views.UserRegisterView.as_view(), name='user-register'),
]
