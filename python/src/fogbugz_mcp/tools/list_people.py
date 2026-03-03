from __future__ import annotations

from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient


def _format_person(p: dict) -> str:
    if p.get("fAdministrator"):
        role = "Admin"
    elif p.get("fCommunity"):
        role = "Community"
    elif p.get("fVirtual"):
        role = "Virtual"
    else:
        role = "Normal"
    status = " (inactive)" if p.get("fDeleted") else ""
    return f"- **{p.get('sFullName', '?')}**{status} (ID: {p.get('ixPerson', '?')}) — {p.get('sEmail', '?')} [{role}]"


def register_list_people(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="list_people",
        description="List FogBugz users. Optionally filter by name or email substring and include inactive users.",
        annotations={"readOnlyHint": True},
    )
    async def list_people(search: str | None = None, include_inactive: bool = False) -> str:
        """List FogBugz users with optional filters."""
        data = await client.list_people({
            "fIncludeActive": 1,
            "fIncludeNormal": 1,
            "fIncludeDeleted": 1 if include_inactive else 0,
            "fIncludeCommunity": 1,
            "fIncludeVirtual": 0,
        })

        people = data.get("people") or []

        if search:
            needle = search.lower()
            people = [
                p
                for p in people
                if needle in p.get("sFullName", "").lower()
                or needle in p.get("sEmail", "").lower()
            ]

        if not people:
            msg = f'No users found matching "{search}".' if search else "No users found."
            return msg

        header = f"Found {len(people)} user(s):\n"
        body = "\n".join(_format_person(p) for p in people)
        return header + body
