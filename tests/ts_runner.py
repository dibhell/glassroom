import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]


def run_ts_json(script: str) -> Any:
    npx_cmd = "npx.cmd" if shutil.which("npx.cmd") else "npx"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".ts", delete=False, dir=REPO_ROOT) as tmp:
        tmp.write(script)
        temp_path = Path(tmp.name)

    try:
        result = subprocess.run(
            [npx_cmd, "--yes", "tsx", str(temp_path)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        if not lines:
            raise AssertionError("TypeScript runner returned empty stdout")
        return json.loads(lines[-1])
    finally:
        temp_path.unlink(missing_ok=True)
