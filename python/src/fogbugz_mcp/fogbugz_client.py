from __future__ import annotations

from typing import Any

import httpx

from .types import CaseActionData, ListPeopleData, SearchData


class FogBugzApiError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class FogBugzClient:
    def __init__(self, base_url: str, token: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._token = token
        self._http = httpx.AsyncClient()

    async def _request(self, command: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{self._base_url}/api/{command}"
        body: dict[str, Any] = {"token": self._token}
        if params:
            body.update(params)

        response = await self._http.post(
            url,
            json=body,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )

        if not response.is_success:
            raise FogBugzApiError(
                "HTTP_ERROR",
                f"HTTP {response.status_code}: {response.reason_phrase}",
            )

        data = response.json()
        errors = data.get("errors") or []
        if errors:
            err = errors[0]
            raise FogBugzApiError(err["code"], err["message"])

        return data["data"]

    async def search(self, q: str, cols: list[str], max: int | None = None) -> SearchData:
        params: dict[str, Any] = {"q": q, "cols": cols}
        if max is not None:
            params["max"] = max
        return await self._request("search", params)

    async def new_case(self, fields: dict[str, Any]) -> CaseActionData:
        return await self._request("new", fields)

    async def edit(self, ix_bug: int, fields: dict[str, Any]) -> CaseActionData:
        return await self._request("edit", {"ixBug": ix_bug, **fields})

    async def assign(self, ix_bug: int, assignee: str, s_event: str | None = None) -> CaseActionData:
        params: dict[str, Any] = {"ixBug": ix_bug, "sPersonAssignedTo": assignee}
        if s_event:
            params["sEvent"] = s_event
        return await self._request("assign", params)

    async def resolve(self, ix_bug: int, options: dict[str, Any] | None = None) -> CaseActionData:
        params: dict[str, Any] = {"ixBug": ix_bug}
        if options:
            params.update(options)
        return await self._request("resolve", params)

    async def close(self, ix_bug: int, s_event: str | None = None) -> CaseActionData:
        params: dict[str, Any] = {"ixBug": ix_bug}
        if s_event:
            params["sEvent"] = s_event
        return await self._request("close", params)

    async def reopen(self, ix_bug: int, s_event: str | None = None) -> CaseActionData:
        params: dict[str, Any] = {"ixBug": ix_bug}
        if s_event:
            params["sEvent"] = s_event
        return await self._request("reopen", params)

    async def reactivate(self, ix_bug: int, s_event: str | None = None) -> CaseActionData:
        params: dict[str, Any] = {"ixBug": ix_bug}
        if s_event:
            params["sEvent"] = s_event
        return await self._request("reactivate", params)

    async def list_people(self, options: dict[str, Any] | None = None) -> ListPeopleData:
        return await self._request("listPeople", options or {})

    def get_case_url(self, ix_bug: int) -> str:
        return f"{self._base_url}/f/cases/{ix_bug}"
