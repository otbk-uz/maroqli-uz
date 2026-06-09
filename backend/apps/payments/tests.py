from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from apps.payments.models import Transaction, Subscription

User = get_user_model()

class PaymentsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testgamer',
            email='gamer@test.com',
            password='TestPassword123!',
            full_name='Gamer Test',
            age=20,
            region='TOSHKENT_S',
            phone_number='+998901234567',
            role=User.Role.GAMER
        )
        self.client.force_authenticate(user=self.user)

    def test_create_transaction_success(self):
        url = reverse('create-transaction')
        data = {
            'provider': 'PAYME',
            'plan': 'monthly'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('transaction_id', response.data)
        self.assertEqual(response.data['amount'], 29000.0)
        self.assertEqual(response.data['provider'], 'PAYME')

        # Check in DB
        tx = Transaction.objects.get(id=response.data['transaction_id'])
        self.assertEqual(tx.user, self.user)
        self.assertEqual(tx.status, Transaction.Status.PENDING)

    def test_user_subscription_view_free(self):
        url = reverse('user-subscription')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['has_active_subscription'])
        self.assertEqual(response.data['plan_name'], 'Free Plan')

    def test_payme_callback_flow(self):
        # 1. Create a transaction
        tx = Transaction.objects.create(
            user=self.user,
            amount=29000.00,
            provider=Transaction.Provider.PAYME,
            status=Transaction.Status.PENDING
        )

        payme_url = reverse('payme-callback')

        # 2. CheckPerformTransaction
        check_data = {
            'method': 'CheckPerformTransaction',
            'params': {
                'amount': 2900000, # in tiyins
                'account': {
                    'transaction_id': tx.id
                }
            },
            'id': 1
        }
        # Callbacks are public
        self.client.logout()
        response = self.client.post(payme_url, check_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['result']['allow'])

        # 3. CreateTransaction
        create_data = {
            'method': 'CreateTransaction',
            'params': {
                'id': 'payme-tx-999',
                'amount': 2900000,
                'account': {
                    'transaction_id': tx.id
                }
            },
            'id': 2
        }
        response = self.client.post(payme_url, create_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['result']['state'], 1)

        # Verify DB updated external_id
        tx.refresh_from_db()
        self.assertEqual(tx.external_id, 'payme-tx-999')

        # 4. PerformTransaction
        perform_data = {
            'method': 'PerformTransaction',
            'params': {
                'id': 'payme-tx-999'
            },
            'id': 3
        }
        response = self.client.post(payme_url, perform_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['result']['state'], 2)

        # Verify DB updated status and activated subscription
        tx.refresh_from_db()
        self.assertEqual(tx.status, Transaction.Status.COMPLETED)
        
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_premium)
        self.assertEqual(self.user.subscription.plan_name, 'Oylik Premium')
        self.assertTrue(self.user.subscription.is_active)

    def test_click_callback_flow(self):
        tx = Transaction.objects.create(
            user=self.user,
            amount=79000.00,
            provider=Transaction.Provider.CLICK,
            status=Transaction.Status.PENDING
        )

        click_url = reverse('click-callback')
        self.client.logout()

        # Prepare Action (action=0)
        prepare_data = {
            'click_trans_id': 'click-tx-888',
            'merchant_trans_id': tx.id,
            'amount': '79000.00',
            'action': 0,
            'error': 0
        }
        response = self.client.post(click_url, prepare_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['error'], 0)

        tx.refresh_from_db()
        self.assertEqual(tx.external_id, 'click-tx-888')

        # Complete Action (action=1)
        complete_data = {
            'click_trans_id': 'click-tx-888',
            'merchant_trans_id': tx.id,
            'amount': '79000.00',
            'action': 1,
            'error': 0
        }
        response = self.client.post(click_url, complete_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['error'], 0)

        tx.refresh_from_db()
        self.assertEqual(tx.status, Transaction.Status.COMPLETED)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_premium)
        self.assertEqual(self.user.subscription.plan_name, '3 Oylik Premium')
