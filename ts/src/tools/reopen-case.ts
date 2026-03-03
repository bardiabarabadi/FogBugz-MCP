import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";

export function registerReopenCase(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "reopen_case",
    "Reopen a closed or resolved FogBugz case. Automatically detects whether to reopen (closed) or reactivate (resolved).",
    {
      case_number: z.number().describe("The FogBugz case number"),
      comment: z
        .string()
        .optional()
        .describe("Optional comment to add when reopening"),
    },
    { destructiveHint: true },
    async ({ case_number, comment }) => {
      const searchData = await client.search(
        String(case_number),
        ["fOpen", "sStatus"],
        1,
      );

      if (searchData.cases.length === 0) {
        return {
          content: [
            { type: "text", text: `Case ${case_number} not found.` },
          ],
        };
      }

      const c = searchData.cases[0];

      if (c.fOpen) {
        return {
          content: [
            {
              type: "text",
              text: `Case ${case_number} is already open (status: ${c.sStatus ?? "active"}).`,
            },
          ],
        };
      }

      const ops = c.operations ?? [];
      let result;

      if (ops.includes("reopen")) {
        result = await client.reopen(case_number, comment);
      } else if (ops.includes("reactivate")) {
        result = await client.reactivate(case_number, comment);
      } else {
        result = await client.reopen(case_number, comment);
      }

      const caseUrl = client.getCaseUrl(result.case.ixBug);

      return {
        content: [
          {
            type: "text",
            text: `Case ${result.case.ixBug} reopened.\nLink: ${caseUrl}`,
          },
        ],
      };
    },
  );
}
