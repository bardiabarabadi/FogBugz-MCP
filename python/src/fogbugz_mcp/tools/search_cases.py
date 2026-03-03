from __future__ import annotations

from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient

SEARCH_COLS = [
    "ixBug",
    "sTitle",
    "sProject",
    "sFixFor",
    "sPriority",
    "sPersonAssignedTo",
    "sStatus",
    "sKanbanColumn",
    "tags",
    "fOpen",
    "sLatestTextSummary",
]


def _format_case(c: dict, case_url: str) -> str:
    status = "Open" if c.get("fOpen") else "Closed"
    tags = ", ".join(c["tags"]) if c.get("tags") else "none"
    lines = [
        f'**Case {c["ixBug"]}: {c.get("sTitle") or "(no title)"}**',
        f"  Link: {case_url}",
        f'  Status: {c.get("sStatus") or status} | Priority: {c.get("sPriority") or "—"} | Assigned to: {c.get("sPersonAssignedTo") or "—"}',
        f'  Project: {c.get("sProject") or "—"} | Milestone: {c.get("sFixFor") or "—"} | Kanban: {c.get("sKanbanColumn") or "—"}',
        f"  Tags: {tags}",
    ]
    if c.get("sLatestTextSummary"):
        lines.append(f'  Latest: {c["sLatestTextSummary"]}')
    return "\n".join(lines)


def register_search_cases(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="search_cases",
        description=(
            "Search FogBugz cases. The query syntax mirrors the FogBugz search box: "
            "free text, case numbers (e.g. '123' or '12,25,556'), or structured filters "
            "like 'project:Inbox assignedTo:Kevin status:active'."
        ),
        annotations={"readOnlyHint": True},
    )
    async def search_cases(q: str, max: int = 50) -> str:
        """Search FogBugz cases using FogBugz search syntax."""
        data = await client.search(q, SEARCH_COLS, max)
        cases = data.get("cases") or []
        if not cases:
            return f'No cases found for query: "{q}"'

        total = data.get("totalHits", len(cases))
        showing = f" (showing first {len(cases)})" if total > len(cases) else ""
        header = f"Found {total} case(s){showing}:\n"
        body = "\n\n".join(
            _format_case(c, client.get_case_url(c["ixBug"])) for c in cases
        )
        return header + body
