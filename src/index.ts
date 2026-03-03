#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FogBugzClient } from "./fogbugz-client.js";
import { registerSearchCases } from "./tools/search-cases.js";
import { registerGetCase } from "./tools/get-case.js";
import { registerGetCaseComments } from "./tools/get-case-comments.js";
import { registerListPeople } from "./tools/list-people.js";
import { registerEditCase } from "./tools/edit-case.js";
import { registerAssignCase } from "./tools/assign-case.js";
import { registerResolveCase } from "./tools/resolve-case.js";
import { registerCloseCase } from "./tools/close-case.js";
import { registerReopenCase } from "./tools/reopen-case.js";

const FOGBUGZ_URL = process.env.FOGBUGZ_URL;
const FOGBUGZ_TOKEN = process.env.FOGBUGZ_TOKEN;

if (!FOGBUGZ_URL || !FOGBUGZ_TOKEN) {
  console.error(
    "Error: FOGBUGZ_URL and FOGBUGZ_TOKEN environment variables are required.",
  );
  console.error("  FOGBUGZ_URL   = your FogBugz instance URL (e.g. https://mycompany.fogbugz.com)");
  console.error("  FOGBUGZ_TOKEN = your FogBugz API token");
  process.exit(1);
}

const client = new FogBugzClient(FOGBUGZ_URL, FOGBUGZ_TOKEN);

const server = new McpServer({
  name: "manuscript-mcp",
  version: "1.0.0",
});

registerSearchCases(server, client);
registerGetCase(server, client);
registerGetCaseComments(server, client);
registerListPeople(server, client);
registerEditCase(server, client);
registerAssignCase(server, client);
registerResolveCase(server, client);
registerCloseCase(server, client);
registerReopenCase(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
