"""
Quick test of LLM connection
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Load the .env file from the project root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

# Add the current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from core.llm.router import router

async def test_llm():
    print("Testing LLM connection...")
    
    try:
        response = await router.route_request(
            prompt="Hello! Please respond with just 'LLM connection successful!'",
            task_type="test"
        )
        
        if response.get("status") == "success":
            print(f"SUCCESS: {response.get('message')}")
            print(f"Model: {response.get('model')}")
        else:
            print(f"ERROR: {response.get('message')}")
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm())