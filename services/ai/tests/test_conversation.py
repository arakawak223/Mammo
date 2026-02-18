"""Conversation analysis endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

BASE = "/api/v1/analyze"


class TestConversationAnalysis:
    """POST /api/v1/analyze/conversation"""

    def test_detects_cash_card_fraud(self):
        res = client.post(
            f"{BASE}/conversation",
            json={
                "text": "あなたの口座が凍結されました。暗証番号を教えてください。ATMで手続きしてください。"
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 70
        assert data["scam_type"] == "cash_card_fraud"
        assert len(data["keywords_found"]) >= 1
        assert data["model_version"] == "rule-v0.1.0"

    def test_detects_refund_fraud(self):
        res = client.post(
            f"{BASE}/conversation",
            json={"text": "還付金があります。ATMで手続きしてください。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 50
        assert data["scam_type"] == "refund_fraud"

    def test_detects_ore_ore_fraud(self):
        res = client.post(
            f"{BASE}/conversation",
            json={"text": "お母さん、オレだけど、事故を起こしてお金が必要なんだ。示談金を振り込んでほしい。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 50
        assert "ore_ore" in data["scam_type"]

    def test_detects_investment_fraud(self):
        res = client.post(
            f"{BASE}/conversation",
            json={"text": "必ず儲かる投資の話があります。高収益で元本保証です。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 50

    def test_safe_conversation_low_score(self):
        res = client.post(
            f"{BASE}/conversation",
            json={"text": "お元気ですか？明日公園に散歩に行きましょう。天気が良さそうです。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] < 30

    def test_urgency_boosts_score(self):
        base = client.post(
            f"{BASE}/conversation",
            json={"text": "口座が凍結されました。暗証番号を教えてください。"},
        )
        urgent = client.post(
            f"{BASE}/conversation",
            json={
                "text": "口座が凍結されました。暗証番号を教えてください。今すぐ急いでください！"
            },
        )
        assert urgent.json()["risk_score"] >= base.json()["risk_score"]

    def test_empty_text_returns_422(self):
        res = client.post(f"{BASE}/conversation", json={"text": ""})
        assert res.status_code == 422

    def test_missing_text_returns_422(self):
        res = client.post(f"{BASE}/conversation", json={})
        assert res.status_code == 422


class TestQuickCheck:
    """POST /api/v1/analyze/quick-check"""

    def test_suspicious_text(self):
        res = client.post(
            f"{BASE}/quick-check",
            json={"text": "還付金があります。ATMで手続きしてください。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_suspicious"] is True
        assert data["risk_score"] >= 50
        assert len(data["reason"]) > 0

    def test_safe_text(self):
        res = client.post(
            f"{BASE}/quick-check",
            json={"text": "明日の天気は晴れです。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_suspicious"] is False
        assert data["risk_score"] < 30

    def test_missing_text_returns_422(self):
        res = client.post(f"{BASE}/quick-check", json={})
        assert res.status_code == 422
