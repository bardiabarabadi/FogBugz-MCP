import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";
import type { FogBugzEvent } from "../types.js";

const EVENT_TYPE_NAMES: Record<number, string> = {
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
};

function formatEvent(event: FogBugzEvent, baseUrl: string): string {
  const eventType = EVENT_TYPE_NAMES[event.evt] ?? `Event ${event.evt}`;
  const date = event.dt
    ? new Date(event.dt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const lines: string[] = [
    `### ${eventType} by ${event.sPerson} — ${date}`,
    event.sVerb ? `_${event.sVerb}_` : "",
  ];

  if (event.sChanges) {
    lines.push(`**Changes:** ${event.sChanges}`);
  }

  const text = event.s?.trim();
  if (text) {
    lines.push("", text);
  }

  if (event.rgAttachments?.length) {
    lines.push("", "**Attachments:**");
    for (const att of event.rgAttachments) {
      const cleanUrl = att.sURL.replace(/&amp;/g, "&");
      lines.push(`- ${att.sFileName}: ${baseUrl}/${cleanUrl}`);
    }
  }

  return lines.filter((l) => l !== "").join("\n");
}

export function registerGetCaseComments(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "get_case_comments",
    "Get all comments and events for a FogBugz case, including the full text of each comment, who made it, when, what changed, and any attachments.",
    {
      case_number: z.number().describe("The FogBugz case number"),
    },
    { readOnlyHint: true },
    async ({ case_number }) => {
      const data = await client.search(
        String(case_number),
        ["sTitle", "events"],
        1,
      );
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

      const events = c.events ?? [];
      if (events.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Case ${case_number} (${c.sTitle}) has no events.`,
            },
          ],
        };
      }

      const header = `# Comments for Case ${c.ixBug}: ${c.sTitle ?? ""}\nLink: ${caseUrl}\n${events.length} event(s)\n`;
      const body = events
        .map((e) => formatEvent(e, baseUrl))
        .join("\n\n---\n\n");

      return { content: [{ type: "text", text: header + "\n" + body }] };
    },
  );
}
