import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";

export function registerResolveCase(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "resolve_case",
    "Resolve an active FogBugz case. Optionally specify a resolution status and comment.",
    {
      case_number: z.number().describe("The FogBugz case number"),
      status: z
        .string()
        .optional()
        .describe("Resolution status name (e.g. 'Fixed', 'Won't Fix', 'Duplicate')"),
      comment: z
        .string()
        .optional()
        .describe("Optional comment to add when resolving"),
    },
    { destructiveHint: true },
    async ({ case_number, status, comment }) => {
      const options: { sStatus?: string; sEvent?: string } = {};
      if (status) options.sStatus = status;
      if (comment) options.sEvent = comment;

      const result = await client.resolve(case_number, options);
      const caseUrl = client.getCaseUrl(result.case.ixBug);

      return {
        content: [
          {
            type: "text",
            text: `Case ${result.case.ixBug} resolved${status ? ` as "${status}"` : ""}.\nLink: ${caseUrl}`,
          },
        ],
      };
    },
  );
}
