from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import News, ForumSection, ForumTopic, ForumReply, TopicLike, ReplyLike

User = get_user_model()

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'avatar', 'role']

class NewsSerializer(serializers.ModelSerializer):
    author_details = UserMiniSerializer(source='author', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = News
        fields = ['id', 'title', 'content', 'image', 'category', 'category_display', 'author', 'author_details', 'created_at', 'updated_at']
        read_only_fields = ['author']

class ForumReplySerializer(serializers.ModelSerializer):
    author_details = UserMiniSerializer(source='author', read_only=True)
    likes_count = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()

    class Meta:
        model = ForumReply
        fields = ['id', 'topic', 'author', 'author_details', 'content', 'parent_reply', 'likes_count', 'dislikes_count', 'user_reaction', 'created_at', 'updated_at']
        read_only_fields = ['author']

    def get_likes_count(self, obj):
        return obj.likes.filter(is_like=True).count()

    def get_dislikes_count(self, obj):
        return obj.likes.filter(is_like=False).count()

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            like = obj.likes.filter(user=request.user).first()
            if like:
                return 'like' if like.is_like else 'dislike'
        return None

class ForumTopicSerializer(serializers.ModelSerializer):
    author_details = UserMiniSerializer(source='author', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    replies_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()

    class Meta:
        model = ForumTopic
        fields = ['id', 'section', 'section_name', 'title', 'author', 'author_details', 'content', 'is_pinned', 'is_locked', 'replies_count', 'likes_count', 'dislikes_count', 'user_reaction', 'created_at', 'updated_at']
        read_only_fields = ['author', 'is_pinned', 'is_locked']

    def get_replies_count(self, obj):
        return obj.replies.count()

    def get_likes_count(self, obj):
        return obj.likes.filter(is_like=True).count()

    def get_dislikes_count(self, obj):
        return obj.likes.filter(is_like=False).count()

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            like = obj.likes.filter(user=request.user).first()
            if like:
                return 'like' if like.is_like else 'dislike'
        return None

class ForumSectionSerializer(serializers.ModelSerializer):
    topics_count = serializers.SerializerMethodField()

    class Meta:
        model = ForumSection
        fields = ['id', 'name', 'description', 'topics_count']

    def get_topics_count(self, obj):
        return obj.topics.count()
