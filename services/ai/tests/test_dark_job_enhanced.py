"""Enhanced dark job checker tests — v2 with expanded keywords and LLM hybrid."""

from fastapi.testclient import TestClient

from app.main import app
from app.services.dark_job_checker import DarkJobChecker

client = TestClient(app)

ENDPOINT = "/api/v1/check/dark-job"
IMAGE_ENDPOINT = "/api/v1/check/dark-job-image"


class TestDarkJobEnhancedV2:
    """Enhanced dark job detection — v2 tests."""

    def test_model_version_is_v2(self):
        res = client.post(ENDPOINT, json={"text": "普通のバイト募集です"})
        assert res.status_code == 200
        assert res.json()["model_version"] == "darkjob-hybrid-v2.0.0"

    def test_sns_recruitment_pattern(self):
        res = client.post(
            ENDPOINT,
            json={"text": "DMください。インスタのプロフのリンクから応募してね。"},
        )
        data = res.json()
        assert data["risk_score"] >= 15
        assert any(kw in ["DM", "インスタ", "プロフのリンク"] for kw in data["keywords_found"])

    def test_luffy_syndicate_pattern(self):
        res = client.post(
            ENDPOINT,
            json={"text": "指示役からの指示に従うだけの簡単なお仕事。グループに入って活動。"},
        )
        data = res.json()
        assert data["risk_score"] >= 35
        assert data["is_dark_job"] is True

    def test_disguised_legitimate_pattern(self):
        res = client.post(
            ENDPOINT,
            json={"text": "口座開設代行のお仕事。名前を貸すだけで報酬があります。"},
        )
        data = res.json()
        assert data["risk_score"] >= 20

    def test_multi_category_bonus(self):
        """4+ category matches should get +20 bonus."""
        res = client.post(
            ENDPOINT,
            json={
                "text": (
                    "高額バイト！受け子募集。Telegramで連絡。今すぐ連絡ください。"
                    "DMで応募。指示に従うだけ。口座開設代行。"
                ),
            },
        )
        data = res.json()
        assert data["risk_score"] >= 60
        assert data["risk_level"] == "high"

    def test_llm_hybrid_grey_zone(self):
        """Grey zone (20-55) should trigger LLM hybrid check."""
        checker = DarkJobChecker()
        # Text that triggers 1-2 categories in grey zone range
        result = checker.check("簡単に稼げる仕事。報酬は即日払い。連絡先はTelegramまで。")
        assert result["risk_score"] >= 20
        assert result["model_version"] == "darkjob-hybrid-v2.0.0"

    def test_safe_regular_job(self):
        res = client.post(
            ENDPOINT,
            json={"text": "居酒屋スタッフ募集！時給1200円。22時以降は深夜手当あり。社員登用あり。"},
        )
        data = res.json()
        assert data["is_dark_job"] is False
        assert data["risk_level"] == "low"

    def test_combined_high_risk_explanation(self):
        res = client.post(
            ENDPOINT,
            json={"text": "受け子として現金を受け取るだけ。高額報酬。Telegramで連絡。"},
        )
        data = res.json()
        assert data["is_dark_job"] is True
        assert "検出カテゴリ" in data["explanation"]
        assert "警察" in data["explanation"] or "注意" in data["explanation"]


class TestDarkJobImageEndpoint:
    """POST /api/v1/check/dark-job-image"""

    def test_empty_image_returns_fallback(self):
        res = client.post(
            IMAGE_ENDPOINT,
            json={"image_base64": "invalid_base64_data"},
        )
        assert res.status_code == 200
        data = res.json()
        # OCR fails on invalid data -> fallback response
        assert data["risk_level"] == "low"

    def test_missing_image_returns_422(self):
        res = client.post(IMAGE_ENDPOINT, json={})
        assert res.status_code == 422

    def test_empty_image_string_returns_422(self):
        res = client.post(IMAGE_ENDPOINT, json={"image_base64": ""})
        assert res.status_code == 422
