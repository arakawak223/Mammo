"""Call/SMS metadata analyzer for auto-forwarded events (F2)."""

import re

MODEL_VERSION = "metadata-rule-v0.1.0"

# Known scam area codes / international prefixes
SUSPICIOUS_PREFIXES = [
    "+1",    # US (often spoofed)
    "+44",   # UK
    "+86",   # China
    "+63",   # Philippines
    "+234",  # Nigeria
    "+855",  # Cambodia
    "050",   # IP phone (domestic, often scam)
    "0120",  # Toll-free (sometimes spoofed)
]

SMS_SCAM_KEYWORDS = [
    "当選", "未払い", "口座", "振込", "至急", "本日中",
    "最終通告", "裁判", "差し押さえ", "支払い期限",
    "不正アクセス", "不正利用", "アカウント停止",
    "ログイン確認", "本人確認", "お届け物",
    "還付金", "払い戻し", "投資", "高収益",
    "クリックしてください", "URLをタップ",
]

URL_PATTERN = re.compile(r"https?://[^\s]+|[a-zA-Z0-9.-]+\.(com|jp|net|org|xyz|top|click|info)/[^\s]*")


class MetadataAnalyzer:
    """Analyze call/SMS metadata for scam risk."""

    def analyze(
        self,
        phone_number: str,
        call_type: str = "call",
        sms_content: str | None = None,
    ) -> dict:
        risk_score = 0
        reasons: list[str] = []
        scam_type = "unknown"
        keywords_found: list[str] = []

        # 1. Phone number analysis
        number_risk, number_reasons = self._analyze_number(phone_number)
        risk_score += number_risk
        reasons.extend(number_reasons)

        # 2. SMS content analysis (if provided)
        if sms_content and call_type == "sms":
            sms_risk, sms_reasons, sms_keywords = self._analyze_sms(sms_content)
            risk_score += sms_risk
            reasons.extend(sms_reasons)
            keywords_found.extend(sms_keywords)

            if sms_risk >= 40:
                scam_type = "sms_phishing"

        # 3. Determine scam type from number pattern
        if number_risk >= 30 and scam_type == "unknown":
            scam_type = "suspicious_call"

        risk_score = min(risk_score, 100)

        summary = self._build_summary(risk_score, reasons, call_type)

        return {
            "risk_score": risk_score,
            "scam_type": scam_type,
            "summary": summary,
            "keywords_found": keywords_found,
            "reasons": reasons,
            "model_version": MODEL_VERSION,
        }

    def _analyze_number(self, phone_number: str) -> tuple[int, list[str]]:
        risk = 0
        reasons = []

        # International number (non-Japan)
        if phone_number.startswith("+") and not phone_number.startswith("+81"):
            risk += 40
            reasons.append("国際番号からの着信")

        # Suspicious prefixes
        for prefix in SUSPICIOUS_PREFIXES:
            if phone_number.startswith(prefix):
                risk += 20
                reasons.append(f"疑わしいプレフィックス: {prefix}")
                break

        # Hidden/withheld number
        if phone_number in ["非通知", "unknown", "private", ""]:
            risk += 30
            reasons.append("非通知番号")

        # Very short number (possible spoofed)
        if len(phone_number.replace("+", "").replace("-", "")) < 8:
            risk += 15
            reasons.append("短い番号（偽装の可能性）")

        return risk, reasons

    def _analyze_sms(self, content: str) -> tuple[int, list[str], list[str]]:
        risk = 0
        reasons = []
        keywords = []

        # Keyword matching
        for keyword in SMS_SCAM_KEYWORDS:
            if keyword in content:
                risk += 10
                keywords.append(keyword)

        if keywords:
            reasons.append(f"詐欺関連キーワード検出: {', '.join(keywords[:5])}")

        # URL detection
        urls = URL_PATTERN.findall(content)
        if urls:
            risk += 20
            reasons.append("不審なURLが含まれています")

        # Urgency indicators
        urgency_words = ["今すぐ", "急いで", "至急", "本日中", "期限"]
        urgency_found = [w for w in urgency_words if w in content]
        if urgency_found:
            risk += 15
            reasons.append("緊急性を煽る表現を検出")

        return risk, reasons, keywords

    def _build_summary(self, risk_score: int, reasons: list[str], call_type: str) -> str:
        call_label = "SMS" if call_type == "sms" else "着信"

        if risk_score >= 70:
            level = "高リスク"
        elif risk_score >= 40:
            level = "中リスク"
        elif risk_score >= 20:
            level = "やや疑わしい"
        else:
            level = "低リスク"

        summary = f"この{call_label}は{level}と判定されました。"
        if reasons:
            summary += f"理由: {'; '.join(reasons[:3])}"

        return summary
