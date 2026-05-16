from rest_framework import serializers
from .models import Tournament, Game

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = '__all__'

class TournamentSerializer(serializers.ModelSerializer):
    game_name = serializers.ReadOnlyField(source='game.name')
    participant_count = serializers.IntegerField(source='participants.count', read_only=True)

    class Meta:
        model = Tournament
        fields = [
            'id', 'title', 'description', 'game', 'game_name', 
            'status', 'bracket_type', 'start_date', 'end_date', 
            'prize_pool', 'entry_fee', 'max_participants', 
            'participant_count', 'created_at'
        ]
