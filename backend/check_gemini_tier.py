#!/usr/bin/env python3
"""
Quick script to check your LiteLLM/Gemini API tier and rate limits
"""

import os
import requests
import json
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_litellm_tier():
    """Check LiteLLM API tier by making test requests"""
    
    litellm_url = os.getenv("LITELLM_API_URL")
    litellm_key = os.getenv("LITELLM_API_KEY")
    litellm_header = os.getenv("LITELLM_HEADER_NAME", "Authorization")
    litellm_scheme = os.getenv("LITELLM_AUTH_SCHEME", "Bearer")
    extraction_model = os.getenv("EXTRACTION_MODEL", "openrouter/google/gemini-2.5-flash")
    
    if not litellm_url or not litellm_key:
        print("❌ LITELLM_API_URL or LITELLM_API_KEY not found in .env file!")
        return
    
    # Ensure URL has correct endpoint path (from llm_client.py logic)
    # The URL should be the complete endpoint, but if not, the service handles it
    # For testing, we use it as-is (the service code uses it directly)
    
    print("🔍 Checking your LiteLLM API rate limits...\n")
    print(f"URL: {litellm_url}")
    print(f"Model: {extraction_model}")
    print(f"API Key: {litellm_key[:20]}...{litellm_key[-10:]}")
    
    headers = {
        "Content-Type": "application/json",
        litellm_header: f"{litellm_scheme} {litellm_key}"
    }
    
    data = {
        "model": extraction_model,
        "messages": [
            {
                "role": "user",
                "content": "Hello"
            }
        ],
        "max_tokens": 10,
        "temperature": 0.1
    }
    
    # Make multiple quick requests to test rate limit
    print("\n🧪 Testing rate limits by making 80 rapid requests...")
    print("=" * 60)
    
    success_count = 0
    rate_limit_count = 0
    start_time = time.time()
    
    for i in range(80):  # Try 80 requests
        try:
            request_start = time.time()
            response = requests.post(
                litellm_url,
                headers=headers,
                json=data,
                timeout=30
            )
            request_time = time.time() - request_start
            
            if response.status_code == 200:
                success_count += 1
                print(f"✅ Request {i+1}: Success ({request_time:.2f}s)")
            elif response.status_code == 429:
                rate_limit_count += 1
                print(f"🚨 Request {i+1}: RATE LIMITED (429)")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")
                break  # Stop on first rate limit
            elif response.status_code == 402:
                print(f"💳 Request {i+1}: INSUFFICIENT CREDITS (402)")
                print(f"   Response: {response.text[:200]}")
                break
            else:
                print(f"⚠️  Request {i+1}: Status {response.status_code}")
                print(f"   Response: {response.text[:200]}")
        except Exception as e:
            print(f"❌ Request {i+1}: Error - {e}")
    
    total_time = time.time() - start_time
    
    print("\n" + "=" * 60)
    print("\n📊 RESULTS:")
    print(f"   Successful requests: {success_count}")
    print(f"   Rate limited: {rate_limit_count}")
    print(f"   Total time: {total_time:.2f} seconds")
    print(f"   Requests per minute: {(success_count / total_time * 60):.1f}")
    
    # Determine tier/limits
    print("\n🎯 YOUR RATE LIMITS:")
    if rate_limit_count > 0 and success_count <= 10:
        print("   ⚠️  ~10 RPM limit detected (Gemini Free/Tier 1)")
        print("   With 40 workers, you WILL hit rate limits!")
        print("   Recommendation: Upgrade to Tier 2 (250 RPM) or use OpenRouter")
    elif rate_limit_count > 0 and success_count <= 50:
        print("   ⚠️  ~50 RPM limit detected")
        print("   With 40 workers, you might hit rate limits under heavy load")
    elif success_count >= 15:
        print("   ✅ High rate limit (100+ RPM)")
        print("   40 workers should work perfectly! 🚀")
    else:
        print("   ❓ Unable to determine exact limit")
    
    print("\n📋 GEMINI TIER BREAKDOWN:")
    print("   Free/Tier 1:  10 RPM  → max 8-10 workers")
    print("   Tier 2:      250 RPM → max 200+ workers")
    print("   OpenRouter:  50-100 RPM (varies)")
    
    print("\n💡 YOUR CONFIG:")
    print(f"   Testing with: 80 concurrent requests")
    print(f"   Detected RPM: ~{(success_count / total_time * 60):.0f}")
    if success_count >= 70:
        print("   Status: ✅ Perfect! You can use 80 workers easily")
    elif success_count >= 40:
        print("   Status: ✅ 40-50 workers recommended")
    else:
        print("   Status: ⚠️  May need to reduce workers or upgrade tier")
    
    print("\n🔗 Useful links:")
    print("   AI Studio Usage: https://aistudio.google.com/usage")
    print("   OpenRouter Dashboard: https://openrouter.ai/settings")

if __name__ == "__main__":
    check_litellm_tier()
