import urllib.request
import json

BASE = "http://localhost:8001/api/reality"

def post(endpoint, payload):
    req = urllib.request.Request(f"{BASE}/{endpoint}", method="POST")
    req.add_header('Content-Type', 'application/json')
    data = json.dumps(payload).encode('utf-8')
    try:
        with urllib.request.urlopen(req, data=data) as response:
            return response.status
    except Exception as e:
        print(f"Error on {endpoint}: {e}")
        return 500

def test():
    # 1. Revenue
    print("Revenue:", post("revenue", {
        "date": "2026-06-15",
        "channel": "Direct",
        "amount": 154000.50,
        "notes": "Manual entry test",
        "data_source": "MANUAL",
        "created_by": "Founder"
    }))

    # 2. Orders
    print("Orders:", post("orders", {
        "date": "2026-06-15",
        "channel": "Direct",
        "orders": 120,
        "notes": "",
        "data_source": "MANUAL",
        "created_by": "Founder"
    }))

    # 3. Inventory
    print("Inventory:", post("inventory", {
        "sku": "PRD-001",
        "product_name": "Flagship Product",
        "quantity": 500,
        "data_source": "MANUAL",
        "created_by": "Founder"
    }))

    # 4. Cash
    print("Cash:", post("cash", {
        "date": "2026-06-15",
        "cash_available": 2500000.00,
        "notes": "",
        "data_source": "MANUAL",
        "updated_by": "Founder"
    }))

    # 5. Expenses
    print("Expenses:", post("expenses", {
        "date": "2026-06-15",
        "category": "Marketing",
        "amount": 25000.00,
        "description": "Ad Spend",
        "data_source": "MANUAL",
        "created_by": "Founder"
    }))

    # Fetch Dashboard
    req = urllib.request.Request(f"{BASE}/dashboard")
    with urllib.request.urlopen(req) as response:
        print("Dashboard:", response.read().decode('utf-8'))

if __name__ == "__main__":
    test()
