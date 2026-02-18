"""Dark job (闇バイト) detection service (rule-based Phase 0)."""

MODEL_VERSION = "darkjob-rule-v0.1.0"

# (category, keywords, risk_weight)
DARK_JOB_PATTERNS: list[tuple[str, list[str], int]] = [
    (
        "high_pay_lure",
        ["高額バイト", "日給10万", "日給5万", "簡単に稼げる", "即日払い",
         "高収入", "短時間で", "誰でもできる", "スマホだけ"],
        30,
    ),
    (
        "criminal_activity",
        ["受け子", "出し子", "運び屋", "荷物を受け取る", "現金を受け取り",
         "カードを回収", "ATMで引き出", "口座を貸し", "名義貸し"],
        50,
    ),
    (
        "secrecy_signals",
        ["Telegram", "シグナル", "テレグラム", "秘密厳守", "誰にも言わない",
         "身分証を送", "顔写真を送", "消えるメッセージ", "アカウント削除"],
        25,
    ),
    (
        "urgency_coercion",
        ["今すぐ連絡", "急募", "人数限定", "途中でやめたら", "逃げたら",
         "家族に危害", "個人情報握ってる", "辞められない"],
        35,
    ),
]

RISK_THRESHOLDS = {"high": 60, "medium": 35}


class DarkJobChecker:
    def check(self, text: str, source: str | None = None) -> dict:
        matched: list[tuple[str, list[str], int]] = []

        for category, keywords, weight in DARK_JOB_PATTERNS:
            found = [kw for kw in keywords if kw in text]
            if found:
                matched.append((category, found, weight))

        if not matched:
            return {
                "is_dark_job": False,
                "risk_level": "low",
                "risk_score": 0,
                "keywords_found": [],
                "explanation": "闇バイトの兆候は検出されませんでした。",
                "model_version": MODEL_VERSION,
            }

        total_score = sum(m[2] for m in matched)
        # Bonus for multiple category matches
        if len(matched) >= 3:
            total_score += 15
        elif len(matched) >= 2:
            total_score += 10

        total_score = min(total_score, 100)

        all_keywords = []
        for _, kws, _ in matched:
            all_keywords.extend(kws)

        if total_score >= RISK_THRESHOLDS["high"]:
            risk_level = "high"
        elif total_score >= RISK_THRESHOLDS["medium"]:
            risk_level = "medium"
        else:
            risk_level = "low"

        categories_ja = {
            "high_pay_lure": "高額報酬の誘い",
            "criminal_activity": "犯罪行為の示唆",
            "secrecy_signals": "秘匿性の要求",
            "urgency_coercion": "緊急性・脅迫",
        }

        cats = [categories_ja.get(m[0], m[0]) for m in matched]
        explanation = (
            f"闇バイトの可能性が{'高い' if risk_level == 'high' else 'あり'}ます。"
            f"検出カテゴリ: {', '.join(cats)}。"
            f"{'絶対に応じないでください。' if risk_level == 'high' else '十分注意してください。'}"
        )

        return {
            "is_dark_job": total_score >= RISK_THRESHOLDS["medium"],
            "risk_level": risk_level,
            "risk_score": total_score,
            "keywords_found": list(set(all_keywords)),
            "explanation": explanation,
            "model_version": MODEL_VERSION,
        }
