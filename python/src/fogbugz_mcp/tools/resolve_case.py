from __future__ import annotations

from typing import TYPE_CHECKING, Any

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient


def register_resolve_case(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="resolve_case",
        description="Resolve an active FogBugz case. Optionally specify a resolution status and comment.",
        annotations={"destructiveHint": True},
    )
    async def resolve_case(
        case_number: int, status: str | None = None, comment: str | None = None
    ) -> str:
        """Resolve an active FogBugz case."""
        options: dict[str, Any] = {}
        if status:
            options["sStatus"] = status
        if comment:
            options["sEvent"] = comment

        result = await client.resolve(case_number, options)
        case_url = client.get_case_url(result["case"]["ixBug"])
        status_msg = f' as "{status}"' if status else ""
        return f"Case {result['case']['ixBug']} resolved{status_msg}.\nLink: {case_url}"
