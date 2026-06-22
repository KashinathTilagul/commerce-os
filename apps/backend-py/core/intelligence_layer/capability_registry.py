"""
EKVAAR OS - Intelligence Layer: Capability Registry
"""

class CapabilityRegistry:
    # Hardcoded core capabilities. Employees request these, not specific LLMs.
    CAPABILITIES = [
        "Research", "Reasoning", "Writing", "Summarization", 
        "Analysis", "Forecasting", "Planning", "Coding", 
        "Search", "Memory Retrieval", "Decision Support", 
        "Simulation", "Reporting"
    ]

    @staticmethod
    def get_capabilities() -> list:
        return CapabilityRegistry.CAPABILITIES

    @staticmethod
    def map_capability_to_complexity(capability: str) -> str:
        """
        Maps a capability request to the required provider complexity.
        """
        complex_capabilities = ["Reasoning", "Forecasting", "Planning", "Coding", "Decision Support", "Simulation"]
        if capability in complex_capabilities:
            return "COMPLEX"
        return "STANDARD"
