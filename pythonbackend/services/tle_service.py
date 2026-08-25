from pythonbackend.services.local_tle_provider import (
    LocalTLEProvider,
)
from pythonbackend.services.tle_provider import TLEProvider


class TLEService:
    """Service responsible for retrieving satellite TLE data."""

    def __init__(
        self,
        provider: TLEProvider | None = None,
    ):
        self.provider = provider or LocalTLEProvider()

    def get_tle(
        self,
        satellite_id: str,
    ) -> tuple[str, str, str]:

        return self.provider.get_tle(satellite_id)