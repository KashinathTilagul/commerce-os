"""
EKVAAR OS - Mission Zero: Recommendation Accuracy Engine
"""
from core.mission_zero.trust_ledger import TrustLedger

class RecommendationAccuracy:
    @staticmethod
    async def evaluate_recommendation(employee_id: str, rec_id: str, is_correct: str) -> None:
        """
        is_correct can be: 'CORRECT', 'PARTIAL', 'INCORRECT'
        """
        points = 0.0
        result = ""
        
        if is_correct == "CORRECT":
            points = 2.0
            result = "SUCCESS"
        elif is_correct == "PARTIAL":
            points = 0.5
            result = "PARTIAL_SUCCESS"
        elif is_correct == "INCORRECT":
            points = -3.0
            result = "FAILED"
            
        await TrustLedger.record_trust_event(
            employee_id=employee_id,
            action_type="RECOMMENDATION",
            result=result,
            points=points
        )
