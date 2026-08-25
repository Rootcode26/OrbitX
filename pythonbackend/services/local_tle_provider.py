import json
from pathlib import Path

from pythonbackend.services.tle_provider import TLEProvider


class LocalTLEProvider(TLEProvider):
    """Load TLE data from local files."""

    def __init__(
        self,
        tle_directory: str = "data",
        catalog_path: str | None = None,
    ):
        self.tle_directory = Path(tle_directory)

        if catalog_path is None:
            self.catalog_path = (
                self.tle_directory / "satellites.json"
            )
        else:
            self.catalog_path = Path(catalog_path)

        self.satellite_catalog = self._load_catalog()

    def _load_catalog(self) -> dict:
        """Load the satellite catalogue."""

        if not self.catalog_path.exists():
            raise FileNotFoundError(
                f"Satellite catalogue not found: "
                f"{self.catalog_path}"
            )

        with self.catalog_path.open(
            "r",
            encoding="utf-8",
        ) as file:
            return json.load(file)

    def load_from_file(
        self,
        file_path: str,
    ) -> tuple[str, str, str]:
        """Load and validate a three-line TLE file."""

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(
                f"TLE file not found: {file_path}"
            )

        lines = [
            line.strip()
            for line in path.read_text(
                encoding="utf-8"
            ).splitlines()
            if line.strip()
        ]

        if len(lines) != 3:
            raise ValueError(
                "TLE file must contain exactly "
                "3 non-empty lines"
            )

        name, line1, line2 = lines

        if not line1.startswith("1 "):
            raise ValueError("Invalid TLE line 1")

        if not line2.startswith("2 "):
            raise ValueError("Invalid TLE line 2")

        return name, line1, line2

    def get_tle(
        self,
        satellite_id: str,
    ) -> tuple[str, str, str]:

        satellite = self.satellite_catalog.get(
            satellite_id
        )

        if satellite is None:
            raise ValueError(
                f"TLE not found for satellite ID: "
                f"{satellite_id}"
            )

        file_name = satellite.get("file")

        if not file_name:
            raise ValueError(
                f"No TLE file configured for satellite ID: "
                f"{satellite_id}"
            )

        file_path = self.tle_directory / file_name

        return self.load_from_file(
            str(file_path)
        )