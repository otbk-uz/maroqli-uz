from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TournamentViewSet, GameViewSet, StoreGameViewSet, GameReviewViewSet, BoughtGameViewSet

router = DefaultRouter()
router.register('games', GameViewSet, basename='games')
router.register('store', StoreGameViewSet, basename='store-games')
router.register('reviews', GameReviewViewSet, basename='game-reviews')
router.register('library', BoughtGameViewSet, basename='bought-games')
router.register('', TournamentViewSet, basename='tournament')

urlpatterns = [
    path('', include(router.urls)),
]
