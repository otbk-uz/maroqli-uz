from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator

class User(AbstractUser):
    class Role(models.TextChoices):
        VIEWER = 'VIEWER', _('Viewer')
        GAMER = 'GAMER', _('Gamer')
        GAMEDEV = 'GAMEDEV', _('GameDev')
        INVESTOR = 'INVESTOR', _('Investor')
        MODERATOR = 'MODERATOR', _('Moderator')
        ADMIN = 'ADMIN', _('Admin')

    REGION_CHOICES = [
        ('TOSHKENT_S', _('Toshkent shahri')),
        ('TOSHKENT_V', _('Toshkent viloyati')),
        ('ANDIJON', _('Andijon viloyati')),
        ('BUXORO', _('Buxoro viloyati')),
        ('FARGONA', _('Fargʻona viloyati')),
        ('JIZZAX', _('Jizzax viloyati')),
        ('NAMANGAN', _('Namangan viloyati')),
        ('NAVOIY', _('Navoiy viloyati')),
        ('QASHQADARYO', _('Qashqadaryo viloyati')),
        ('SAMARQAND', _('Samarqand viloyati')),
        ('SIRDARYO', _('Sirdaryo viloyati')),
        ('SURXONDARYO', _('Surxondaryo viloyati')),
        ('XORAZM', _('Xorazm viloyati')),
        ('QORAQALPOGISTON', _('Qoraqalpogʻiston Respublikasi')),
    ]

    nickname = models.CharField(_('Nickname'), max_length=50, null=True, blank=True)
    full_name = models.CharField(_('Full Name'), max_length=60)
    avatar = models.ImageField(_('Avatar'), upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(_('Bio'), max_length=500, blank=True)
    role = models.CharField(
        _('Role'), 
        max_length=20, 
        choices=Role.choices, 
        default=Role.VIEWER
    )
    
    age = models.PositiveIntegerField(
        _('Age'),
        validators=[MinValueValidator(10), MaxValueValidator(80)],
        null=True, blank=True  # Nullable temporarily for existing users, but required in serializer
    )
    region = models.CharField(
        _('Region'),
        max_length=50,
        choices=REGION_CHOICES,
        null=True, blank=True  # Nullable temporarily for existing users, but required in serializer
    )
    phone_number = models.CharField(
        _('Phone Number'),
        max_length=15,
        validators=[RegexValidator(regex=r'^\+998\d{9}$', message=_("Phone number must be in +998XXXXXXXXX format"))],
        null=True, blank=True  # Nullable temporarily for existing users, but required in serializer
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
        return self.full_name or self.username or self.email

    @property
    def is_premium(self):
        from django.utils import timezone
        try:
            sub = self.subscription
            return sub.is_active and sub.expires_at > timezone.now()
        except Exception:
            return False

class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"
