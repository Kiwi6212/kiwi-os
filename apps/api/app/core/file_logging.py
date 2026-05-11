"""File-based logging fallback for cases where the DB sink is unavailable.

The DB sink (app/services/system_logger.py) is the primary destination for
runtime events. But two cases escape it:

  1. Bootstrap errors — anything that crashes before lifespan attaches
     `app.state.db_sessionmaker` produces no DB row.
  2. Postgres down — the DB sink swallows its own errors by design, so a
     dead database leaves a silent app.

This module wires a stdlib logger that writes to `logs/system.log` with
size-based rotation. Because `system_logger.log_event` already emits
through the stdlib `logging` hierarchy, every DB log also lands in the
file automatically once this is configured.

Call `configure_file_logging()` as the FIRST thing in `app/main.py`,
before any other application import, so that import-time failures are
captured.
"""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


def configure_file_logging() -> None:
    """Install a RotatingFileHandler + stderr handler on the root logger.

    Idempotent: clears any pre-existing handlers so repeated invocations
    (e.g. in tests) do not duplicate output.
    """
    # apps/api/app/core/file_logging.py -> parents[2] is apps/api/
    log_dir = Path(__file__).resolve().parents[2] / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    log_file = log_dir / "system.log"

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setLevel(logging.WARNING)
    stderr_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers.clear()
    root_logger.addHandler(file_handler)
    root_logger.addHandler(stderr_handler)

    root_logger.info("File logging initialized (logs/system.log)")
