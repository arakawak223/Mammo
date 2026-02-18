"""Conversation summary endpoint tests (F5)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

BASE = "/api/v1/analyze"


class TestConversationSummary:
    """POST /api/v1/analyze/conversation-summary"""

    def test_summarizes_scam_conversation(self):
        res = client.post(
            f"{BASE}/conversation-summary",
            json={
                "text": "市役所の者ですが、還付金があります。ATMで手続きしてください。期限が今日までです。"
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 50
        assert data["scam_type"] != "none"
        assert len(data["summary"]) > 0
        assert isinstance(data["key_points"], list)
        assert isinstance(data["recommended_actions"], list)
        assert len(data["recommended_actions"]) > 0
        assert data["model_version"] == "rule-v0.1.0"

    def test_summarizes_safe_conversation(self):
        res = client.post(
            f"{BASE}/conversation-summary",
            json={"text": "お元気ですか？明日公園に散歩に行きましょう。天気が良さそうです。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] < 30
        assert isinstance(data["recommended_actions"], list)

    def test_high_risk_returns_more_actions(self):
        res = client.post(
            f"{BASE}/conversation-summary",
            json={
                "text": "オレだけど、事故を起こして示談金が必要。今すぐ200万円振り込んで。誰にも言わないで。"
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 60
        assert len(data["recommended_actions"]) >= 3

    def test_key_points_extracted(self):
        res = client.post(
            f"{BASE}/conversation-summary",
            json={
                "text": "銀行協会の者です。お金を振り込む必要があります。口座が危険です。キャッシュカードを預かります。"
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["key_points"]) > 0

    def test_keywords_found_populated(self):
        res = client.post(
            f"{BASE}/conversation-summary",
            json={"text": "還付金があります。ATMで手続きをお願いします。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["keywords_found"]) > 0
        assert "還付金" in data["keywords_found"]

    def test_empty_text_returns_422(self):
        res = client.post(f"{BASE}/conversation-summary", json={"text": ""})
        assert res.status_code == 422

    def test_missing_text_returns_422(self):
        res = client.post(f"{BASE}/conversation-summary", json={})
        assert res.status_code == 422
