"""
Test script to verify LLM configuration
Run this after setting up your .env file with API keys
"""
import os
import asyncio
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from core.llm.router import router, _openrouter, _groq
from core.execution.secrets_vault import SecretsVault

print("=== EKVAAR OS LLM Configuration Test ===\n")

# Test SecretsVault
print("1. Testing SecretsVault...")
print(f"   OpenRouter API Key: {'[OK] Found' if SecretsVault.get_openrouter_api_key() else '[X] Not found'}")
print(f"   Groq API Key: {'[OK] Found' if SecretsVault.get_groq_api_key() else '[X] Not found'}")

# Test LLM Router
print("\n2. Testing LLM Router...")
print(f"   OpenRouter Client Initialized: {'[OK] Yes' if _openrouter else '[X] No'}")
print(f"   Groq Client Initialized: {'[OK] Yes' if _groq else '[X] No'}")

# Test simple LLM call if configured
if _openrouter or _groq:
    print("\n3. Testing LLM Call...")
    async def test_llm():
        try:
            response = await router.route_request(
                prompt="Hello! Can you respond with just 'Test successful'?",
                task_type="test"
            )
            if response.get("status") == "success":
                print(f"   [OK] LLM Response: {response.get('message', 'No message')}")
                print(f"   [OK] Model Used: {response.get('model', 'Unknown')}")
            else:
                print(f"   [X] LLM Error: {response.get('message', 'Unknown error')}")
        except Exception as e:
            print(f"   [X] Exception: {e}")
    
    asyncio.run(test_llm())
else:
    print("\n3. Skipping LLM call test (no client available)")
    print("   To enable LLM, add one of these to your .env file:")
    print("   - OPENROUTER_API_KEY=your_key_here") 
    print("   - GROQ_API_KEY=your_key_here")

print("\n=== Test Complete ===")