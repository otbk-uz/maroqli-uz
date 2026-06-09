from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.CreateTransactionView.as_view(), name='create-transaction'),
    path('transactions/<int:pk>/', views.TransactionDetailView.as_view(), name='transaction-detail'),
    path('subscription/', views.UserSubscriptionView.as_view(), name='user-subscription'),
    path('callback/payme/', views.PaymeCallbackView.as_view(), name='payme-callback'),
    path('callback/click/', views.ClickCallbackView.as_view(), name='click-callback'),
]
