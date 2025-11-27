# backend/services/queue_worker.py
import os
import time
import threading
import queue
import logging
from typing import Iterable

logger = logging.getLogger(__name__)

from services.ingestion import fetch_and_store

RATE = float(os.getenv("DHAN_RATE_LIMIT_SEC", "3.0"))

_symbol_queue: "queue.Queue[str]" = queue.Queue()


def enqueue(symbol: str):
    _symbol_queue.put(symbol)
    logger.debug("Enqueued symbol: %s", symbol)


def enqueue_many(symbols: Iterable[str]):
    for s in symbols:
        enqueue(s)


def _worker_loop():
    logger.info("Dhan ingestion worker started (rate %.2fs)", RATE)
    while True:
        symbol = _symbol_queue.get()
        try:
            logger.info("Dequeued and processing: %s", symbol)
            fetch_and_store(symbol)
        except Exception as e:
            logger.exception("Error processing symbol %s: %s", symbol, e)
        time.sleep(RATE)
        _symbol_queue.task_done()


_worker_thread: threading.Thread | None = None


def start_worker_daemon():
    global _worker_thread
    if _worker_thread and _worker_thread.is_alive():
        return _worker_thread
    _worker_thread = threading.Thread(target=_worker_loop, daemon=True, name="dhan-ingest-worker")
    _worker_thread.start()
    return _worker_thread
