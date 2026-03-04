from __future__ import annotations

from typing import TYPE_CHECKING

from mcp.server.fastmcp import FastMCP

if TYPE_CHECKING:
    from ..fogbugz_client import FogBugzClient


def register_create_case(mcp: FastMCP, client: FogBugzClient) -> None:
    @mcp.tool(
        name="create_case",
        description=(
            "Create a new FogBugz case. At minimum a title is required. Optionally set "
            "project, area, milestone, priority, category, tags, assignee, kanban column, "
            "parent case, due date, and an initial comment."
        ),
        annotations={"destructiveHint": True},
    )
    async def create_case(
        title: str,
        project: str | None = None,
        area: str | None = None,
        milestone: str | None = None,
        priority: str | None = None,
        category: str | None = None,
        tags: list[str] | None = None,
        assigned_to: str | None = None,
        kanban_column: str | None = None,
        parent_case: int | None = None,
        due_date: str | None = None,
        comment: str | None = None,
    ) -> str:
        """Create a new FogBugz case."""
        fields: dict = {"sTitle": title}
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
        if assigned_to is not None:
            fields["sPersonAssignedTo"] = assigned_to
        if kanban_column is not None:
            fields["sKanbanColumn"] = kanban_column
        if parent_case is not None:
            fields["ixBugParent"] = parent_case
        if due_date is not None:
            fields["dtDue"] = due_date
        if comment is not None:
            fields["sEvent"] = comment

        result = await client.new_case(fields)
        case_url = client.get_case_url(result["case"]["ixBug"])

        return f"Case {result['case']['ixBug']} created successfully.\nTitle: {title}\nLink: {case_url}"
