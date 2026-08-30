import asyncio

from httpx import ASGITransport, AsyncClient

from pythonbackend.main import app


async def get_health_response():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get("/health")


def test_health_endpoint_returns_service_status():
    response = asyncio.run(get_health_response())

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "orbitx-scientific-service",
    }
