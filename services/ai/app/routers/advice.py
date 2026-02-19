"""地域別アドバイスエンドポイント"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.advice_generator import AdviceGenerator

router = APIRouter()
generator = AdviceGenerator()


class ScamTypeStat(BaseModel):
    scam_type: str = Field(..., alias="scamType")
    count: int = 0
    amount: float = 0

    model_config = {"populate_by_name": True}


class RegionalAdviceRequest(BaseModel):
    model_config = {"json_schema_extra": {"title": "地域別アドバイスリクエスト"}, "populate_by_name": True}
    prefecture: str = Field(..., description="都道府県名")
    top_scam_types: list[ScamTypeStat] = Field(
        default_factory=list,
        alias="topScamTypes",
        description="上位詐欺手口リスト",
    )


class AdviceDetail(BaseModel):
    scam_type: str
    label: str
    count: int
    amount: float
    advice: str


class RegionalAdviceResponse(BaseModel):
    model_config = {"json_schema_extra": {"title": "地域別アドバイスレスポンス"}}
    prefecture: str
    advice: str
    details: list[AdviceDetail]


@router.post(
    "/advice/regional",
    response_model=RegionalAdviceResponse,
    summary="地域別アドバイス生成",
    description="都道府県と上位詐欺手口データに基づいて、地域固有のアドバイスを生成します。",
)
async def get_regional_advice(request: RegionalAdviceRequest):
    """地域別の詐欺注意喚起アドバイスを生成"""
    top_types = [
        {
            "scam_type": s.scam_type,
            "count": s.count,
            "amount": s.amount,
        }
        for s in request.top_scam_types
    ]
    result = generator.generate_regional_advice(request.prefecture, top_types)
    return result
