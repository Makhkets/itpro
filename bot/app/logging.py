from __future__ import annotations

import logging
import sys

SENSITIVE_KEYS = {"password", "token", "authorization", "jwt", "bot_token", "secret", "proxy"}


class SensitiveFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = str(record.getMessage()).lower()
        for key in SENSITIVE_KEYS:
            if key in msg and ("=" in msg or ":" in msg):
                record.msg = "[redacted: sensitive content]"
                record.args = ()
                break
        return True


def setup_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())

    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s %(levelname)s %(name)s :: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    handler.addFilter(SensitiveFilter())
    root.addHandler(handler)

    logging.getLogger("aiogram.event").setLevel(logging.WARNING)
    logging.getLogger("aiohttp.access").setLevel(logging.WARNING)
