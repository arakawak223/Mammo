"""Dark job checker endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ENDPOINT = "/api/v1/check/dark-job"


class TestDarkJobCheck:
    """POST /api/v1/check/dark-job"""

    def test_detects_obvious_dark_job(self):
        res = client.post(
            ENDPOINT,
            json={
                "text": "高額報酬！受け子募集。荷物を受け取るだけの簡単な仕事。誰にも言わないで。"
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_dark_job"] is True
        assert data["risk_level"] in ("high", "medium")
        assert data["risk_score"] >= 35
        assert len(data["keywords_found"]) >= 1
        assert data["model_version"] == "darkjob-rule-v0.1.0"

    def test_detects_high_pay_lure(self):
        res = client.post(
            ENDPOINT,
            json={"text": "日給5万円以上！即日払い。簡単な作業で高収入。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["risk_score"] >= 25

    def test_detects_criminal_keywords(self):
        res = client.post(
            ENDPOINT,
            json={"text": "出し子として銀行で引き出しをお願いします。運び屋の仕事です。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_dark_job"] is True
        assert data["risk_level"] in ("high", "medium")

    def test_safe_job_posting(self):
        res = client.post(
            ENDPOINT,
            json={"text": "コンビニスタッフ募集。時給1100円。シフト制。交通費支給。"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_dark_job"] is False
        assert data["risk_level"] == "low"
        assert data["risk_score"] < 35

    def test_missing_text_returns_422(self):
        res = client.post(ENDPOINT, json={})
        assert res.status_code == 422

    def test_empty_text_returns_422(self):
        res = client.post(ENDPOINT, json={"text": ""})
        assert res.status_code == 422
