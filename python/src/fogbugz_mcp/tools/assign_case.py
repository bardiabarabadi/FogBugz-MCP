from __future__ import annotations

from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient


def register_assign_case(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="assign_case",
        description="Reassign a FogBugz case to a different person.",
        annotations={"destructiveHint": True},
    )
    async def assign_case(case_number: int, assigned_to: str, comment: str | None = None) -> str:
        """Reassign a FogBugz case to a different person."""
        result = await client.assign(case_number, assigned_to, comment)
        case_url = client.get_case_url(result["case"]["ixBug"])
        return f'Case {result["case"]["ixBug"]} assigned to "{assigned_to}".\nLink: {case_url}'
