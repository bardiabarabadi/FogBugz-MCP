from __future__ import annotations

from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient


def register_reopen_case(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="reopen_case",
        description=(
            "Reopen a closed or resolved FogBugz case. Automatically detects "
            "whether to reopen (closed) or reactivate (resolved)."
        ),
        annotations={"destructiveHint": True},
    )
    async def reopen_case(case_number: int, comment: str | None = None) -> str:
        """Reopen a closed or resolved FogBugz case."""
        search_data = await client.search(str(case_number), ["fOpen", "sStatus"], 1)
        cases = search_data.get("cases") or []

        if not cases:
            return f"Case {case_number} not found."

        c = cases[0]
        if c.get("fOpen"):
            return f"Case {case_number} is already open (status: {c.get('sStatus') or 'active'})."

        ops = c.get("operations") or []
        if "reopen" in ops:
            result = await client.reopen(case_number, comment)
        elif "reactivate" in ops:
            result = await client.reactivate(case_number, comment)
        else:
            result = await client.reopen(case_number, comment)

        case_url = client.get_case_url(result["case"]["ixBug"])
        return f"Case {result['case']['ixBug']} reopened.\nLink: {case_url}"
