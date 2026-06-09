import re
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    full_name = serializers.CharField(required=True, max_length=60)
    age = serializers.IntegerField(required=True)
    region = serializers.ChoiceField(choices=User.REGION_CHOICES, required=True)
    phone_number = serializers.CharField(required=True)
    role = serializers.ChoiceField(choices=User.Role.choices, required=True)
    is_premium = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'nickname', 'avatar', 
            'bio', 'role', 'age', 'region', 'phone_number', 'password',
            'level', 'exp', 'elo', 'is_verified', 'is_premium'
        ]
        read_only_fields = ['level', 'exp', 'elo', 'is_verified', 'is_premium']

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z0-9_]{3,30}$', value):
            raise serializers.ValidationError(
                "Username must be 3-30 characters long and contain only Latin letters, numbers, and underscores."
            )
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        return value

    def validate_phone_number(self, value):
        if not re.match(r'^\+998\d{9}$', value):
            raise serializers.ValidationError("Phone number must be in +998XXXXXXXXX format.")
        return value

    def validate_age(self, value):
        if value < 10 or value > 80:
            raise serializers.ValidationError("Age must be between 10 and 80.")
        return value

    def validate_role(self, value):
        if self.instance and self.instance.role != value:
            raise serializers.ValidationError("Role cannot be changed directly.")
        allowed_roles = [User.Role.VIEWER, User.Role.GAMER, User.Role.GAMEDEV, User.Role.INVESTOR]
        if value not in allowed_roles:
            raise serializers.ValidationError("Invalid registration role.")
        return value

    def create(self, validated_data):
        if not validated_data.get('nickname'):
            validated_data['nickname'] = validated_data.get('username')
            
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'nickname': self.user.nickname or self.user.username,
            'role': self.user.role,
            'avatar': self.user.avatar.url if self.user.avatar else None,
            'elo': self.user.elo,
            'is_premium': self.user.is_premium,
        }
        return data

from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']

class UserAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'nickname', 'avatar', 
            'bio', 'role', 'age', 'region', 'phone_number',
            'level', 'exp', 'elo', 'is_verified', 'is_active'
        ]
        read_only_fields = ['id', 'username', 'email']


