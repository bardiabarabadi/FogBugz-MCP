import { describe, it, expect, vi, beforeEach } from "vitest";
import { FogBugzClient, FogBugzApiError } from "../src/fogbugz-client.js";

function mockFetch(data: unknown, errors: unknown[] = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data,
      errors,
      warnings: [],
      meta: { jsdbInvalidator: "x", clientVersionAllowed: { min: 5, max: 5 } },
      errorCode: errors.length ? 400 : null,
      maxCacheAge: null,
    }),
  });
}

function mockFetchHttpError(status: number, statusText: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
  });
}

describe("FogBugzClient", () => {
  let client: FogBugzClient;

  beforeEach(() => {
    client = new FogBugzClient("https://test.fogbugz.com", "test-token");
  });

  describe("constructor", () => {
    it("strips trailing slashes from URL", () => {
      const c = new FogBugzClient("https://test.fogbugz.com///", "tok");
      expect(c.getCaseUrl(123)).toBe("https://test.fogbugz.com/f/cases/123");
    });
  });

  describe("getCaseUrl", () => {
    it("builds correct case URL", () => {
      expect(client.getCaseUrl(42)).toBe(
        "https://test.fogbugz.com/f/cases/42",
      );
    });
  });

  describe("search", () => {
    it("sends correct request and returns data", async () => {
      const searchData = {
        count: 1,
        totalHits: 1,
        cases: [{ ixBug: 100, sTitle: "Test Case" }],
      };
      const fetchMock = mockFetch(searchData);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.search("test", ["sTitle"], 10);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://test.fogbugz.com/api/search");
      const body = JSON.parse(options.body);
      expect(body.token).toBe("test-token");
      expect(body.q).toBe("test");
      expect(body.cols).toEqual(["sTitle"]);
      expect(body.max).toBe(10);
      expect(result).toEqual(searchData);

      vi.unstubAllGlobals();
    });

    it("omits max when not provided", async () => {
      const fetchMock = mockFetch({ count: 0, totalHits: 0, cases: [] });
      vi.stubGlobal("fetch", fetchMock);

      await client.search("q", ["sTitle"]);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.max).toBeUndefined();

      vi.unstubAllGlobals();
    });
  });

  describe("newCase", () => {
    it("sends fields to the new endpoint", async () => {
      const caseData = { case: { ixBug: 999, operations: ["edit"] } };
      const fetchMock = mockFetch(caseData);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.newCase({ sTitle: "Brand new", sProject: "Main" });
      const [url, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(url).toBe("https://test.fogbugz.com/api/new");
      expect(body.sTitle).toBe("Brand new");
      expect(body.sProject).toBe("Main");
      expect(body.token).toBe("test-token");
      expect(result.case.ixBug).toBe(999);

      vi.unstubAllGlobals();
    });
  });

  describe("edit", () => {
    it("sends ixBug and fields", async () => {
      const caseData = { case: { ixBug: 5, operations: ["edit"] } };
      const fetchMock = mockFetch(caseData);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.edit(5, { sTitle: "New Title" });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);

      expect(body.ixBug).toBe(5);
      expect(body.sTitle).toBe("New Title");
      expect(result.case.ixBug).toBe(5);

      vi.unstubAllGlobals();
    });
  });

  describe("assign", () => {
    it("sends assignee and optional comment", async () => {
      const caseData = { case: { ixBug: 10, operations: ["edit"] } };
      const fetchMock = mockFetch(caseData);
      vi.stubGlobal("fetch", fetchMock);

      await client.assign(10, "Alice", "Please review");
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);

      expect(body.ixBug).toBe(10);
      expect(body.sPersonAssignedTo).toBe("Alice");
      expect(body.sEvent).toBe("Please review");

      vi.unstubAllGlobals();
    });

    it("omits sEvent when not provided", async () => {
      const fetchMock = mockFetch({ case: { ixBug: 10, operations: [] } });
      vi.stubGlobal("fetch", fetchMock);

      await client.assign(10, "Bob");
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.sEvent).toBeUndefined();

      vi.unstubAllGlobals();
    });
  });

  describe("resolve", () => {
    it("sends resolve with status and comment", async () => {
      const fetchMock = mockFetch({ case: { ixBug: 7, operations: [] } });
      vi.stubGlobal("fetch", fetchMock);

      await client.resolve(7, { sStatus: "Fixed", sEvent: "Done" });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);

      expect(body.ixBug).toBe(7);
      expect(body.sStatus).toBe("Fixed");
      expect(body.sEvent).toBe("Done");

      vi.unstubAllGlobals();
    });
  });

  describe("close", () => {
    it("sends close request", async () => {
      const fetchMock = mockFetch({ case: { ixBug: 3, operations: [] } });
      vi.stubGlobal("fetch", fetchMock);

      await client.close(3, "Closing now");
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/close");
      expect(JSON.parse(opts.body).sEvent).toBe("Closing now");

      vi.unstubAllGlobals();
    });
  });

  describe("reopen", () => {
    it("sends reopen request", async () => {
      const fetchMock = mockFetch({ case: { ixBug: 3, operations: [] } });
      vi.stubGlobal("fetch", fetchMock);

      await client.reopen(3);
      expect(fetchMock.mock.calls[0][0]).toContain("/api/reopen");

      vi.unstubAllGlobals();
    });
  });

  describe("reactivate", () => {
    it("sends reactivate request", async () => {
      const fetchMock = mockFetch({ case: { ixBug: 3, operations: [] } });
      vi.stubGlobal("fetch", fetchMock);

      await client.reactivate(3, "Reactivating");
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/reactivate");
      expect(JSON.parse(opts.body).sEvent).toBe("Reactivating");

      vi.unstubAllGlobals();
    });
  });

  describe("listPeople", () => {
    it("returns people list", async () => {
      const peopleData = {
        people: [
          { ixPerson: 1, sFullName: "Alice", sEmail: "alice@test.com" },
        ],
      };
      const fetchMock = mockFetch(peopleData);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.listPeople({ fIncludeActive: 1 });
      expect(result.people).toHaveLength(1);
      expect(result.people[0].sFullName).toBe("Alice");

      vi.unstubAllGlobals();
    });
  });

  describe("viewPerson", () => {
    it("looks up by email", async () => {
      const fetchMock = mockFetch({
        people: [{ ixPerson: 2, sFullName: "Bob" }],
      });
      vi.stubGlobal("fetch", fetchMock);

      await client.viewPerson({ sEmail: "bob@test.com" });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.sEmail).toBe("bob@test.com");

      vi.unstubAllGlobals();
    });
  });

  describe("list methods", () => {
    it("listProjects calls correct endpoint", async () => {
      const fetchMock = mockFetch({ projects: [] });
      vi.stubGlobal("fetch", fetchMock);
      await client.listProjects();
      expect(fetchMock.mock.calls[0][0]).toContain("/api/listProjects");
      vi.unstubAllGlobals();
    });

    it("listFixFors passes ixProject", async () => {
      const fetchMock = mockFetch({ fixfors: [] });
      vi.stubGlobal("fetch", fetchMock);
      await client.listFixFors(5);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.ixProject).toBe(5);
      vi.unstubAllGlobals();
    });

    it("listKanbanColumns calls correct endpoint", async () => {
      const fetchMock = mockFetch({
        kanbancolumns: { kanbancolumn: [] },
      });
      vi.stubGlobal("fetch", fetchMock);
      await client.listKanbanColumns();
      expect(fetchMock.mock.calls[0][0]).toContain("/api/listKanbanColumns");
      vi.unstubAllGlobals();
    });

    it("listCategories calls correct endpoint", async () => {
      const fetchMock = mockFetch({ categories: [] });
      vi.stubGlobal("fetch", fetchMock);
      await client.listCategories();
      expect(fetchMock.mock.calls[0][0]).toContain("/api/listCategories");
      vi.unstubAllGlobals();
    });

    it("listStatuses calls correct endpoint", async () => {
      const fetchMock = mockFetch({ statuses: [] });
      vi.stubGlobal("fetch", fetchMock);
      await client.listStatuses();
      expect(fetchMock.mock.calls[0][0]).toContain("/api/listStatuses");
      vi.unstubAllGlobals();
    });

    it("listPriorities calls correct endpoint", async () => {
      const fetchMock = mockFetch({ priorities: [] });
      vi.stubGlobal("fetch", fetchMock);
      await client.listPriorities();
      expect(fetchMock.mock.calls[0][0]).toContain("/api/listPriorities");
      vi.unstubAllGlobals();
    });
  });

  describe("error handling", () => {
    it("throws FogBugzApiError on API error response", async () => {
      const fetchMock = mockFetch(
        {},
        [{ message: "Error 3: Not logged in", detail: null, code: "3" }],
      );
      vi.stubGlobal("fetch", fetchMock);

      await expect(client.search("test", ["sTitle"])).rejects.toThrow(
        FogBugzApiError,
      );
      await expect(client.search("test", ["sTitle"])).rejects.toThrow(
        "Not logged in",
      );

      vi.unstubAllGlobals();
    });

    it("throws FogBugzApiError on HTTP error", async () => {
      const fetchMock = mockFetchHttpError(500, "Internal Server Error");
      vi.stubGlobal("fetch", fetchMock);

      await expect(client.search("test", ["sTitle"])).rejects.toThrow(
        FogBugzApiError,
      );
      await expect(client.search("test", ["sTitle"])).rejects.toThrow(
        "HTTP 500",
      );

      vi.unstubAllGlobals();
    });
  });
});
