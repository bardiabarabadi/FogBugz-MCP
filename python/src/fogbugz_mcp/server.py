from __future__ import annotations

import os
import sys

from mcp.server.fastmcp import FastMCP

from .fogbugz_client import FogBugzClient
from .tools.assign_case import register_assign_case
from .tools.close_case import register_close_case
from .tools.edit_case import register_edit_case
from .tools.get_case import register_get_case
from .tools.get_case_comments import register_get_case_comments
from .tools.list_people import register_list_people
from .tools.reopen_case import register_reopen_case
from .tools.resolve_case import register_resolve_case
from .tools.search_cases import register_search_cases


def create_server() -> FastMCP:
    fogbugz_url = os.environ.get("FOGBUGZ_URL")
    fogbugz_token = os.environ.get("FOGBUGZ_TOKEN")

    if not fogbugz_url or not fogbugz_token:
        print(
            "Error: FOGBUGZ_URL and FOGBUGZ_TOKEN environment variables are required.",
            file=sys.stderr,
        )
        print(
            "  FOGBUGZ_URL   = your FogBugz instance URL (e.g. https://mycompany.fogbugz.com)",
            file=sys.stderr,
        )
        print("  FOGBUGZ_TOKEN = your FogBugz API token", file=sys.stderr)
        sys.exit(1)

    client = FogBugzClient(fogbugz_url, fogbugz_token)
    mcp = FastMCP("fogbugz-mcp")

    register_search_cases(mcp, client)
    register_get_case(mcp, client)
    register_get_case_comments(mcp, client)
    register_list_people(mcp, client)
    register_edit_case(mcp, client)
    register_assign_case(mcp, client)
    register_resolve_case(mcp, client)
    register_close_case(mcp, client)
    register_reopen_case(mcp, client)

    return mcp


def main() -> None:
    server = create_server()
    server.run(transport="stdio")


if __name__ == "__main__":
    main()
