import httpx
import asyncio

async def main():
    api_key = "ak_bSj-PQABNrp4HNdxx5Wi"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://backend.composio.dev/api/v3.1/toolkits",
            headers={"x-api-key": api_key},
            timeout=15.0
        )
        print("Status Code:", resp.status_code)
        try:
            data = resp.json()
            items = data.get("items", [])
            print("Items count:", len(items))
        except Exception as e:
            print("JSON Error:", e)
            print("Response:", resp.text[:500])

asyncio.run(main())
