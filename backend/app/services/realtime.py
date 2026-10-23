"""Real-time fan-out for messaging.

A WebSocket is held by one process. Run two API workers and a message sent to
a socket on worker A never reaches a socket on worker B, so an in-memory
registry quietly breaks the moment you scale past one instance -- and looks
fine in development, which is the dangerous part.

Everything therefore goes through Redis pub/sub: a publisher writes to a
channel, every worker subscribed to it pushes the payload down its own local
sockets. The local registry below is just the last hop.

Channels are per thread (`thread:<id>`) so a worker only receives traffic for
conversations it actually has open.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections import defaultdict
from typing import Any

import redis.asyncio as redis
from fastapi import WebSocket

from app.core.config import settings

log = logging.getLogger(__name__)


def channel_for_thread(thread_id: str) -> str:
    return f"thread:{thread_id}"


def channel_for_user(user_id: str) -> str:
    return f"user:{user_id}"


class Hub:
    """Local sockets plus a Redis subscription that feeds them."""

    def __init__(self) -> None:
        self._sockets: dict[str, set[WebSocket]] = defaultdict(set)
        self._redis: redis.Redis | None = None
        self._pubsub: Any = None
        self._reader: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    # -- lifecycle ---------------------------------------------------------

    async def connect_redis(self) -> None:
        if self._redis is not None:
            return
        self._redis = redis.from_url(settings.redis_url, decode_responses=True)
        self._pubsub = self._redis.pubsub(ignore_subscribe_messages=True)
        self._reader = asyncio.create_task(self._read_loop())

    async def close(self) -> None:
        if self._reader:
            self._reader.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._reader
            self._reader = None
        if self._pubsub is not None:
            await self._pubsub.aclose()
            self._pubsub = None
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None
        self._sockets.clear()

    # -- membership --------------------------------------------------------

    async def subscribe(self, channel: str, socket: WebSocket) -> None:
        async with self._lock:
            first = not self._sockets[channel]
            self._sockets[channel].add(socket)
            if first and self._pubsub is not None:
                await self._pubsub.subscribe(channel)

    async def unsubscribe(self, channel: str, socket: WebSocket) -> None:
        async with self._lock:
            self._sockets[channel].discard(socket)
            if not self._sockets[channel]:
                del self._sockets[channel]
                if self._pubsub is not None:
                    with contextlib.suppress(Exception):
                        await self._pubsub.unsubscribe(channel)

    # -- publishing --------------------------------------------------------

    async def publish(self, channel: str, payload: dict) -> None:
        """Send to every worker, including this one.

        Going through Redis even for local sockets keeps one delivery path, so
        a bug cannot show up only in the multi-worker case.
        """
        if self._redis is None:
            await self._deliver_local(channel, payload)
            return
        await self._redis.publish(channel, json.dumps(payload))

    async def _deliver_local(self, channel: str, payload: dict) -> None:
        dead: list[WebSocket] = []
        for socket in list(self._sockets.get(channel, ())):
            try:
                await socket.send_json(payload)
            except Exception:
                # A socket that errors on send is gone; reap it rather than
                # letting it accumulate.
                dead.append(socket)
        for socket in dead:
            await self.unsubscribe(channel, socket)

    async def _read_loop(self) -> None:
        assert self._pubsub is not None
        while True:
            try:
                # redis-py raises if you poll a pubsub with no subscriptions,
                # which is the normal state until the first socket connects.
                if not self._pubsub.subscribed:
                    await asyncio.sleep(0.05)
                    continue

                message = await self._pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if message is None:
                    continue
                channel = message["channel"]
                payload = json.loads(message["data"])
                await self._deliver_local(channel, payload)
            except asyncio.CancelledError:
                raise
            except Exception:
                # Never let one bad frame kill the reader; the sockets would
                # stay open and silently stop receiving.
                log.exception("realtime reader error")
                await asyncio.sleep(0.5)


hub = Hub()
