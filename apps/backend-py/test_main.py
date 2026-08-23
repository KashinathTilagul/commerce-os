import unittest
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from main import app

class TestPythonSidecar(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_root_health(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("service"), "browser-automation-sidecar")

    def test_cors_origins(self):
        response = self.client.options("/", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })
        self.assertIn(response.status_code, [200, 204])

    def test_non_existent_route(self):
        response = self.client.get("/non-existent-route-9999")
        self.assertEqual(response.status_code, 404)

if __name__ == "__main__":
    unittest.main()
