from pathlib import Path

from pythonbackend.services.tle_provider import TLEProvider


class LocalTLEProvider(TLEProvider):
    """Load TLE data from local files."""

    def __init__(self, tle_directory: str = "data"):
        self.tle_directory = Path(tle_directory)

        self.tle_files = {
            "25544": "iss.tle",
            "25338": "noaa15.tle",
        }

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
            for line in path.read_text().splitlines()
            if line.strip()
        ]

        if len(lines) != 3:
            raise ValueError(
                "TLE file must contain exactly 3 non-empty lines"
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

        file_name = self.tle_files.get(satellite_id)

        if file_name is None:
            raise ValueError(
                f"TLE not found for satellite ID: {satellite_id}"
            )

        file_path = self.tle_directory / file_name

        return self.load_from_file(str(file_path))