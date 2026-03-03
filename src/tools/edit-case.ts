import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";

export function registerEditCase(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "edit_case",
    "Edit fields on a FogBugz case: title, project, area, milestone, priority, category, tags, kanban column, parent case, due date, and/or add a comment.",
    {
      case_number: z.number().describe("The FogBugz case number to edit"),
      title: z.string().optional().describe("New title for the case"),
      project: z.string().optional().describe("Project name to move the case to"),
      area: z.string().optional().describe("Area name"),
      milestone: z.string().optional().describe("Milestone name"),
      priority: z.string().optional().describe("Priority name (e.g. 'Must Fix', 'Fix If Time')"),
      category: z.string().optional().describe("Category name (e.g. 'Bug', 'Feature')"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags to set on the case (replaces all existing tags)"),
      kanban_column: z.string().optional().describe("Kanban column name"),
      parent_case: z.number().optional().describe("Parent case number"),
      due_date: z.string().optional().describe("Due date in ISO 8601 format (e.g. '2025-12-31T00:00:00Z')"),
      comment: z.string().optional().describe("Comment to add to the case"),
    },
    { destructiveHint: true },
    async (params) => {
      const fields: Record<string, unknown> = {};

      if (params.title !== undefined) fields.sTitle = params.title;
      if (params.project !== undefined) fields.sProject = params.project;
      if (params.area !== undefined) fields.sArea = params.area;
      if (params.milestone !== undefined) fields.sFixFor = params.milestone;
      if (params.priority !== undefined) fields.sPriority = params.priority;
      if (params.category !== undefined) fields.sCategory = params.category;
      if (params.tags !== undefined) fields.sTags = params.tags.join(",");
      if (params.kanban_column !== undefined)
        fields.sKanbanColumn = params.kanban_column;
      if (params.parent_case !== undefined)
        fields.ixBugParent = params.parent_case;
      if (params.due_date !== undefined) fields.dtDue = params.due_date;
      if (params.comment !== undefined) fields.sEvent = params.comment;

      const result = await client.edit(params.case_number, fields);
      const caseUrl = client.getCaseUrl(result.case.ixBug);

      const changedFields = Object.keys(fields)
        .filter((k) => k !== "sEvent")
        .join(", ");
      const summary = changedFields
        ? `Updated fields: ${changedFields}`
        : "Added comment";

      return {
        content: [
          {
            type: "text",
            text: `Case ${result.case.ixBug} edited successfully.\n${summary}\nLink: ${caseUrl}`,
          },
        ],
      };
    },
  );
}
