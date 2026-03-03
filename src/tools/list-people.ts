import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FogBugzClient } from "../fogbugz-client.js";
import type { FogBugzPerson } from "../types.js";

function formatPerson(p: FogBugzPerson): string {
  const role = p.fAdministrator ? "Admin" : p.fCommunity ? "Community" : p.fVirtual ? "Virtual" : "Normal";
  const status = p.fDeleted ? " (inactive)" : "";
  return `- **${p.sFullName}**${status} (ID: ${p.ixPerson}) — ${p.sEmail} [${role}]`;
}

export function registerListPeople(
  server: McpServer,
  client: FogBugzClient,
) {
  server.tool(
    "list_people",
    "List FogBugz users. Optionally filter by name or email substring and include inactive users.",
    {
      search: z
        .string()
        .optional()
        .describe("Filter by name or email (case-insensitive substring match)"),
      include_inactive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include inactive/deleted users"),
    },
    { readOnlyHint: true },
    async ({ search, include_inactive }) => {
      const data = await client.listPeople({
        fIncludeActive: 1,
        fIncludeNormal: 1,
        fIncludeDeleted: include_inactive ? 1 : 0,
        fIncludeCommunity: 1,
        fIncludeVirtual: 0,
      });

      let people = data.people ?? [];

      if (search) {
        const needle = search.toLowerCase();
        people = people.filter(
          (p) =>
            p.sFullName.toLowerCase().includes(needle) ||
            p.sEmail.toLowerCase().includes(needle),
        );
      }

      if (people.length === 0) {
        const msg = search
          ? `No users found matching "${search}".`
          : "No users found.";
        return { content: [{ type: "text", text: msg }] };
      }

      const header = `Found ${people.length} user(s):\n`;
      const body = people.map(formatPerson).join("\n");

      return { content: [{ type: "text", text: header + body }] };
    },
  );
}
