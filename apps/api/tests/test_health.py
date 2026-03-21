from app.main import app
from fastapi.testclient import TestClient


def test_healthcheck() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_order_intake_health_defaults_to_stub_ready() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/health/order-intake")

    assert response.status_code == 200
    assert response.json()["engine_status"] == "ready"
    assert response.json()["order_intake_enabled"] is True
