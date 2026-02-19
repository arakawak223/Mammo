"""OCRサービス（Codespaces環境向け簡易実装）"""

import base64
import logging
import re

logger = logging.getLogger(__name__)


class OcrService:
    """画像からテキストを抽出するサービス。

    Codespaces環境ではpytesseractが使えないため、
    Base64デコード→正規表現ベースのヒューリスティックで
    テキスト部分を検出する簡易実装。

    本番環境では pytesseract や Google Vision API に差し替え。
    """

    def extract_text(self, image_base64: str) -> str:
        """Base64エンコードされた画像からテキストを抽出"""
        try:
            # Base64をデコードしてバイナリを取得
            image_data = base64.b64decode(image_base64)

            # pytesseract が使える環境ではOCRを実行
            try:
                import pytesseract
                from PIL import Image
                import io

                image = Image.open(io.BytesIO(image_data))
                text = pytesseract.image_to_string(image, lang="jpn")
                logger.info("OCR抽出完了 (pytesseract): %d文字", len(text))
                return text.strip()
            except ImportError:
                logger.info("pytesseract未インストール — ヒューリスティック抽出にフォールバック")

            # Codespaces フォールバック: バイナリからテキストパターンを検出
            return self._heuristic_extract(image_data)

        except Exception as e:
            logger.error("OCRテキスト抽出に失敗: %s", str(e))
            return ""

    def _heuristic_extract(self, data: bytes) -> str:
        """バイナリデータからテキストっぽい部分を抽出（フォールバック）"""
        # UTF-8でデコード可能な連続部分を探す
        text_parts: list[str] = []
        try:
            decoded = data.decode("utf-8", errors="ignore")
            # 日本語文字やASCII文字の連続を検出
            patterns = re.findall(
                r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEFa-zA-Z0-9\s,.!?、。！？「」（）\-]{4,}',
                decoded,
            )
            text_parts.extend(patterns)
        except Exception:
            pass

        result = " ".join(text_parts).strip()
        if result:
            logger.info("ヒューリスティック抽出: %d文字", len(result))
        else:
            logger.info("テキスト抽出結果: 空（画像のみのコンテンツの可能性）")
        return result
