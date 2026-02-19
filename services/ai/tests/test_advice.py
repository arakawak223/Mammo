"""Regional advice endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ENDPOINT = "/api/v1/advice/regional"


class TestRegionalAdvice:
    """POST /api/v1/advice/regional"""

    def test_returns_advice_for_valid_prefecture(self):
        res = client.post(
            ENDPOINT,
            json={
                "prefecture": "東京都",
                "top_scam_types": [
                    {"scam_type": "ore_ore", "count": 100, "amount": 50000000},
                    {"scam_type": "investment_fraud", "count": 50, "amount": 30000000},
                ],
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["prefecture"] == "東京都"
        assert len(data["details"]) >= 1
        assert "advice" in data["details"][0]
        assert "label" in data["details"][0]

    def test_returns_advice_with_single_scam_type(self):
        res = client.post(
            ENDPOINT,
            json={
                "prefecture": "大阪府",
                "top_scam_types": [
                    {"scam_type": "refund_fraud", "count": 30, "amount": 10000000},
                ],
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["prefecture"] == "大阪府"
        assert len(data["details"]) == 1

    def test_returns_empty_details_for_no_scam_types(self):
        res = client.post(
            ENDPOINT,
            json={
                "prefecture": "北海道",
                "top_scam_types": [],
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["details"] == []
        assert "データがまだありません" in data["advice"]

    def test_handles_unknown_scam_type(self):
        res = client.post(
            ENDPOINT,
            json={
                "prefecture": "福岡県",
                "top_scam_types": [
                    {"scam_type": "new_scam_type", "count": 10, "amount": 5000000},
                ],
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["details"]) == 1
        assert data["details"][0]["label"] == "new_scam_type"

    def test_missing_prefecture_returns_422(self):
        res = client.post(
            ENDPOINT,
            json={"top_scam_types": []},
        )
        assert res.status_code == 422

    def test_defaults_to_empty_scam_types(self):
        """top_scam_types has default_factory=list, so omitting it returns 200."""
        res = client.post(
            ENDPOINT,
            json={"prefecture": "東京都"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["details"] == []
