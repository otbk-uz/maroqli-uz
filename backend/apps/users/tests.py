from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User

class UserModelTestCase(TestCase):
    def test_user_creation_with_fields(self):
        user = User.objects.create_user(
            username="gamer_test",
            email="test@playnation.uz",
            password="Password123",
            full_name="Test Gamer",
            age=20,
            region="TOSHKENT_S",
            phone_number="+998931112233",
            role=User.Role.GAMER
        )
        self.assertEqual(user.username, "gamer_test")
        self.assertEqual(user.full_name, "Test Gamer")
        self.assertEqual(user.age, 20)
        self.assertEqual(user.region, "TOSHKENT_S")
        self.assertEqual(user.phone_number, "+998931112233")
        self.assertEqual(user.role, User.Role.GAMER)
        self.assertTrue(user.check_password("Password123"))

class UserAPITestCase(APITestCase):
    def setUp(self):
        self.register_url = reverse('user-register')
        self.login_url = reverse('token_obtain_pair')
        
    def test_register_success(self):
        data = {
            "username": "tester123",
            "email": "tester@playnation.uz",
            "password": "SecurePassword1",
            "full_name": "Test User",
            "age": 25,
            "region": "SAMARQAND",
            "phone_number": "+998931234567",
            "role": "GAMER"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        user = User.objects.first()
        self.assertEqual(user.username, "tester123")
        self.assertEqual(user.nickname, "tester123") # check automatic nickname fallback

    def test_register_invalid_data(self):
        # Invalid phone format and under age
        data = {
            "username": "tester123",
            "email": "tester@playnation.uz",
            "password": "SecurePassword1",
            "full_name": "Test User",
            "age": 8, # Too young (min 10)
            "region": "SAMARQAND",
            "phone_number": "998931234567", # Missing +
            "role": "GAMER"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('age', response.data)
        self.assertIn('phone_number', response.data)

    def test_login_with_username_or_email_or_phone(self):
        # Create user
        user = User.objects.create_user(
            username="gamer_boss",
            email="boss@playnation.uz",
            password="BossPassword1",
            full_name="Gamer Boss",
            age=30,
            region="TOSHKENT_S",
            phone_number="+998909998877",
            role=User.Role.GAMER
        )
        
        # Test login with Username
        response = self.client.post(self.login_url, {"username": "gamer_boss", "password": "BossPassword1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], "gamer_boss")
        
        # Test login with Email
        response = self.client.post(self.login_url, {"username": "boss@playnation.uz", "password": "BossPassword1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], "gamer_boss")

        # Test login with Phone Number
        response = self.client.post(self.login_url, {"username": "+998909998877", "password": "BossPassword1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], "gamer_boss")

class NotificationTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="gamer_boss",
            email="boss@playnation.uz",
            password="BossPassword1",
            full_name="Gamer Boss",
            age=30,
            region="TOSHKENT_S",
            phone_number="+998909998877",
            role=User.Role.GAMER
        )
        self.client.force_authenticate(user=self.user)
        
        from apps.users.models import Notification
        self.n1 = Notification.objects.create(
            user=self.user,
            title="Turnir 1",
            message="Test xabari 1"
        )
        self.n2 = Notification.objects.create(
            user=self.user,
            title="Turnir 2",
            message="Test xabari 2"
        )

    def test_list_notifications(self):
        url = reverse('notifications-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_read_notification(self):
        url = reverse('notifications-read', kwargs={'pk': self.n1.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.n1.refresh_from_db()
        self.assertTrue(self.n1.is_read)

    def test_read_all_notifications(self):
        url = reverse('notifications-read-all')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.n1.refresh_from_db()
        self.n2.refresh_from_db()
        self.assertTrue(self.n1.is_read)
        self.assertTrue(self.n2.is_read)

class AdminUserTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="gamer_boss",
            email="boss@playnation.uz",
            password="BossPassword1",
            full_name="Gamer Boss",
            age=30,
            region="TOSHKENT_S",
            phone_number="+998909998877",
            role=User.Role.GAMER
        )
        
        self.admin = User.objects.create_user(
            username="admin_boss",
            email="admin@playnation.uz",
            password="BossPassword1",
            full_name="Admin Boss",
            age=30,
            region="TOSHKENT_S",
            phone_number="+998909998811",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True
        )

    def test_list_users_as_regular_user_fails(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('admin-users-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_users_as_admin_success(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-users-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_override_role_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-users-detail', kwargs={'pk': self.user.id})
        response = self.client.patch(url, {'role': 'GAMEDEV'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'GAMEDEV')

    def test_role_admin_syncs_is_staff(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-users-detail', kwargs={'pk': self.user.id})
        
        # Change role to ADMIN -> is_staff should be True
        response = self.client.patch(url, {'role': 'ADMIN'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'ADMIN')
        self.assertTrue(self.user.is_staff)

        # Change role back to GAMER -> is_staff should be False
        response = self.client.patch(url, {'role': 'GAMER'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'GAMER')
        self.assertFalse(self.user.is_staff)



from unittest.mock import patch

class GoogleLoginTestCase(APITestCase):
    def setUp(self):
        self.google_login_url = reverse('google-login')

    @patch('requests.get')
    def test_google_login_success_existing_user(self, mock_get):
        # Create user first
        user = User.objects.create_user(
            username="gamer_boss",
            email="boss@playnation.uz",
            password="BossPassword1",
            full_name="Gamer Boss",
            age=30,
            region="TOSHKENT_S",
            phone_number="+998909998877",
            role=User.Role.GAMER
        )
        
        # Mock Google tokeninfo API response
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "aud": "144019147996-mv63kns1oi2fsec4hsh7i7rp0pdk95g.apps.googleusercontent.com",
            "email": "boss@playnation.uz",
            "name": "Gamer Boss"
        }

        response = self.client.post(self.google_login_url, {"id_token": "valid_mock_token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['email'], "boss@playnation.uz")

    @patch('requests.get')
    def test_google_login_success_create_user(self, mock_get):
        # Mock Google tokeninfo API response for a new user
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "aud": "144019147996-mv63kns1oi2fsec4hsh7i7rp0pdk95g.apps.googleusercontent.com",
            "email": "newuser@playnation.uz",
            "name": "New User"
        }

        response = self.client.post(self.google_login_url, {"id_token": "valid_mock_token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['email'], "newuser@playnation.uz")
        
        # Verify user is created in database
        self.assertTrue(User.objects.filter(email="newuser@playnation.uz").exists())

    @patch('requests.get')
    def test_google_login_invalid_token(self, mock_get):
        mock_response = mock_get.return_value
        mock_response.status_code = 400

        response = self.client.post(self.google_login_url, {"id_token": "invalid_mock_token"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

