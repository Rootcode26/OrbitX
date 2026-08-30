from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["healthy"]
    service: Literal["orbitx-scientific-service"]


router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Check scientific service health",
)
def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service="orbitx-scientific-service",
    )
