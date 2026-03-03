import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";

export function registerCloseCase(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "close_case",
    "Close a resolved FogBugz case. The case must already be resolved before it can be closed.",
    {
      case_number: z.number().describe("The FogBugz case number"),
      comment: z
        .string()
        .optional()
        .describe("Optional comment to add when closing"),
    },
    { destructiveHint: true },
    async ({ case_number, comment }) => {
      const result = await client.close(case_number, comment);
      const caseUrl = client.getCaseUrl(result.case.ixBug);

      return {
        content: [
          {
            type: "text",
            text: `Case ${result.case.ixBug} closed.\nLink: ${caseUrl}`,
          },
        ],
      };
    },
  );
}
