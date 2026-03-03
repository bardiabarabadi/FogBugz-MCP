import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";

export function registerAssignCase(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "assign_case",
    "Reassign a FogBugz case to a different person.",
    {
      case_number: z.number().describe("The FogBugz case number"),
      assigned_to: z
        .string()
        .describe("Full name of the person to assign the case to"),
      comment: z
        .string()
        .optional()
        .describe("Optional comment to add when reassigning"),
    },
    { destructiveHint: true },
    async ({ case_number, assigned_to, comment }) => {
      const result = await client.assign(case_number, assigned_to, comment);
      const caseUrl = client.getCaseUrl(result.case.ixBug);

      return {
        content: [
          {
            type: "text",
            text: `Case ${result.case.ixBug} assigned to "${assigned_to}".\nLink: ${caseUrl}`,
          },
        ],
      };
    },
  );
}
