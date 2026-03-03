from __future__ import annotations

from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient


def register_close_case(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="close_case",
        description="Close a resolved FogBugz case. The case must already be resolved before it can be closed.",
        annotations={"destructiveHint": True},
    )
    async def close_case(case_number: int, comment: str | None = None) -> str:
        """Close a resolved FogBugz case."""
        result = await client.close(case_number, comment)
        case_url = client.get_case_url(result["case"]["ixBug"])
        return f"Case {result['case']['ixBug']} closed.\nLink: {case_url}"
