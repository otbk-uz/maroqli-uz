from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings

class Game(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.ImageField(upload_to='games/', null=True, blank=True)
    
    def __str__(self):
        return self.name

class Tournament(models.Model):
    class Status(models.TextChoices):
        UPCOMING = 'UPCOMING', _('Upcoming')
        LIVE = 'LIVE', _('Live')
        FINISHED = 'FINISHED', _('Finished')
        CANCELLED = 'CANCELLED', _('Cancelled')

    class BracketType(models.TextChoices):
        SINGLE_ELIMINATION = 'SINGLE', _('Single Elimination')
        DOUBLE_ELIMINATION = 'DOUBLE', _('Double Elimination')
        ROUND_ROBIN = 'ROBIN', _('Round Robin')

    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'))
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='tournaments')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    bracket_type = models.CharField(max_length=20, choices=BracketType.choices, default=BracketType.SINGLE_ELIMINATION)
    
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    
    prize_pool = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    entry_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    max_participants = models.PositiveIntegerField(default=64)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='joined_tournaments', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Round(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='rounds')
    name = models.CharField(max_length=100) # e.g., Quarter-final
    order = models.PositiveIntegerField() # 1, 2, 3...
    
    def __str__(self):
        return f"{self.tournament.title} - {self.name}"

class Match(models.Model):
    class MatchStatus(models.TextChoices):
        UPCOMING = 'UPCOMING', _('Upcoming')
        LIVE = 'LIVE', _('Live')
        FINISHED = 'FINISHED', _('Finished')

    round = models.ForeignKey(Round, on_delete=models.CASCADE, related_name='matches')
    
    player1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='matches_as_p1')
    player2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='matches_as_p2')
    
    score1 = models.IntegerField(default=0)
    score2 = models.IntegerField(default=0)
    
    winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='won_matches')
    status = models.CharField(max_length=20, choices=MatchStatus.choices, default=MatchStatus.UPCOMING)
    
    order = models.PositiveIntegerField()
    
    # For bracket logic
    next_match = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='prev_matches')

    def __str__(self):
        return f"Match {self.id}: {self.player1} vs {self.player2}"

class StoreGame(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    developer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='developed_games')
    cover = models.ImageField(upload_to='store_covers/', null=True, blank=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    platform = models.CharField(max_length=20, choices=[('PC', 'PC'), ('MOBILE', 'Mobile'), ('BOTH', 'Both')], default='PC')
    language = models.CharField(max_length=50, default='Uzbek')
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00)
    sys_requirements = models.TextField(blank=True, help_text="System requirements in JSON or plain text")
    trailer_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class GameScreenshot(models.Model):
    game = models.ForeignKey(StoreGame, on_delete=models.CASCADE, related_name='screenshots')
    image = models.ImageField(upload_to='store_screenshots/')

class GameReview(models.Model):
    game = models.ForeignKey(StoreGame, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(default=5)  # 1-5 stars
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('game', 'user')

class BoughtGame(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='library')
    game = models.ForeignKey(StoreGame, on_delete=models.CASCADE)
    cd_key = models.CharField(max_length=100, blank=True)
    bought_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'game')

