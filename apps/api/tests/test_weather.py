import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.mark.asyncio
async def test_weather_endpoint_requires_coords() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/weather")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_weather_endpoint_rejects_invalid_coords() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/weather?lat=999&lon=0")
    assert response.status_code == 422
