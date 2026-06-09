from rest_framework import viewsets, permissions, status, response, views
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from .models import News, ForumSection, ForumTopic, ForumReply, TopicLike, ReplyLike
from .serializers import NewsSerializer, ForumSectionSerializer, ForumTopicSerializer, ForumReplySerializer

class NewsViewSet(viewsets.ModelViewSet):
    queryset = News.objects.all()
    serializer_class = NewsSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['category']
    search_fields = ['title', 'content']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class ForumSectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ForumSection.objects.all()
    serializer_class = ForumSectionSerializer
    permission_classes = [permissions.AllowAny]

class ForumTopicViewSet(viewsets.ModelViewSet):
    queryset = ForumTopic.objects.all()
    serializer_class = ForumTopicSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['section', 'author']
    search_fields = ['title', 'content']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def react(self, request, pk=None):
        topic = self.get_object()
        user = request.user
        is_like = request.data.get('is_like', True)

        like, created = TopicLike.objects.get_or_create(topic=topic, user=user)
        if not created and like.is_like == is_like:
            # If clicked same reaction again, remove it (toggle off)
            like.delete()
            return response.Response({"status": "reaction removed"})
        
        like.is_like = is_like
        like.save()
        return response.Response({"status": "reaction saved"})

class ForumReplyViewSet(viewsets.ModelViewSet):
    queryset = ForumReply.objects.all()
    serializer_class = ForumReplySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['topic']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        # Prevent replying to locked topics
        topic_id = self.request.data.get('topic')
        try:
            topic = ForumTopic.objects.get(id=topic_id)
            if topic.is_locked:
                raise permissions.exceptions.PermissionDenied("This topic is locked.")
        except ForumTopic.DoesNotExist:
            pass
            
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def react(self, request, pk=None):
        reply = self.get_object()
        user = request.user
        is_like = request.data.get('is_like', True)

        like, created = ReplyLike.objects.get_or_create(reply=reply, user=user)
        if not created and like.is_like == is_like:
            like.delete()
            return response.Response({"status": "reaction removed"})
        
        like.is_like = is_like
        like.save()
        return response.Response({"status": "reaction saved"})

from apps.users.models import User
from apps.tournaments.models import Tournament, Game

class PlatformStatsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        users_count = User.objects.count()
        tournaments_count = Tournament.objects.count()
        games_count = Game.objects.count()
        
        # Calculate simulated metrics
        total_views = 12450000 + (users_count * 123)
        streamers_count = User.objects.filter(role='STREAMER').count() or 15
        
        return response.Response({
            "users_count": users_count,
            "tournaments_count": tournaments_count,
            "games_count": games_count,
            "total_views": total_views,
            "streamers_count": streamers_count
        })

