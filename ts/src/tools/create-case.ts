import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";

export function registerCreateCase(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "create_case",
    "Create a new FogBugz case. At minimum a title is required. Optionally set project, area, milestone, priority, category, tags, assignee, kanban column, parent case, due date, and an initial comment.",
    {
      title: z.string().describe("Title for the new case"),
      project: z.string().optional().describe("Project name"),
      area: z.string().optional().describe("Area name"),
      milestone: z.string().optional().describe("Milestone name"),
      priority: z.string().optional().describe("Priority name (e.g. 'Must Fix', 'Fix If Time')"),
      category: z.string().optional().describe("Category name (e.g. 'Bug', 'Feature')"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags to set on the case"),
      assigned_to: z.string().optional().describe("Full name of the person to assign the case to"),
      kanban_column: z.string().optional().describe("Kanban column name"),
      parent_case: z.number().optional().describe("Parent case number"),
      due_date: z.string().optional().describe("Due date in ISO 8601 format (e.g. '2025-12-31T00:00:00Z')"),
      comment: z.string().optional().describe("Initial comment / description for the case"),
    },
    { destructiveHint: true },
    async (params) => {
      const fields: Record<string, unknown> = {
        sTitle: params.title,
      };

      if (params.project !== undefined) fields.sProject = params.project;
      if (params.area !== undefined) fields.sArea = params.area;
      if (params.milestone !== undefined) fields.sFixFor = params.milestone;
      if (params.priority !== undefined) fields.sPriority = params.priority;
      if (params.category !== undefined) fields.sCategory = params.category;
      if (params.tags !== undefined) fields.sTags = params.tags.join(",");
      if (params.assigned_to !== undefined)
        fields.sPersonAssignedTo = params.assigned_to;
      if (params.kanban_column !== undefined)
        fields.sKanbanColumn = params.kanban_column;
      if (params.parent_case !== undefined)
        fields.ixBugParent = params.parent_case;
      if (params.due_date !== undefined) fields.dtDue = params.due_date;
      if (params.comment !== undefined) fields.sEvent = params.comment;

      const result = await client.newCase(fields);
      const caseUrl = client.getCaseUrl(result.case.ixBug);

      return {
        content: [
          {
            type: "text",
            text: `Case ${result.case.ixBug} created successfully.\nTitle: ${params.title}\nLink: ${caseUrl}`,
          },
        ],
      };
    },
  );
}
