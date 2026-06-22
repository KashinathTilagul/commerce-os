from enum import Enum
from typing import Dict

class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class RiskRegistry:
    """
    Centralized classification of risk for specific capabilities.
    Risk profiles change faster than code, so they are maintained here.
    """
    
    _risk_map: Dict[str, RiskLevel] = {
        # GitHub
        "Github Read": RiskLevel.LOW,
        "Github Create Issue": RiskLevel.LOW,
        "Github Update Issue": RiskLevel.MEDIUM,
        "Github Merge PR": RiskLevel.HIGH,
        "Github Delete Repo": RiskLevel.CRITICAL,

        # Shopify
        "Shopify Read": RiskLevel.LOW,
        "Shopify Create Product": RiskLevel.MEDIUM,
        "Shopify Update Inventory": RiskLevel.MEDIUM,
        "Shopify Price Change": RiskLevel.HIGH,
        "Shopify Delete Product": RiskLevel.CRITICAL,
        "Refund Order": RiskLevel.HIGH,

        # Communications
        "Gmail Read": RiskLevel.LOW,
        "Gmail Draft": RiskLevel.LOW,
        "Gmail Send": RiskLevel.HIGH
    }

    @classmethod
    def get_risk(cls, capability: str) -> RiskLevel:
        # Default to HIGH if unclassified to err on the side of safety
        return cls._risk_map.get(capability, RiskLevel.HIGH)
