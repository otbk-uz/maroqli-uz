from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'nickname', 'avatar', 
            'bio', 'role', 'level', 'exp', 'elo', 'is_verified'
        ]
        read_only_fields = ['level', 'exp', 'elo', 'is_verified']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
