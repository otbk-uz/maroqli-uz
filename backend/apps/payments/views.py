import json
import logging
from django.utils import timezone
from datetime import timedelta
from rest_framework import views, status, response, permissions
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Transaction, Subscription
from .serializers import TransactionSerializer

User = get_user_model()

logger = logging.getLogger(__name__)

PLANS = {
    'monthly': {
        'name': 'Oylik Premium',
        'amount': 29000.00,
        'days': 30
    },
    'quarterly': {
        'name': '3 Oylik Premium',
        'amount': 79000.00,
        'days': 90
    },
    'yearly': {
        'name': 'Yillik Premium',
        'amount': 290000.00,
        'days': 365
    }
}

class CreateTransactionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        provider = request.data.get('provider')
        plan_key = request.data.get('plan')

        if not provider or provider not in [Transaction.Provider.PAYME, Transaction.Provider.CLICK]:
            return response.Response(
                {"error": "Noto'g'ri to'lov tizimi tanlandi. (PAYME yoki CLICK bo'lishi kerak)"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if not plan_key or plan_key not in PLANS:
            return response.Response(
                {"error": "Noto'g'ri obuna rejasi tanlandi."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        plan = PLANS[plan_key]
        amount = plan['amount']

        # Create a pending transaction
        transaction = Transaction.objects.create(
            user=request.user,
            amount=amount,
            provider=provider,
            status=Transaction.Status.PENDING,
            description=f"{plan['name']} obunasi uchun to'lov"
        )

        return response.Response({
            "message": "To'lov muvaffaqiyatli boshlandi",
            "transaction_id": transaction.id,
            "amount": float(transaction.amount),
            "provider": transaction.provider,
            "status": transaction.status,
            "plan_name": plan['name'],
            # Mock redirect or parameters for simulation
            "payment_url": f"/premium/pay-simulate?transaction_id={transaction.id}&provider={provider.lower()}"
        }, status=status.HTTP_201_CREATED)

class UserSubscriptionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            sub = request.user.subscription
            return response.Response({
                "has_active_subscription": request.user.is_premium,
                "plan_name": sub.plan_name,
                "is_active": sub.is_active,
                "expires_at": sub.expires_at
            })
        except Subscription.DoesNotExist:
            return response.Response({
                "has_active_subscription": False,
                "plan_name": "Free Plan",
                "is_active": False,
                "expires_at": None
            })

class PaymeCallbackView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        method = data.get('method')
        params = data.get('params', {})
        request_id = data.get('id')

        if not method:
            return response.Response({
                "error": {
                    "code": -32600,
                    "message": "Invalid Request"
                },
                "id": request_id
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. CheckPerformTransaction
        if method == 'CheckPerformTransaction':
            amount = params.get('amount') # in tiyins
            account = params.get('account', {})
            transaction_id = account.get('transaction_id')

            if not transaction_id:
                return response.Response({
                    "error": {
                        "code": -31050,
                        "message": {
                            "uz": "Tranzaksiya topilmadi",
                            "ru": "Транзакция не найдена",
                            "en": "Transaction not found"
                        }
                    },
                    "id": request_id
                })

            transaction = Transaction.objects.filter(id=transaction_id).first()
            if not transaction:
                return response.Response({
                    "error": {
                        "code": -31050,
                        "message": {"uz": "Tranzaksiya topilmadi"}
                    },
                    "id": request_id
                })

            # Check amount (Payme amount is in tiyins: 1 UZS = 100 tiyins)
            expected_tiyins = int(transaction.amount * 100)
            if int(amount) != expected_tiyins:
                return response.Response({
                    "error": {
                        "code": -31001,
                        "message": {"uz": "Noto'g'ri to'lov miqdori"}
                    },
                    "id": request_id
                })

            return response.Response({
                "result": {
                    "allow": True
                },
                "id": request_id
            })

        # 2. CreateTransaction
        elif method == 'CreateTransaction':
            payme_trans_id = params.get('id')
            amount = params.get('amount')
            account = params.get('account', {})
            transaction_id = account.get('transaction_id')

            transaction = Transaction.objects.filter(id=transaction_id).first()
            if not transaction:
                return response.Response({
                    "error": {
                        "code": -31050,
                        "message": {"uz": "Tranzaksiya topilmadi"}
                    },
                    "id": request_id
                })

            # Check if there is already a transaction with this external_id
            existing_trans = Transaction.objects.filter(external_id=payme_trans_id).first()
            if existing_trans:
                create_time = int(existing_trans.created_at.timestamp() * 1000)
                state = 1 if existing_trans.status == Transaction.Status.PENDING else 2 if existing_trans.status == Transaction.Status.COMPLETED else -1
                return response.Response({
                    "result": {
                        "createTime": create_time,
                        "transaction": str(existing_trans.id),
                        "state": state
                    },
                    "id": request_id
                })

            # Verify that our local transaction has no other external_id associated
            if transaction.external_id and transaction.external_id != payme_trans_id:
                return response.Response({
                    "error": {
                        "code": -31099,
                        "message": {"uz": "Tranzaksiya band yoki allaqachon to'langan"}
                    },
                    "id": request_id
                })

            # Update local transaction
            transaction.external_id = payme_trans_id
            transaction.status = Transaction.Status.PENDING
            transaction.save()

            create_time = int(transaction.created_at.timestamp() * 1000)
            return response.Response({
                "result": {
                    "createTime": create_time,
                    "transaction": str(transaction.id),
                    "state": 1
                },
                "id": request_id
            })

        # 3. PerformTransaction
        elif method == 'PerformTransaction':
            payme_trans_id = params.get('id')
            transaction = Transaction.objects.filter(external_id=payme_trans_id).first()

            if not transaction:
                return response.Response({
                    "error": {
                        "code": -31050,
                        "message": {"uz": "Tranzaksiya topilmadi"}
                    },
                    "id": request_id
                })

            if transaction.status == Transaction.Status.COMPLETED:
                perform_time = int(transaction.updated_at.timestamp() * 1000)
                return response.Response({
                    "result": {
                        "transaction": str(transaction.id),
                        "performTime": perform_time,
                        "state": 2
                    },
                    "id": request_id
                })

            if transaction.status == Transaction.Status.PENDING:
                transaction.status = Transaction.Status.COMPLETED
                transaction.save()

                # Activate/Extend subscription
                days = 30
                plan_name = "Oylik Premium"
                amount_val = float(transaction.amount)
                if abs(amount_val - 79000.0) < 1.0:
                    days = 90
                    plan_name = "3 Oylik Premium"
                elif abs(amount_val - 290000.0) < 1.0:
                    days = 365
                    plan_name = "Yillik Premium"

                sub, created = Subscription.objects.get_or_create(
                    user=transaction.user,
                    defaults={
                        'plan_name': plan_name,
                        'is_active': True,
                        'expires_at': timezone.now() + timedelta(days=days)
                    }
                )
                if not created:
                    sub.plan_name = plan_name
                    sub.is_active = True
                    if sub.expires_at > timezone.now():
                        sub.expires_at += timedelta(days=days)
                    else:
                        sub.expires_at = timezone.now() + timedelta(days=days)
                    sub.save()

                perform_time = int(transaction.updated_at.timestamp() * 1000)
                return response.Response({
                    "result": {
                        "transaction": str(transaction.id),
                        "performTime": perform_time,
                        "state": 2
                    },
                    "id": request_id
                })

            return response.Response({
                "error": {
                    "code": -31008,
                    "message": {"uz": "Tranzaksiyani bajarish imkonsiz"}
                },
                "id": request_id
            })

        # 4. CancelTransaction
        elif method == 'CancelTransaction':
            payme_trans_id = params.get('id')
            reason = params.get('reason')
            transaction = Transaction.objects.filter(external_id=payme_trans_id).first()

            if not transaction:
                return response.Response({
                    "error": {
                        "code": -31050,
                        "message": {"uz": "Tranzaksiya topilmadi"}
                    },
                    "id": request_id
                })

            if transaction.status == Transaction.Status.CANCELLED:
                cancel_time = int(transaction.updated_at.timestamp() * 1000)
                return response.Response({
                    "result": {
                        "transaction": str(transaction.id),
                        "cancelTime": cancel_time,
                        "state": -1
                    },
                    "id": request_id
                })

            transaction.status = Transaction.Status.CANCELLED
            transaction.description = f"Payme bekor qildi. Sabab: {reason}"
            transaction.save()

            try:
                sub = transaction.user.subscription
                sub.is_active = False
                sub.save()
            except Subscription.DoesNotExist:
                pass

            cancel_time = int(transaction.updated_at.timestamp() * 1000)
            return response.Response({
                "result": {
                    "transaction": str(transaction.id),
                    "cancelTime": cancel_time,
                    "state": -1
                },
                "id": request_id
            })

        # 5. CheckTransaction
        elif method == 'CheckTransaction':
            payme_trans_id = params.get('id')
            transaction = Transaction.objects.filter(external_id=payme_trans_id).first()

            if not transaction:
                return response.Response({
                    "error": {
                        "code": -31050,
                        "message": {"uz": "Tranzaksiya topilmadi"}
                    },
                    "id": request_id
                })

            create_time = int(transaction.created_at.timestamp() * 1000)
            perform_time = int(transaction.updated_at.timestamp() * 1000) if transaction.status == Transaction.Status.COMPLETED else 0
            cancel_time = int(transaction.updated_at.timestamp() * 1000) if transaction.status == Transaction.Status.CANCELLED else 0
            state = 1 if transaction.status == Transaction.Status.PENDING else 2 if transaction.status == Transaction.Status.COMPLETED else -1

            return response.Response({
                "result": {
                    "createTime": create_time,
                    "performTime": perform_time,
                    "cancelTime": cancel_time,
                    "transaction": str(transaction.id),
                    "state": state,
                    "reason": None
                },
                "id": request_id
            })

        return response.Response({
            "error": {
                "code": -32601,
                "message": "Method not found"
            },
            "id": request_id
        })

class ClickCallbackView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        click_trans_id = data.get('click_trans_id') if data.get('click_trans_id') is not None else request.POST.get('click_trans_id')
        merchant_trans_id = data.get('merchant_trans_id') if data.get('merchant_trans_id') is not None else request.POST.get('merchant_trans_id')
        amount = data.get('amount') if data.get('amount') is not None else request.POST.get('amount')
        action = data.get('action') if data.get('action') is not None else request.POST.get('action')
        error = data.get('error') if data.get('error') is not None else request.POST.get('error')

        if click_trans_id is None or merchant_trans_id is None or amount is None or action is None or error is None:
            return response.Response({
                "error": -3,
                "error_note": "Missing required parameters"
            }, status=status.HTTP_400_BAD_REQUEST)

        transaction = Transaction.objects.filter(id=merchant_trans_id).first()
        if not transaction:
            return response.Response({
                "error": -5,
                "error_note": "Transaction not found"
            })

        if int(error) < 0:
            transaction.status = Transaction.Status.FAILED
            transaction.save()
            return response.Response({
                "error": int(error),
                "error_note": "Click returned error"
            })

        if int(action) == 0:
            if float(amount) != float(transaction.amount):
                return response.Response({
                    "error": -2,
                    "error_note": "Incorrect amount"
                })

            if transaction.status in [Transaction.Status.COMPLETED, Transaction.Status.CANCELLED]:
                return response.Response({
                    "error": -4,
                    "error_note": "Already processed"
                })

            transaction.external_id = click_trans_id
            transaction.save()

            return response.Response({
                "error": 0,
                "error_note": "Success",
                "click_trans_id": click_trans_id,
                "merchant_trans_id": merchant_trans_id
            })

        elif int(action) == 1:
            if transaction.status == Transaction.Status.COMPLETED:
                return response.Response({
                    "error": 0,
                    "error_note": "Success",
                    "click_trans_id": click_trans_id,
                    "merchant_trans_id": merchant_trans_id
                })

            transaction.status = Transaction.Status.COMPLETED
            transaction.external_id = click_trans_id
            transaction.save()

            # Activate/Extend subscription
            days = 30
            plan_name = "Oylik Premium"
            amount_val = float(transaction.amount)
            if abs(amount_val - 79000.0) < 1.0:
                days = 90
                plan_name = "3 Oylik Premium"
            elif abs(amount_val - 290000.0) < 1.0:
                days = 365
                plan_name = "Yillik Premium"

            sub, created = Subscription.objects.get_or_create(
                user=transaction.user,
                defaults={
                    'plan_name': plan_name,
                    'is_active': True,
                    'expires_at': timezone.now() + timedelta(days=days)
                }
            )
            if not created:
                sub.plan_name = plan_name
                sub.is_active = True
                if sub.expires_at > timezone.now():
                    sub.expires_at += timedelta(days=days)
                else:
                    sub.expires_at = timezone.now() + timedelta(days=days)
                sub.save()

            return response.Response({
                "error": 0,
                "error_note": "Success",
                "click_trans_id": click_trans_id,
                "merchant_trans_id": merchant_trans_id
            })

        return response.Response({
            "error": -3,
            "error_note": "Action not found"
        })

class TransactionDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        transaction = get_object_or_404(Transaction, id=pk, user=request.user)
        return response.Response({
            "id": transaction.id,
            "amount": float(transaction.amount),
            "provider": transaction.provider,
            "status": transaction.status,
            "description": transaction.description
        })
