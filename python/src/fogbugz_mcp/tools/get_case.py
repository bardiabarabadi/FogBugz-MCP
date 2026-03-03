from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient

DETAIL_COLS = [
    "ixBug",
    "sTitle",
    "sProject",
    "sArea",
    "sFixFor",
    "sPriority",
    "sCategory",
    "sPersonAssignedTo",
    "sEmailAssignedTo",
    "sStatus",
    "sKanbanColumn",
    "tags",
    "fOpen",
    "ixBugParent",
    "ixBugChildren",
    "sLatestTextSummary",
    "dtOpened",
    "dtResolved",
    "dtClosed",
    "dtLastUpdated",
    "dtDue",
    "dblStoryPts",
    "ixRelatedBugs",
    "hrsOrigEst",
    "hrsCurrEst",
    "hrsElapsed",
]


def _format_date(dt: str | None) -> str:
    if not dt:
        return "—"
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00")).strftime(
            "%b %d, %Y, %I:%M %p"
        )
    except (ValueError, AttributeError):
        return dt


def _format_case_detail(c: dict, case_url: str, base_url: str) -> str:
    status = "Open" if c.get("fOpen") else "Closed"
    tags = ", ".join(c["tags"]) if c.get("tags") else "none"

    children = c.get("ixBugChildren") or []
    children_str = (
        ", ".join(f"{cid} ({base_url}/f/cases/{cid})" for cid in children)
        if children
        else "none"
    )

    related = c.get("ixRelatedBugs") or []
    related_str = (
        ", ".join(f"{rid} ({base_url}/f/cases/{rid})" for rid in related)
        if related
        else "none"
    )

    parent = c.get("ixBugParent")
    parent_str = f"{parent} ({base_url}/f/cases/{parent})" if parent else "none"

    lines = [
        f'# Case {c["ixBug"]}: {c.get("sTitle") or "(no title)"}',
        f"Link: {case_url}",
        "",
        f'**Status:** {c.get("sStatus") or status}',
        f'**Priority:** {c.get("sPriority") or "—"}',
        f'**Assigned To:** {c.get("sPersonAssignedTo") or "—"} ({c.get("sEmailAssignedTo") or "—"})',
        f'**Project:** {c.get("sProject") or "—"}',
        f'**Area:** {c.get("sArea") or "—"}',
        f'**Category:** {c.get("sCategory") or "—"}',
        f'**Milestone:** {c.get("sFixFor") or "—"}',
        f'**Kanban Column:** {c.get("sKanbanColumn") or "—"}',
        f"**Tags:** {tags}",
        f'**Story Points:** {c.get("dblStoryPts") or "—"}',
        "",
        f'**Opened:** {_format_date(c.get("dtOpened"))}',
        f'**Last Updated:** {_format_date(c.get("dtLastUpdated"))}',
        f'**Resolved:** {_format_date(c.get("dtResolved"))}',
        f'**Closed:** {_format_date(c.get("dtClosed"))}',
        f'**Due:** {_format_date(c.get("dtDue"))}',
        "",
        f'**Original Estimate:** {c.get("hrsOrigEst") or 0}h | **Current Estimate:** {c.get("hrsCurrEst") or 0}h | **Elapsed:** {c.get("hrsElapsed") or 0}h',
        "",
        f"**Parent Case:** {parent_str}",
        f"**Child Cases:** {children_str}",
        f"**Related Cases:** {related_str}",
        "",
    ]

    if c.get("sLatestTextSummary"):
        lines.append(f'**Latest Comment:** {c["sLatestTextSummary"]}')
    else:
        lines.append("")

    return "\n".join(lines)


def register_get_case(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="get_case",
        description=(
            "Get detailed information about a specific FogBugz case including title, "
            "status, project, milestone, priority, tags, kanban column, parent/child "
            "relationships, dates, and more."
        ),
        annotations={"readOnlyHint": True},
    )
    async def get_case(case_number: int) -> str:
        """Get detailed information about a specific FogBugz case."""
        data = await client.search(str(case_number), DETAIL_COLS, 1)
        cases = data.get("cases") or []
        if not cases:
            return f"Case {case_number} not found."

        c = cases[0]
        case_url = client.get_case_url(c["ixBug"])
        base_url = case_url.replace(f'/f/cases/{c["ixBug"]}', "")
        return _format_case_detail(c, case_url, base_url)
