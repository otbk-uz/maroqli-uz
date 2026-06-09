from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.tournaments.models import Game, Tournament, StoreGame, BoughtGame

User = get_user_model()

class TournamentsAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="gamer_tour",
            email="tour@playnation.uz",
            password="SecurePassword123",
            full_name="Gamer Tour",
            age=20,
            region="TOSHKENT_S",
            phone_number="+998991234560"
        )
        self.admin = User.objects.create_superuser(
            username="admin_tour",
            email="admin_tour@playnation.uz",
            password="AdminPassword123",
            full_name="Admin Tour",
            age=30,
            region="TOSHKENT_S",
            phone_number="+998991234561"
        )
        self.game = Game.objects.create(name="CS2", slug="cs2")
        self.tournament = Tournament.objects.create(
            title="CS2 Cup #1",
            description="Cup description",
            game=self.game,
            status="UPCOMING",
            max_participants=2,
            start_date=timezone.now() + timedelta(days=1)
        )
        self.store_game = StoreGame.objects.create(
            title="Tashkent Cyberpunk",
            slug="tashkent-cyberpunk",
            description="Indie game",
            price=25000.00,
            developer=self.admin
        )

    def test_tournaments_list(self):
        response = self.client.get("/api/tournaments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_join_leave_tournament(self):
        join_url = f"/api/tournaments/{self.tournament.id}/join/"
        
        # Join without auth
        response = self.client.post(join_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Join with auth
        self.client.force_authenticate(user=self.user)
        response = self.client.post(join_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'joined')
        self.assertEqual(self.tournament.participants.count(), 1)

        # Leave with auth
        response = self.client.post(join_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'left')
        self.assertEqual(self.tournament.participants.count(), 0)

    def test_buy_store_game(self):
        buy_url = "/api/tournaments/library/"
        data = {"game": self.store_game.id}

        # Auth and buy
        self.client.force_authenticate(user=self.user)
        response = self.client.post(buy_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("cd_key", response.data)
        self.assertEqual(BoughtGame.objects.count(), 1)

        # Try to buy again (must fail)
        response = self.client.post(buy_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
