import random
import math
from .models import Tournament

class BracketGenerator:
    """
    Service to generate tournament brackets based on participants.
    """
    
    @staticmethod
    def generate_single_elimination(tournament_id):
        tournament = Tournament.objects.get(id=tournament_id)
        participants = list(tournament.participants.all())
        
        if not participants:
            return None

        # Shuffle for randomness
        random.shuffle(participants)
        
        count = len(participants)
        # Find next power of 2
        next_power = 2**math.ceil(math.log2(count)) if count > 0 else 0
        
        # Calculate byes
        byes_count = next_power - count
        
        # Initial matches structure
        matches = []
        
        # This is a simplified representation. 
        # In a real app, we would create Match objects in the database.
        
        # To be implemented: Match and Round models
        # For now, we return the logic structure
        
        bracket = {
            "tournament_id": tournament_id,
            "total_participants": count,
            "next_power_of_2": next_power,
            "byes": byes_count,
            "rounds": []
        }
        
        return bracket

class TournamentService:
    @staticmethod
    def start_tournament(tournament_id):
        tournament = Tournament.objects.get(id=tournament_id)
        if tournament.status != Tournament.Status.UPCOMING:
            return False
            
        tournament.status = Tournament.Status.LIVE
        tournament.save()
        
        # Generate brackets
        if tournament.bracket_type == Tournament.BracketType.SINGLE_ELIMINATION:
            BracketGenerator.generate_single_elimination(tournament_id)
            
        return True
