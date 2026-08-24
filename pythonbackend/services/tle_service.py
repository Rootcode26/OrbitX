from pathlib import Path


class TLEService:
    """Load and retrieve TLE data."""

    def load_from_file(self, file_path: str) -> tuple[str, str, str]:
        """Load a three-line TLE file."""

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

    def get_tle(self, satellite_id: str) -> tuple[str, str, str]:
        """
        Get TLE data using a satellite/NORAD catalog ID.

        Currently uses local TLE fixtures.
        A remote TLE provider will replace this later.
        """

        tle_files = {
            "25544": "data/iss.tle",
            "25338": "data/noaa15.tle",
        }

        file_path = tle_files.get(satellite_id)

        if file_path is None:
            raise ValueError(
                f"TLE not found for satellite ID: {satellite_id}"
            )

        return self.load_from_file(file_path)