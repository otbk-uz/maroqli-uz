from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    class Role(models.TextChoices):
        GAMER = 'GAMER', _('Gamer')
        STREAMER = 'STREAMER', _('Streamer')
        MODERATOR = 'MODERATOR', _('Moderator')
        ADMIN = 'ADMIN', _('Admin')

    nickname = models.CharField(_('Nickname'), max_length=50, unique=True)
    avatar = models.ImageField(_('Avatar'), upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(_('Bio'), max_length=500, blank=True)
    role = models.CharField(
        _('Role'), 
        max_length=20, 
        choices=Role.choices, 
        default=Role.GAMER
    )
    
    # Gaming stats
    level = models.PositiveIntegerField(default=1)
    exp = models.PositiveIntegerField(default=0)
    elo = models.PositiveIntegerField(default=1000)
    
    # Social links
    telegram_id = models.CharField(max_length=100, null=True, blank=True)
    discord_tag = models.CharField(max_length=100, null=True, blank=True)
    
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')

    def __str__(self):
        return self.nickname or self.username
