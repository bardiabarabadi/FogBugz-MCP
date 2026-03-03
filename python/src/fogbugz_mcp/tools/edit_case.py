from __future__ import annotations

from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient


def register_edit_case(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="edit_case",
        description=(
            "Edit fields on a FogBugz case: title, project, area, milestone, priority, "
            "category, tags, kanban column, parent case, due date, and/or add a comment."
        ),
        annotations={"destructiveHint": True},
    )
    async def edit_case(
        case_number: int,
        title: str | None = None,
        project: str | None = None,
        area: str | None = None,
        milestone: str | None = None,
        priority: str | None = None,
        category: str | None = None,
        tags: list[str] | None = None,
        kanban_column: str | None = None,
        parent_case: int | None = None,
        due_date: str | None = None,
        comment: str | None = None,
    ) -> str:
        """Edit fields on a FogBugz case."""
        fields: dict = {}
        if title is not None:
            fields["sTitle"] = title
        if project is not None:
            fields["sProject"] = project
        if area is not None:
            fields["sArea"] = area
        if milestone is not None:
            fields["sFixFor"] = milestone
        if priority is not None:
            fields["sPriority"] = priority
        if category is not None:
            fields["sCategory"] = category
        if tags is not None:
            fields["sTags"] = ",".join(tags)
        if kanban_column is not None:
            fields["sKanbanColumn"] = kanban_column
        if parent_case is not None:
            fields["ixBugParent"] = parent_case
        if due_date is not None:
            fields["dtDue"] = due_date
        if comment is not None:
            fields["sEvent"] = comment

        result = await client.edit(case_number, fields)
        case_url = client.get_case_url(result["case"]["ixBug"])

        changed = [k for k in fields if k != "sEvent"]
        summary = f"Updated fields: {', '.join(changed)}" if changed else "Added comment"

        return f"Case {result['case']['ixBug']} edited successfully.\n{summary}\nLink: {case_url}"
