"""
Test script to verify LLM configuration
Run this after setting up your .env file with API keys
"""
import os
import asyncio
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from core.llm.router import router
from core.execution.secrets_vault import SecretsVault

print("=== EKVAAR OS LLM Configuration Test ===\n")

# Test SecretsVault
print("1. Testing SecretsVault...")
print(f"   OpenAI API Key: {'[OK] Found' if SecretsVault.get_openai_api_key() else '[X] Not found'}")
print(f"   OpenRouter API Key: {'[OK] Found' if SecretsVault.get_openrouter_api_key() else '[X] Not found'}")
print(f"   Groq API Key: {'[OK] Found' if SecretsVault.get_groq_api_key() else '[X] Not found'}")
print(f"   Any LLM Key: {'[OK] Found' if SecretsVault.get_any_llm_key() else '[X] Not found'}")
print(f"   Provider: {SecretsVault.get_llm_provider() or 'None'}")

# Test LLM Router
print("\n2. Testing LLM Router...")
print(f"   Provider: {router.provider or 'None'}")
print(f"   Client Initialized: {'[OK] Yes' if router.client else '[X] No'}")
print(f"   API Key Available: {'[OK] Yes' if router.api_key else '[X] No'}")

# Test simple LLM call if configured
if router.client:
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
    print("   - OPENAI_API_KEY=your_key_here")
    print("   - OPENROUTER_API_KEY=your_key_here") 
    print("   - GROQ_API_KEY=your_key_here")

print("\n=== Test Complete ===")