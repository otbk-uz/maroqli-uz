from rest_framework import viewsets, permissions, status, response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
import uuid

from .models import Tournament, Game, StoreGame, GameReview, BoughtGame, GameScreenshot
from .serializers import TournamentSerializer, GameSerializer, StoreGameSerializer, GameReviewSerializer, BoughtGameSerializer

class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status', 'game']
    search_fields = ['title', 'description']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        elif self.action == 'join':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        tournament = self.get_object()
        user = request.user

        if user in tournament.participants.all():
            tournament.participants.remove(user)
            return response.Response({"status": "left", "message": "Turnirdan muvaffaqiyatli chiqdingiz."})
        
        if tournament.participants.count() >= tournament.max_participants:
            return response.Response(
                {"detail": "Turnirda bo'sh joylar qolmadi."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        tournament.participants.add(user)
        return response.Response({"status": "joined", "message": "Turnirga muvaffaqiyatli ro'yxatdan o'tdingiz."})

class GameViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    permission_classes = [permissions.AllowAny]

class StoreGameViewSet(viewsets.ModelViewSet):
    queryset = StoreGame.objects.all()
    serializer_class = StoreGameSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['platform']
    search_fields = ['title', 'description']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(developer=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def developer_dashboard(self, request):
        games = StoreGame.objects.filter(developer=request.user)
        bought_games = BoughtGame.objects.filter(game__developer=request.user)
        total_sales = bought_games.count()
        total_earnings = sum(bg.game.price for bg in bought_games)
        
        serializer = self.get_serializer(games, many=True)
        return response.Response({
            "games": serializer.data,
            "total_sales": total_sales,
            "total_earnings": float(total_earnings)
        })

class GameReviewViewSet(viewsets.ModelViewSet):
    queryset = GameReview.objects.all()
    serializer_class = GameReviewSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class BoughtGameViewSet(viewsets.ModelViewSet):
    serializer_class = BoughtGameSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BoughtGame.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Generate CD key for the bought game
        cd_key = f"PN-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"
        serializer.save(user=self.request.user, cd_key=cd_key)

    def create(self, request, *args, **kwargs):
        game_id = request.data.get('game')
        if BoughtGame.objects.filter(user=request.user, game_id=game_id).exists():
            return response.Response(
                {"detail": "Siz ushbu o'yinni sotib olgansiz."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)
