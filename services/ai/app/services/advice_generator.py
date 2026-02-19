"""地域別詐欺アドバイス生成サービス"""

SCAM_TYPE_LABELS = {
    "ore_ore": "オレオレ詐欺",
    "refund_fraud": "還付金詐欺",
    "billing_fraud": "架空請求詐欺",
    "investment_fraud": "投資詐欺",
    "cash_card_fraud": "キャッシュカード詐欺",
    "romance_fraud": "ロマンス詐欺",
}

SCAM_TYPE_ADVICE = {
    "ore_ore": (
        "息子や孫を名乗る電話に注意してください。"
        "「携帯番号が変わった」「会社のお金を使い込んだ」は典型的な手口です。"
        "必ず元の番号に折り返し確認しましょう。"
    ),
    "refund_fraud": (
        "市役所や税務署を名乗る還付金の電話にご注意ください。"
        "ATM操作で還付金は受け取れません。"
        "不審な電話は一度切って、公式番号に確認しましょう。"
    ),
    "billing_fraud": (
        "身に覚えのない請求書やメールに返信しないでください。"
        "「未払い料金がある」「法的措置を取る」は脅し文句です。"
        "公的機関に直接確認しましょう。"
    ),
    "investment_fraud": (
        "「必ず儲かる」「元本保証」の投資話は詐欺です。"
        "SNSやマッチングアプリ経由の投資勧誘に注意してください。"
        "金融庁の登録業者か必ず確認しましょう。"
    ),
    "cash_card_fraud": (
        "キャッシュカードを他人に渡さないでください。"
        "「封印する」「預かる」「新しいカードに交換する」は全て詐欺です。"
        "銀行員や警察官がカードを受け取りに来ることはありません。"
    ),
    "romance_fraud": (
        "ネット上で知り合った人から金銭を要求された場合は詐欺を疑いましょう。"
        "「投資で一緒に稼ごう」「渡航費用を貸して」は典型パターンです。"
        "実際に会ったことがない人への送金は絶対にやめましょう。"
    ),
}


class AdviceGenerator:
    def generate_regional_advice(
        self,
        prefecture: str,
        top_scam_types: list[dict],
    ) -> dict:
        """都道府県と上位詐欺手口に基づいてアドバイスを生成"""
        if not top_scam_types:
            return {
                "prefecture": prefecture,
                "advice": f"{prefecture}の詐欺統計データがまだありません。全国的な注意喚起として、不審な電話やメールには十分ご注意ください。",
                "details": [],
            }

        details = []
        for item in top_scam_types[:3]:
            scam_type = item.get("scam_type", item.get("scamType", "unknown"))
            label = SCAM_TYPE_LABELS.get(scam_type, scam_type)
            advice = SCAM_TYPE_ADVICE.get(
                scam_type,
                f"「{label}」型の詐欺にご注意ください。不審に感じたら#9110に相談しましょう。",
            )
            details.append({
                "scam_type": scam_type,
                "label": label,
                "count": item.get("count", 0),
                "amount": item.get("amount", 0),
                "advice": advice,
            })

        top_labels = [d["label"] for d in details]
        summary = (
            f"{prefecture}では、{', '.join(top_labels)}が多く報告されています。"
            f"以下の注意点を確認し、ご家族とも共有してください。"
        )

        return {
            "prefecture": prefecture,
            "advice": summary,
            "details": details,
        }
