"""Rule-based scam analyzer (Phase 0 – to be replaced by ML model in Phase 2)."""

import re

MODEL_VERSION = "rule-v0.1.0"

# Scam patterns: (pattern_name, keywords, base_score)
SCAM_PATTERNS: list[tuple[str, list[str], int]] = [
    (
        "ore_ore",  # オレオレ詐欺
        ["俺だけど", "オレだよ", "事故を起こし", "示談金", "会社の金", "使い込み",
         "弁護士に", "今日中に", "誰にも言わないで", "声が変わった"],
        70,
    ),
    (
        "refund_fraud",  # 還付金詐欺
        ["還付金", "払い戻し", "ATMで", "保険料", "医療費", "手続き期限",
         "市役所", "年金事務所", "社会保険", "期限が今日"],
        75,
    ),
    (
        "billing_fraud",  # 架空請求
        ["未払い", "裁判", "訴訟", "法的手続き", "最終通告", "身に覚え",
         "滞納", "差し押さえ", "電子マネー", "コンビニで払"],
        65,
    ),
    (
        "investment_fraud",  # 投資詐欺
        ["必ず儲かる", "元本保証", "高配当", "今だけ", "限定", "仮想通貨",
         "投資", "口座に振り込", "利回り", "特別な案件"],
        60,
    ),
    (
        "cash_card_fraud",  # キャッシュカード詐欺
        ["キャッシュカード", "暗証番号", "銀行協会", "預金を守る", "口座が危険",
         "不正利用", "カードを預かり", "封筒に入れ", "すぐに届く"],
        80,
    ),
]

URGENCY_KEYWORDS = [
    "今すぐ", "急いで", "すぐに", "今日中", "明日まで", "時間がない",
    "誰にも", "内緒", "秘密", "警察に言わない",
]


class ScamAnalyzer:
    def analyze(
        self, text: str, caller_number: str | None = None
    ) -> dict:
        matched_patterns: list[tuple[str, list[str], int]] = []

        for pattern_name, keywords, base_score in SCAM_PATTERNS:
            found = [kw for kw in keywords if kw in text]
            if found:
                matched_patterns.append((pattern_name, found, base_score))

        if not matched_patterns:
            return {
                "risk_score": 5,
                "scam_type": "none",
                "summary": "特に詐欺の兆候は検出されませんでした。",
                "keywords_found": [],
                "model_version": MODEL_VERSION,
            }

        # Pick the highest-scoring pattern
        matched_patterns.sort(key=lambda x: x[2], reverse=True)
        top_name, top_keywords, top_score = matched_patterns[0]

        # Urgency bonus
        urgency_found = [kw for kw in URGENCY_KEYWORDS if kw in text]
        urgency_bonus = min(len(urgency_found) * 5, 15)

        # Multiple-pattern bonus
        multi_bonus = min((len(matched_patterns) - 1) * 10, 20)

        all_keywords = []
        for _, kws, _ in matched_patterns:
            all_keywords.extend(kws)
        all_keywords.extend(urgency_found)

        final_score = min(top_score + urgency_bonus + multi_bonus, 100)

        scam_type_names = {
            "ore_ore": "オレオレ詐欺",
            "refund_fraud": "還付金詐欺",
            "billing_fraud": "架空請求詐欺",
            "investment_fraud": "投資詐欺",
            "cash_card_fraud": "キャッシュカード詐欺",
        }

        types_found = [scam_type_names.get(p[0], p[0]) for p in matched_patterns]

        if final_score >= 70:
            severity = "高い確率"
        elif final_score >= 50:
            severity = "中程度の可能性"
        else:
            severity = "やや疑わしい兆候"

        summary = (
            f"{types_found[0]}の{severity}があります。"
            f"「{'」「'.join(top_keywords[:3])}」などの典型的なキーワードが検出されました。"
        )

        return {
            "risk_score": final_score,
            "scam_type": top_name,
            "summary": summary,
            "keywords_found": list(set(all_keywords)),
            "model_version": MODEL_VERSION,
        }
