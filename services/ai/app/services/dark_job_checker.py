"""Dark job (闇バイト) detection service — enhanced v2 with LLM hybrid."""

import logging

logger = logging.getLogger(__name__)

MODEL_VERSION = "darkjob-hybrid-v2.0.0"

# (category, keywords, risk_weight)
DARK_JOB_PATTERNS: list[tuple[str, list[str], int]] = [
    (
        "high_pay_lure",
        [
            "高額バイト", "日給10万", "日給5万", "日給3万", "簡単に稼げる",
            "即日払い", "即日現金", "高収入", "短時間で", "誰でもできる",
            "スマホだけ", "月収100万", "週払い可", "日払い", "時給5000",
            "時給1万", "在宅で稼げる", "副業OK", "即金",
        ],
        30,
    ),
    (
        "criminal_activity",
        [
            "受け子", "出し子", "運び屋", "荷物を受け取る", "現金を受け取り",
            "カードを回収", "ATMで引き出", "口座を貸し", "名義貸し",
            "見張り", "アジト", "飛ばし", "持ち逃げ", "闇金",
            "違法", "クスリ", "大麻", "裏カジノ", "特殊詐欺",
        ],
        50,
    ),
    (
        "secrecy_signals",
        [
            "Telegram", "シグナル", "テレグラム", "Signal", "秘密厳守",
            "誰にも言わない", "身分証を送", "顔写真を送", "消えるメッセージ",
            "アカウント削除", "免許証の写真", "マイナンバーカード",
            "身分証明書を撮影", "本名不要", "匿名OK",
        ],
        25,
    ),
    (
        "urgency_coercion",
        [
            "今すぐ連絡", "急募", "人数限定", "途中でやめたら", "逃げたら",
            "家族に危害", "個人情報握ってる", "辞められない", "脅迫",
            "抜けたら", "グループ抜けたら", "裏切ったら", "先払い",
        ],
        35,
    ),
    (
        "sns_recruitment",
        [
            "DM", "インスタ", "LINE追加", "Twitter", "TikTok",
            "DMください", "プロフのリンク", "固定ツイ見て",
            "ストーリー見て", "フォロバ", "裏垢", "鍵垢",
        ],
        15,
    ),
    (
        "luffy_syndicate",
        [
            "ルフィ", "指示役", "指示に従うだけ", "上からの指示",
            "グループに入って", "仲間募集", "組織", "ボスの指示",
            "特別チーム", "選ばれた",
        ],
        40,
    ),
    (
        "disguised_legitimate",
        [
            "マーケティング調査", "テスティング", "モニター募集",
            "商品受取代行", "荷物転送", "口座開設代行",
            "レンタル携帯", "レンタル口座", "代理購入",
            "名前を貸すだけ", "ハンコ押すだけ",
        ],
        20,
    ),
]

RISK_THRESHOLDS = {"high": 60, "medium": 35}

# グレーゾーン（LLM呼び出し候補）
LLM_GREY_ZONE = (20, 55)


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
        if len(matched) >= 4:
            total_score += 20
        elif len(matched) >= 3:
            total_score += 15
        elif len(matched) >= 2:
            total_score += 10

        total_score = min(total_score, 100)

        all_keywords = []
        for _, kws, _ in matched:
            all_keywords.extend(kws)

        # グレーゾーンではLLMハイブリッド判定を試行
        if LLM_GREY_ZONE[0] <= total_score <= LLM_GREY_ZONE[1]:
            llm_result = self._llm_hybrid_check(text, total_score)
            if llm_result is not None:
                total_score = llm_result

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
            "sns_recruitment": "SNS勧誘パターン",
            "luffy_syndicate": "犯罪組織の勧誘",
            "disguised_legitimate": "偽装された正当業務",
        }

        cats = [categories_ja.get(m[0], m[0]) for m in matched]
        explanation = (
            f"闇バイトの可能性が{'高い' if risk_level == 'high' else 'あり'}ます。"
            f"検出カテゴリ: {', '.join(cats)}。"
            f"{'絶対に応じないでください。警察（#9110）に相談しましょう。' if risk_level == 'high' else '十分注意してください。'}"
        )

        return {
            "is_dark_job": total_score >= RISK_THRESHOLDS["medium"],
            "risk_level": risk_level,
            "risk_score": total_score,
            "keywords_found": list(set(all_keywords)),
            "explanation": explanation,
            "model_version": MODEL_VERSION,
        }

    def _llm_hybrid_check(self, text: str, rule_score: int) -> int | None:
        """グレーゾーンスコアに対してLLM判定を実行。

        Codespaces環境ではLLMが使えないため、
        追加ヒューリスティックでルールベース補正を行う。
        本番環境では OpenAI / Claude API 呼び出しに差し替え。
        """
        try:
            # Codespaces フォールバック: 追加ヒューリスティック
            boost = 0
            suspicious_patterns = [
                ("報酬.*即日", 10),
                ("連絡先.*Telegram", 15),
                ("身分証.*送", 12),
                ("誰にも.*言わない", 10),
                ("簡単.*高収入", 12),
                ("口座.*開設", 10),
                ("受け取.*現金", 15),
            ]
            import re
            for pattern, score in suspicious_patterns:
                if re.search(pattern, text):
                    boost += score

            if boost > 0:
                logger.info(
                    "LLMフォールバック補正: rule=%d, boost=%d",
                    rule_score,
                    boost,
                )
                return min(rule_score + boost, 100)

            return None

        except Exception as e:
            logger.error("LLMハイブリッド判定エラー: %s", str(e))
            return None
