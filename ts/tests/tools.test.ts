import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FogBugzClient } from "../src/fogbugz-client.js";
import { registerSearchCases } from "../src/tools/search-cases.js";
import { registerGetCase } from "../src/tools/get-case.js";
import { registerGetCaseComments } from "../src/tools/get-case-comments.js";
import { registerListPeople } from "../src/tools/list-people.js";
import { registerCreateCase } from "../src/tools/create-case.js";
import { registerEditCase } from "../src/tools/edit-case.js";
import { registerAssignCase } from "../src/tools/assign-case.js";
import { registerResolveCase } from "../src/tools/resolve-case.js";
import { registerCloseCase } from "../src/tools/close-case.js";
import { registerReopenCase } from "../src/tools/reopen-case.js";

type ToolCallback = (params: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
}>;

function captureTools() {
  const tools = new Map<string, { description: string; callback: ToolCallback }>();

  const mockServer = {
    tool: vi.fn(
      (
        name: string,
        description: string,
        _schema: unknown,
        _annotations: unknown,
        callback: ToolCallback,
      ) => {
        tools.set(name, { description, callback });
      },
    ),
  } as unknown as McpServer;

  return { mockServer, tools };
}

function createMockClient() {
  return {
    search: vi.fn(),
    newCase: vi.fn(),
    edit: vi.fn(),
    assign: vi.fn(),
    resolve: vi.fn(),
    close: vi.fn(),
    reopen: vi.fn(),
    reactivate: vi.fn(),
    listPeople: vi.fn(),
    viewPerson: vi.fn(),
    getCaseUrl: vi.fn((ixBug: number) => `https://fb.test/f/cases/${ixBug}`),
  } as unknown as FogBugzClient & {
    search: ReturnType<typeof vi.fn>;
    newCase: ReturnType<typeof vi.fn>;
    edit: ReturnType<typeof vi.fn>;
    assign: ReturnType<typeof vi.fn>;
    resolve: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    reopen: ReturnType<typeof vi.fn>;
    reactivate: ReturnType<typeof vi.fn>;
    listPeople: ReturnType<typeof vi.fn>;
  };
}

describe("search_cases tool", () => {
  it("registers and formats search results", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({
      count: 1,
      totalHits: 1,
      cases: [
        {
          ixBug: 42,
          sTitle: "Fix the bug",
          sProject: "Main",
          sFixFor: "v2.0",
          sPriority: "Must Fix",
          sPersonAssignedTo: "Alice",
          sStatus: "Active",
          sKanbanColumn: "In Progress",
          tags: ["urgent"],
          fOpen: true,
          sLatestTextSummary: "Working on it",
        },
      ],
    });

    registerSearchCases(mockServer, client);
    const tool = tools.get("search_cases")!;
    const result = await tool.callback({ q: "test", max: 50 });
    const text = result.content[0].text;

    expect(text).toContain("Case 42");
    expect(text).toContain("Fix the bug");
    expect(text).toContain("https://fb.test/f/cases/42");
    expect(text).toContain("Alice");
    expect(text).toContain("Must Fix");
    expect(text).toContain("In Progress");
    expect(text).toContain("urgent");
  });

  it("handles no results", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({
      count: 0,
      totalHits: 0,
      cases: [],
    });

    registerSearchCases(mockServer, client);
    const tool = tools.get("search_cases")!;
    const result = await tool.callback({ q: "nonexistent", max: 50 });
    expect(result.content[0].text).toContain("No cases found");
  });
});

describe("get_case tool", () => {
  it("formats detailed case info", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({
      count: 1,
      totalHits: 1,
      cases: [
        {
          ixBug: 100,
          sTitle: "Important feature",
          sProject: "Frontend",
          sArea: "UI",
          sFixFor: "Sprint 5",
          sPriority: "Must Fix",
          sCategory: "Feature",
          sPersonAssignedTo: "Bob",
          sEmailAssignedTo: "bob@test.com",
          sStatus: "Active",
          sKanbanColumn: "Doing",
          tags: ["frontend", "ui"],
          fOpen: true,
          ixBugParent: 50,
          ixBugChildren: [101, 102],
          dtOpened: "2025-01-15T10:00:00Z",
          dtLastUpdated: "2025-06-01T14:30:00Z",
          dblStoryPts: 5,
          ixRelatedBugs: [200],
        },
      ],
    });

    registerGetCase(mockServer, client);
    const tool = tools.get("get_case")!;
    const result = await tool.callback({ case_number: 100 });
    const text = result.content[0].text;

    expect(text).toContain("Case 100");
    expect(text).toContain("Important feature");
    expect(text).toContain("Frontend");
    expect(text).toContain("Sprint 5");
    expect(text).toContain("Must Fix");
    expect(text).toContain("Feature");
    expect(text).toContain("Bob");
    expect(text).toContain("Doing");
    expect(text).toContain("frontend, ui");
    expect(text).toContain("50");
    expect(text).toContain("101");
    expect(text).toContain("102");
  });

  it("handles case not found", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({ count: 0, totalHits: 0, cases: [] });

    registerGetCase(mockServer, client);
    const tool = tools.get("get_case")!;
    const result = await tool.callback({ case_number: 999 });
    expect(result.content[0].text).toContain("not found");
  });
});

describe("get_case_comments tool", () => {
  it("formats events with comments and attachments", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({
      count: 1,
      totalHits: 1,
      cases: [
        {
          ixBug: 55,
          sTitle: "Test case",
          events: [
            {
              ixBug: 55,
              ixBugEvent: 1,
              evt: 1,
              sVerb: "Opened by Alice",
              ixPerson: 1,
              sPerson: "Alice",
              ixPersonAssignedTo: 1,
              dt: "2025-03-01T10:00:00Z",
              s: "Initial report of the bug",
              fEmail: false,
              fExternal: false,
              fHTML: false,
              sChanges: "",
              evtDescription: "Opened",
              rgAttachments: [
                {
                  sFileName: "screenshot.png",
                  sURL: "default.asp?pg=pgDownload&amp;ixBugEvent=1&amp;sFileName=screenshot.png",
                },
              ],
            },
            {
              ixBug: 55,
              ixBugEvent: 2,
              evt: 2,
              sVerb: "Edited by Bob",
              ixPerson: 2,
              sPerson: "Bob",
              ixPersonAssignedTo: 1,
              dt: "2025-03-02T12:00:00Z",
              s: "Added more details",
              fEmail: false,
              fExternal: false,
              fHTML: false,
              sChanges: "Priority changed from 'Normal' to 'Must Fix'.",
              evtDescription: "Edited",
              rgAttachments: [],
            },
          ],
        },
      ],
    });

    registerGetCaseComments(mockServer, client);
    const tool = tools.get("get_case_comments")!;
    const result = await tool.callback({ case_number: 55 });
    const text = result.content[0].text;

    expect(text).toContain("Case 55");
    expect(text).toContain("2 event(s)");
    expect(text).toContain("Alice");
    expect(text).toContain("Initial report of the bug");
    expect(text).toContain("screenshot.png");
    expect(text).toContain("Bob");
    expect(text).toContain("Priority changed");
    expect(text).toContain("Added more details");
  });

  it("handles no events", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({
      count: 1,
      totalHits: 1,
      cases: [{ ixBug: 55, sTitle: "Empty case", events: [] }],
    });

    registerGetCaseComments(mockServer, client);
    const tool = tools.get("get_case_comments")!;
    const result = await tool.callback({ case_number: 55 });
    expect(result.content[0].text).toContain("no events");
  });
});

describe("list_people tool", () => {
  it("lists people and filters by search", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.listPeople.mockResolvedValue({
      people: [
        {
          ixPerson: 1,
          sFullName: "Alice Admin",
          sEmail: "alice@test.com",
          fAdministrator: true,
          fCommunity: false,
          fVirtual: false,
          fDeleted: false,
        },
        {
          ixPerson: 2,
          sFullName: "Bob Builder",
          sEmail: "bob@test.com",
          fAdministrator: false,
          fCommunity: false,
          fVirtual: false,
          fDeleted: false,
        },
      ],
    });

    registerListPeople(mockServer, client);
    const tool = tools.get("list_people")!;

    const allResult = await tool.callback({ include_inactive: false });
    expect(allResult.content[0].text).toContain("2 user(s)");
    expect(allResult.content[0].text).toContain("Alice Admin");
    expect(allResult.content[0].text).toContain("Bob Builder");

    const filtered = await tool.callback({ search: "alice", include_inactive: false });
    expect(filtered.content[0].text).toContain("1 user(s)");
    expect(filtered.content[0].text).toContain("Alice Admin");
    expect(filtered.content[0].text).not.toContain("Bob Builder");
  });
});

describe("create_case tool", () => {
  it("creates a case with all fields", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.newCase.mockResolvedValue({
      case: { ixBug: 999, operations: ["edit"] },
    });

    registerCreateCase(mockServer, client);
    const tool = tools.get("create_case")!;
    const result = await tool.callback({
      title: "New Bug Report",
      project: "Backend",
      priority: "Must Fix",
      category: "Bug",
      assigned_to: "Alice",
      tags: ["critical"],
      comment: "Found a crash",
    });

    expect(client.newCase).toHaveBeenCalledWith({
      sTitle: "New Bug Report",
      sProject: "Backend",
      sPriority: "Must Fix",
      sCategory: "Bug",
      sPersonAssignedTo: "Alice",
      sTags: "critical",
      sEvent: "Found a crash",
    });
    expect(result.content[0].text).toContain("created successfully");
    expect(result.content[0].text).toContain("999");
    expect(result.content[0].text).toContain("New Bug Report");
    expect(result.content[0].text).toContain("https://fb.test/f/cases/999");
  });

  it("creates a case with only a title", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.newCase.mockResolvedValue({
      case: { ixBug: 1000, operations: ["edit"] },
    });

    registerCreateCase(mockServer, client);
    const tool = tools.get("create_case")!;
    const result = await tool.callback({ title: "Minimal case" });

    expect(client.newCase).toHaveBeenCalledWith({ sTitle: "Minimal case" });
    expect(result.content[0].text).toContain("1000");
    expect(result.content[0].text).toContain("created successfully");
  });
});

describe("edit_case tool", () => {
  it("maps parameters and calls edit", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.edit.mockResolvedValue({
      case: { ixBug: 42, operations: ["edit"] },
    });

    registerEditCase(mockServer, client);
    const tool = tools.get("edit_case")!;
    const result = await tool.callback({
      case_number: 42,
      title: "New Title",
      tags: ["a", "b"],
      comment: "Updated",
    });

    expect(client.edit).toHaveBeenCalledWith(42, {
      sTitle: "New Title",
      sTags: "a,b",
      sEvent: "Updated",
    });
    expect(result.content[0].text).toContain("edited successfully");
  });
});

describe("assign_case tool", () => {
  it("assigns a case", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.assign.mockResolvedValue({
      case: { ixBug: 10, operations: [] },
    });

    registerAssignCase(mockServer, client);
    const tool = tools.get("assign_case")!;
    const result = await tool.callback({
      case_number: 10,
      assigned_to: "Alice",
      comment: "Your turn",
    });

    expect(client.assign).toHaveBeenCalledWith(10, "Alice", "Your turn");
    expect(result.content[0].text).toContain("assigned to");
    expect(result.content[0].text).toContain("Alice");
  });
});

describe("resolve_case tool", () => {
  it("resolves a case with status", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.resolve.mockResolvedValue({
      case: { ixBug: 7, operations: [] },
    });

    registerResolveCase(mockServer, client);
    const tool = tools.get("resolve_case")!;
    const result = await tool.callback({
      case_number: 7,
      status: "Fixed",
      comment: "All done",
    });

    expect(client.resolve).toHaveBeenCalledWith(7, {
      sStatus: "Fixed",
      sEvent: "All done",
    });
    expect(result.content[0].text).toContain("resolved");
    expect(result.content[0].text).toContain("Fixed");
  });
});

describe("close_case tool", () => {
  it("closes a case", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.close.mockResolvedValue({
      case: { ixBug: 3, operations: [] },
    });

    registerCloseCase(mockServer, client);
    const tool = tools.get("close_case")!;
    const result = await tool.callback({ case_number: 3 });

    expect(client.close).toHaveBeenCalledWith(3, undefined);
    expect(result.content[0].text).toContain("closed");
  });
});

describe("reopen_case tool", () => {
  it("reopens a closed case", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({
      count: 1,
      totalHits: 1,
      cases: [{ ixBug: 5, fOpen: false, sStatus: "Closed", operations: ["reopen"] }],
    });
    client.reopen.mockResolvedValue({
      case: { ixBug: 5, operations: ["edit"] },
    });

    registerReopenCase(mockServer, client);
    const tool = tools.get("reopen_case")!;
    const result = await tool.callback({ case_number: 5 });

    expect(client.reopen).toHaveBeenCalledWith(5, undefined);
    expect(result.content[0].text).toContain("reopened");
  });

  it("reactivates a resolved case", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({
      count: 1,
      totalHits: 1,
      cases: [{ ixBug: 6, fOpen: false, sStatus: "Resolved", operations: ["reactivate"] }],
    });
    client.reactivate.mockResolvedValue({
      case: { ixBug: 6, operations: ["edit"] },
    });

    registerReopenCase(mockServer, client);
    const tool = tools.get("reopen_case")!;
    const result = await tool.callback({ case_number: 6, comment: "Not done" });

    expect(client.reactivate).toHaveBeenCalledWith(6, "Not done");
    expect(result.content[0].text).toContain("reopened");
  });

  it("returns message if case is already open", async () => {
    const { mockServer, tools } = captureTools();
    const client = createMockClient();
    client.search.mockResolvedValue({
      count: 1,
      totalHits: 1,
      cases: [{ ixBug: 8, fOpen: true, sStatus: "Active", operations: [] }],
    });

    registerReopenCase(mockServer, client);
    const tool = tools.get("reopen_case")!;
    const result = await tool.callback({ case_number: 8 });
    expect(result.content[0].text).toContain("already open");
  });
});
