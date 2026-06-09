from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NewsViewSet, ForumSectionViewSet, ForumTopicViewSet, ForumReplyViewSet, PlatformStatsView

router = DefaultRouter()
router.register('news', NewsViewSet, basename='news')
router.register('sections', ForumSectionViewSet, basename='forum-sections')
router.register('topics', ForumTopicViewSet, basename='forum-topics')
router.register('replies', ForumReplyViewSet, basename='forum-replies')

urlpatterns = [
    path('stats/', PlatformStatsView.as_view(), name='platform-stats'),
    path('', include(router.urls)),
]
