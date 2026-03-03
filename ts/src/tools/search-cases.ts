import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";
import type { FogBugzCase } from "../types.js";

const SEARCH_COLS = [
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
];

function formatCase(c: FogBugzCase, caseUrl: string): string {
  const status = c.fOpen ? "Open" : "Closed";
  const tags = c.tags?.length ? c.tags.join(", ") : "none";
  return [
    `**Case ${c.ixBug}: ${c.sTitle ?? "(no title)"}**`,
    `  Link: ${caseUrl}`,
    `  Status: ${c.sStatus ?? status} | Priority: ${c.sPriority ?? "—"} | Assigned to: ${c.sPersonAssignedTo ?? "—"}`,
    `  Project: ${c.sProject ?? "—"} | Milestone: ${c.sFixFor ?? "—"} | Kanban: ${c.sKanbanColumn ?? "—"}`,
    `  Tags: ${tags}`,
    c.sLatestTextSummary
      ? `  Latest: ${c.sLatestTextSummary}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function registerSearchCases(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "search_cases",
    "Search FogBugz cases. The query syntax mirrors the FogBugz search box: free text, case numbers (e.g. '123' or '12,25,556'), or structured filters like 'project:Inbox assignedTo:Kevin status:active'.",
    {
      q: z.string().describe("Search query (same syntax as FogBugz search box)"),
      max: z.number().optional().default(50).describe("Maximum results to return (default 50)"),
    },
    { readOnlyHint: true },
    async ({ q, max }) => {
      const data = await client.search(q, SEARCH_COLS, max);
      if (data.cases.length === 0) {
        return {
          content: [
            { type: "text", text: `No cases found for query: "${q}"` },
          ],
        };
      }

      const header = `Found ${data.totalHits} case(s)${data.totalHits > data.cases.length ? ` (showing first ${data.cases.length})` : ""}:\n`;
      const body = data.cases
        .map((c) => formatCase(c, client.getCaseUrl(c.ixBug)))
        .join("\n\n");

      return { content: [{ type: "text", text: header + body }] };
    },
  );
}
