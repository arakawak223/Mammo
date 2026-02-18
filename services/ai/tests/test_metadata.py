"""Call metadata analysis endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ENDPOINT = "/api/v1/analyze/call-metadata"


class TestMetadataAnalysis:
    """POST /api/v1/analyze/call-metadata"""

    def test_international_number_high_risk(self):
        res = client.post(
            ENDPOINT,
            json={"phone_number": "+44123456789", "call_type": "call"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 40
        assert "国際番号" in data["summary"]
        assert data["model_version"] == "metadata-rule-v0.1.0"

    def test_suspicious_prefix_adds_risk(self):
        res = client.post(
            ENDPOINT,
            json={"phone_number": "+8612345678901", "call_type": "call"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 50  # international + suspicious prefix
        assert any("プレフィックス" in r for r in data["reasons"])

    def test_hidden_number_high_risk(self):
        res = client.post(
            ENDPOINT,
            json={"phone_number": "非通知", "call_type": "call"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 30

    def test_sms_with_scam_keywords(self):
        res = client.post(
            ENDPOINT,
            json={
                "phone_number": "+44123456789",
                "call_type": "sms",
                "sms_content": "お届け物をお届けにあがりましたが不在でした。再配達はこちら http://evil.example.com",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 60
        assert len(data["keywords_found"]) >= 1
        assert any("URL" in r for r in data["reasons"])

    def test_sms_urgency_detected(self):
        res = client.post(
            ENDPOINT,
            json={
                "phone_number": "09012345678",
                "call_type": "sms",
                "sms_content": "今すぐ確認してください！至急対応が必要です。",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 15  # urgency bonus

    def test_safe_domestic_call_low_risk(self):
        res = client.post(
            ENDPOINT,
            json={"phone_number": "09012345678", "call_type": "call"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] < 20

    def test_short_number_medium_risk(self):
        res = client.post(
            ENDPOINT,
            json={"phone_number": "110", "call_type": "call"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 15

    def test_missing_phone_number_returns_422(self):
        res = client.post(ENDPOINT, json={"call_type": "call"})
        assert res.status_code == 422
