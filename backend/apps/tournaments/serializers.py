from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Tournament, Game, StoreGame, GameScreenshot, GameReview, BoughtGame

User = get_user_model()

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'avatar', 'role']

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = '__all__'

class TournamentSerializer(serializers.ModelSerializer):
    game_name = serializers.ReadOnlyField(source='game.name')
    participant_count = serializers.IntegerField(source='participants.count', read_only=True)
    joined_users = UserMiniSerializer(source='participants', many=True, read_only=True)

    class Meta:
        model = Tournament
        fields = [
            'id', 'title', 'description', 'game', 'game_name', 
            'status', 'bracket_type', 'start_date', 'end_date', 
            'prize_pool', 'entry_fee', 'max_participants', 
            'participant_count', 'joined_users', 'created_at'
        ]

class GameScreenshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameScreenshot
        fields = ['id', 'image']

class GameReviewSerializer(serializers.ModelSerializer):
    user_details = UserMiniSerializer(source='user', read_only=True)

    class Meta:
        model = GameReview
        fields = ['id', 'game', 'user', 'user_details', 'rating', 'content', 'created_at']
        read_only_fields = ['user']

class StoreGameSerializer(serializers.ModelSerializer):
    developer_details = UserMiniSerializer(source='developer', read_only=True)
    screenshots = GameScreenshotSerializer(many=True, read_only=True)
    reviews = GameReviewSerializer(many=True, read_only=True)
    rating = serializers.SerializerMethodField()

    class Meta:
        model = StoreGame
        fields = [
            'id', 'title', 'slug', 'developer', 'developer_details', 'cover', 
            'description', 'price', 'platform', 'language', 'rating', 
            'sys_requirements', 'trailer_url', 'screenshots', 'reviews', 'created_at'
        ]
        read_only_fields = ['developer']

    def get_rating(self, obj):
        avg = obj.reviews.aggregate(serializers.models.Avg('rating'))['rating__avg']
        return round(avg, 2) if avg else 5.00

class BoughtGameSerializer(serializers.ModelSerializer):
    game_details = StoreGameSerializer(source='game', read_only=True)

    class Meta:
        model = BoughtGame
        fields = ['id', 'user', 'game', 'game_details', 'cd_key', 'bought_at']
        read_only_fields = ['user', 'cd_key']

