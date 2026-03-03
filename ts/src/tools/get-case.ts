import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";
import type { FogBugzCase } from "../types.js";

const DETAIL_COLS = [
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
];

function formatDate(dt?: string): string {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dt;
  }
}

function formatCaseDetail(c: FogBugzCase, caseUrl: string, baseUrl: string): string {
  const status = c.fOpen ? "Open" : "Closed";
  const tags = c.tags?.length ? c.tags.join(", ") : "none";
  const children = c.ixBugChildren?.length
    ? c.ixBugChildren.map((id) => `${id} (${baseUrl}/f/cases/${id})`).join(", ")
    : "none";
  const related = c.ixRelatedBugs?.length
    ? c.ixRelatedBugs.map((id) => `${id} (${baseUrl}/f/cases/${id})`).join(", ")
    : "none";
  const parent = c.ixBugParent
    ? `${c.ixBugParent} (${baseUrl}/f/cases/${c.ixBugParent})`
    : "none";

  return [
    `# Case ${c.ixBug}: ${c.sTitle ?? "(no title)"}`,
    `Link: ${caseUrl}`,
    "",
    `**Status:** ${c.sStatus ?? status}`,
    `**Priority:** ${c.sPriority ?? "—"}`,
    `**Assigned To:** ${c.sPersonAssignedTo ?? "—"} (${c.sEmailAssignedTo ?? "—"})`,
    `**Project:** ${c.sProject ?? "—"}`,
    `**Area:** ${c.sArea ?? "—"}`,
    `**Category:** ${c.sCategory ?? "—"}`,
    `**Milestone:** ${c.sFixFor ?? "—"}`,
    `**Kanban Column:** ${c.sKanbanColumn ?? "—"}`,
    `**Tags:** ${tags}`,
    `**Story Points:** ${c.dblStoryPts ?? "—"}`,
    "",
    `**Opened:** ${formatDate(c.dtOpened)}`,
    `**Last Updated:** ${formatDate(c.dtLastUpdated)}`,
    `**Resolved:** ${formatDate(c.dtResolved)}`,
    `**Closed:** ${formatDate(c.dtClosed)}`,
    `**Due:** ${formatDate(c.dtDue)}`,
    "",
    `**Original Estimate:** ${c.hrsOrigEst ?? 0}h | **Current Estimate:** ${c.hrsCurrEst ?? 0}h | **Elapsed:** ${c.hrsElapsed ?? 0}h`,
    "",
    `**Parent Case:** ${parent}`,
    `**Child Cases:** ${children}`,
    `**Related Cases:** ${related}`,
    "",
    c.sLatestTextSummary
      ? `**Latest Comment:** ${c.sLatestTextSummary}`
      : "",
  ].join("\n");
}

export function registerGetCase(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "get_case",
    "Get detailed information about a specific FogBugz case including title, status, project, milestone, priority, tags, kanban column, parent/child relationships, dates, and more.",
    {
      case_number: z.number().describe("The FogBugz case number"),
    },
    { readOnlyHint: true },
    async ({ case_number }) => {
      const data = await client.search(String(case_number), DETAIL_COLS, 1);
      if (data.cases.length === 0) {
        return {
          content: [
            { type: "text", text: `Case ${case_number} not found.` },
          ],
        };
      }

      const c = data.cases[0];
      const caseUrl = client.getCaseUrl(c.ixBug);
      const baseUrl = caseUrl.replace(`/f/cases/${c.ixBug}`, "");
      const text = formatCaseDetail(c, caseUrl, baseUrl);

      return { content: [{ type: "text", text }] };
    },
  );
}
