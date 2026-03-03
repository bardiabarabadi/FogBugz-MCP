from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient

EVENT_TYPE_NAMES: dict[int, str] = {
    1: "Opened",
    2: "Edited",
    3: "Assigned",
    4: "Reactivated",
    5: "Reopened",
    6: "Closed",
    7: "Moved",
    8: "Unknown",
    9: "Replied",
    10: "Forwarded",
    11: "Received",
    12: "Sorted",
    13: "Not Sorted",
    14: "Resolved",
    15: "Emailed",
    16: "Release Noted",
    17: "Deleted Attachment",
}


def _format_event(event: dict, base_url: str) -> str:
    event_type = EVENT_TYPE_NAMES.get(event.get("evt", 0), f"Event {event.get('evt', '?')}")
    dt = event.get("dt")
    if dt:
        try:
            date_str = datetime.fromisoformat(dt.replace("Z", "+00:00")).strftime(
                "%b %d, %Y, %I:%M %p"
            )
        except (ValueError, AttributeError):
            date_str = dt
    else:
        date_str = "—"

    lines: list[str] = [
        f"### {event_type} by {event.get('sPerson', '?')} — {date_str}",
    ]

    if event.get("sVerb"):
        lines.append(f"_{event['sVerb']}_")

    if event.get("sChanges"):
        lines.append(f"**Changes:** {event['sChanges']}")

    text = (event.get("s") or "").strip()
    if text:
        lines.append("")
        lines.append(text)

    attachments = event.get("rgAttachments") or []
    if attachments:
        lines.append("")
        lines.append("**Attachments:**")
        for att in attachments:
            clean_url = att["sURL"].replace("&amp;", "&")
            lines.append(f"- {att['sFileName']}: {base_url}/{clean_url}")

    return "\n".join(line for line in lines if line != "" or lines.index(line) == lines.index(line))


def register_get_case_comments(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="get_case_comments",
        description=(
            "Get all comments and events for a FogBugz case, including the full text "
            "of each comment, who made it, when, what changed, and any attachments."
        ),
        annotations={"readOnlyHint": True},
    )
    async def get_case_comments(case_number: int) -> str:
        """Get all comments and events for a FogBugz case."""
        data = await client.search(str(case_number), ["sTitle", "events"], 1)
        cases = data.get("cases") or []
        if not cases:
            return f"Case {case_number} not found."

        c = cases[0]
        case_url = client.get_case_url(c["ixBug"])
        base_url = case_url.replace(f'/f/cases/{c["ixBug"]}', "")

        events = c.get("events") or []
        if not events:
            return f"Case {case_number} ({c.get('sTitle', '')}) has no events."

        header = (
            f"# Comments for Case {c['ixBug']}: {c.get('sTitle', '')}\n"
            f"Link: {case_url}\n"
            f"{len(events)} event(s)\n"
        )
        body = "\n\n---\n\n".join(_format_event(e, base_url) for e in events)
        return header + "\n" + body
