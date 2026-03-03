import type {
  FogBugzResponse,
  SearchData,
  CaseActionData,
  ListPeopleData,
  ViewPersonData,
  ListProjectsData,
  ListFixForsData,
  ListKanbanColumnsData,
  ListCategoriesData,
  ListStatusesData,
  ListPrioritiesData,
} from "./types.js";

export class FogBugzApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "FogBugzApiError";
  }
}

export class FogBugzClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
  }

  private async request<T>(
    command: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/${command}`;
    const body = { token: this.token, ...params };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new FogBugzApiError(
        "HTTP_ERROR",
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as FogBugzResponse<T>;

    if (json.errors && json.errors.length > 0) {
      const err = json.errors[0];
      throw new FogBugzApiError(err.code, err.message);
    }

    return json.data;
  }

  async search(
    q: string,
    cols: string[],
    max?: number,
  ): Promise<SearchData> {
    return this.request<SearchData>("search", {
      q,
      cols,
      ...(max !== undefined ? { max } : {}),
    });
  }

  async edit(
    ixBug: number,
    fields: Record<string, unknown>,
  ): Promise<CaseActionData> {
    return this.request<CaseActionData>("edit", { ixBug, ...fields });
  }

  async assign(
    ixBug: number,
    assignee: string,
    sEvent?: string,
  ): Promise<CaseActionData> {
    return this.request<CaseActionData>("assign", {
      ixBug,
      sPersonAssignedTo: assignee,
      ...(sEvent ? { sEvent } : {}),
    });
  }

  async resolve(
    ixBug: number,
    options?: { ixStatus?: number; sStatus?: string; sEvent?: string },
  ): Promise<CaseActionData> {
    return this.request<CaseActionData>("resolve", {
      ixBug,
      ...options,
    });
  }

  async close(
    ixBug: number,
    sEvent?: string,
  ): Promise<CaseActionData> {
    return this.request<CaseActionData>("close", {
      ixBug,
      ...(sEvent ? { sEvent } : {}),
    });
  }

  async reopen(
    ixBug: number,
    sEvent?: string,
  ): Promise<CaseActionData> {
    return this.request<CaseActionData>("reopen", {
      ixBug,
      ...(sEvent ? { sEvent } : {}),
    });
  }

  async reactivate(
    ixBug: number,
    sEvent?: string,
  ): Promise<CaseActionData> {
    return this.request<CaseActionData>("reactivate", {
      ixBug,
      ...(sEvent ? { sEvent } : {}),
    });
  }

  async listPeople(options?: {
    fIncludeActive?: number;
    fIncludeNormal?: number;
    fIncludeDeleted?: number;
    fIncludeCommunity?: number;
    fIncludeVirtual?: number;
  }): Promise<ListPeopleData> {
    return this.request<ListPeopleData>("listPeople", options ?? {});
  }

  async viewPerson(lookup?: {
    sEmail?: string;
    sFullname?: string;
  }): Promise<ViewPersonData> {
    return this.request<ViewPersonData>("viewPerson", lookup ?? {});
  }

  async listProjects(): Promise<ListProjectsData> {
    return this.request<ListProjectsData>("listProjects");
  }

  async listFixFors(ixProject?: number): Promise<ListFixForsData> {
    return this.request<ListFixForsData>("listFixFors", {
      ...(ixProject !== undefined ? { ixProject } : {}),
    });
  }

  async listKanbanColumns(
    ixPlanner?: number,
  ): Promise<ListKanbanColumnsData> {
    return this.request<ListKanbanColumnsData>("listKanbanColumns", {
      ...(ixPlanner !== undefined ? { ixPlanner } : {}),
    });
  }

  async listCategories(): Promise<ListCategoriesData> {
    return this.request<ListCategoriesData>("listCategories");
  }

  async listStatuses(): Promise<ListStatusesData> {
    return this.request<ListStatusesData>("listStatuses");
  }

  async listPriorities(): Promise<ListPrioritiesData> {
    return this.request<ListPrioritiesData>("listPriorities");
  }

  getCaseUrl(ixBug: number): string {
    return `${this.baseUrl}/f/cases/${ixBug}`;
  }
}
