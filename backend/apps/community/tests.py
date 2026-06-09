from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.community.models import News, ForumSection, ForumTopic, ForumReply

User = get_user_model()

class CommunityAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="gamer_forum",
            email="forum@playnation.uz",
            password="SecurePassword123",
            full_name="Gamer Forum",
            age=22,
            region="TOSHKENT_S",
            phone_number="+998991234567"
        )
        self.admin = User.objects.create_superuser(
            username="admin_forum",
            email="admin_forum@playnation.uz",
            password="AdminPassword123",
            full_name="Admin Forum",
            age=30,
            region="TOSHKENT_S",
            phone_number="+998991234568"
        )
        self.section = ForumSection.objects.create(name="Dota 2", description="Dota 2 muhokamalari")

    def test_news_list_and_detail(self):
        # Create news item
        news = News.objects.create(
            title="Katta Turnir Boshlandi",
            content="Barcha ishtirokchilarga omad tilaymiz!",
            category="ESPORT",
            author=self.admin
        )
        
        # Test anonymous access to news list
        response = self.client.get("/api/community/news/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Test anonymous access to news detail
        response = self.client.get(f"/api/community/news/{news.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Katta Turnir Boshlandi")

    def test_forum_topic_creation_requires_auth(self):
        data = {
            "title": "Yangi strategiyalar",
            "section": self.section.id,
            "content": "Mana bu mening yangi dota 2 strategiyam..."
        }
        
        # Unauthorized check
        response = self.client.post("/api/community/topics/", data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authorized check
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/community/topics/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ForumTopic.objects.count(), 1)
        self.assertEqual(ForumTopic.objects.first().title, "Yangi strategiyalar")

    def test_forum_reply_posting(self):
        # Create a topic first
        topic = ForumTopic.objects.create(
            section=self.section,
            title="CS2 vs Valorant",
            content="Qaysi biri yaxshiroq?",
            author=self.user
        )

        data = {
            "topic": topic.id,
            "content": "Albatta CS2 eng yaxshisi!"
        }

        # Auth and post reply
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/community/replies/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ForumReply.objects.count(), 1)
        self.assertEqual(ForumReply.objects.first().content, "Albatta CS2 eng yaxshisi!")
