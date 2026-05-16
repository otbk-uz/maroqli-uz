from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.CreateTransactionView.as_view(), name='create-transaction'),
    path('callback/payme/', views.PaymeCallbackView.as_view(), name='payme-callback'),
    path('callback/click/', views.ClickCallbackView.as_view(), name='click-callback'),
]
