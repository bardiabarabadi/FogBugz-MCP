from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from fogbugz_mcp.fogbugz_client import FogBugzClient
from fogbugz_mcp.tools.assign_case import register_assign_case
from fogbugz_mcp.tools.close_case import register_close_case
from fogbugz_mcp.tools.create_case import register_create_case
from fogbugz_mcp.tools.edit_case import register_edit_case
from fogbugz_mcp.tools.get_case import register_get_case
from fogbugz_mcp.tools.get_case_comments import register_get_case_comments
from fogbugz_mcp.tools.list_people import register_list_people
from fogbugz_mcp.tools.reopen_case import register_reopen_case
from fogbugz_mcp.tools.resolve_case import register_resolve_case
from fogbugz_mcp.tools.search_cases import register_search_cases


def _make_mock_client() -> FogBugzClient:
    client = MagicMock(spec=FogBugzClient)
    client.search = AsyncMock()
    client.new_case = AsyncMock()
    client.edit = AsyncMock()
    client.assign = AsyncMock()
    client.resolve = AsyncMock()
    client.close = AsyncMock()
    client.reopen = AsyncMock()
    client.reactivate = AsyncMock()
    client.list_people = AsyncMock()
    client.get_case_url = MagicMock(side_effect=lambda ix: f"https://fb.test/f/cases/{ix}")
    return client


def _capture_tool(register_fn, client):
    """Register a tool and capture the async handler function."""
    captured = {}

    class FakeMCP:
        def tool(self, *, name, description, annotations=None):
            def decorator(fn):
                captured["name"] = name
                captured["fn"] = fn
                return fn
            return decorator

    fake_mcp = FakeMCP()
    register_fn(fake_mcp, client)
    return captured["fn"]


class TestSearchCases:
    @pytest.mark.asyncio
    async def test_formats_search_results(self):
        client = _make_mock_client()
        client.search.return_value = {
            "count": 1,
            "totalHits": 1,
            "cases": [
                {
                    "ixBug": 42,
                    "sTitle": "Fix the bug",
                    "sProject": "Main",
                    "sFixFor": "v2.0",
                    "sPriority": "Must Fix",
                    "sPersonAssignedTo": "Alice",
                    "sStatus": "Active",
                    "sKanbanColumn": "In Progress",
                    "tags": ["urgent"],
                    "fOpen": True,
                    "sLatestTextSummary": "Working on it",
                },
            ],
        }

        handler = _capture_tool(register_search_cases, client)
        text = await handler(q="test", max=50)

        assert "Case 42" in text
        assert "Fix the bug" in text
        assert "https://fb.test/f/cases/42" in text
        assert "Alice" in text
        assert "Must Fix" in text
        assert "In Progress" in text
        assert "urgent" in text

    @pytest.mark.asyncio
    async def test_handles_no_results(self):
        client = _make_mock_client()
        client.search.return_value = {"count": 0, "totalHits": 0, "cases": []}

        handler = _capture_tool(register_search_cases, client)
        text = await handler(q="nonexistent", max=50)
        assert "No cases found" in text


class TestGetCase:
    @pytest.mark.asyncio
    async def test_formats_detailed_case_info(self):
        client = _make_mock_client()
        client.search.return_value = {
            "count": 1,
            "totalHits": 1,
            "cases": [
                {
                    "ixBug": 100,
                    "sTitle": "Important feature",
                    "sProject": "Frontend",
                    "sArea": "UI",
                    "sFixFor": "Sprint 5",
                    "sPriority": "Must Fix",
                    "sCategory": "Feature",
                    "sPersonAssignedTo": "Bob",
                    "sEmailAssignedTo": "bob@test.com",
                    "sStatus": "Active",
                    "sKanbanColumn": "Doing",
                    "tags": ["frontend", "ui"],
                    "fOpen": True,
                    "ixBugParent": 50,
                    "ixBugChildren": [101, 102],
                    "dtOpened": "2025-01-15T10:00:00Z",
                    "dtLastUpdated": "2025-06-01T14:30:00Z",
                    "dblStoryPts": 5,
                    "ixRelatedBugs": [200],
                },
            ],
        }

        handler = _capture_tool(register_get_case, client)
        text = await handler(case_number=100)

        assert "Case 100" in text
        assert "Important feature" in text
        assert "Frontend" in text
        assert "Sprint 5" in text
        assert "Must Fix" in text
        assert "Feature" in text
        assert "Bob" in text
        assert "Doing" in text
        assert "frontend, ui" in text
        assert "50" in text
        assert "101" in text
        assert "102" in text

    @pytest.mark.asyncio
    async def test_handles_case_not_found(self):
        client = _make_mock_client()
        client.search.return_value = {"count": 0, "totalHits": 0, "cases": []}

        handler = _capture_tool(register_get_case, client)
        text = await handler(case_number=999)
        assert "not found" in text


class TestGetCaseComments:
    @pytest.mark.asyncio
    async def test_formats_events_with_comments_and_attachments(self):
        client = _make_mock_client()
        client.search.return_value = {
            "count": 1,
            "totalHits": 1,
            "cases": [
                {
                    "ixBug": 55,
                    "sTitle": "Test case",
                    "events": [
                        {
                            "ixBug": 55,
                            "ixBugEvent": 1,
                            "evt": 1,
                            "sVerb": "Opened by Alice",
                            "ixPerson": 1,
                            "sPerson": "Alice",
                            "ixPersonAssignedTo": 1,
                            "dt": "2025-03-01T10:00:00Z",
                            "s": "Initial report of the bug",
                            "fEmail": False,
                            "fExternal": False,
                            "fHTML": False,
                            "sChanges": "",
                            "evtDescription": "Opened",
                            "rgAttachments": [
                                {
                                    "sFileName": "screenshot.png",
                                    "sURL": "default.asp?pg=pgDownload&amp;ixBugEvent=1&amp;sFileName=screenshot.png",
                                },
                            ],
                        },
                        {
                            "ixBug": 55,
                            "ixBugEvent": 2,
                            "evt": 2,
                            "sVerb": "Edited by Bob",
                            "ixPerson": 2,
                            "sPerson": "Bob",
                            "ixPersonAssignedTo": 1,
                            "dt": "2025-03-02T12:00:00Z",
                            "s": "Added more details",
                            "fEmail": False,
                            "fExternal": False,
                            "fHTML": False,
                            "sChanges": "Priority changed from 'Normal' to 'Must Fix'.",
                            "evtDescription": "Edited",
                            "rgAttachments": [],
                        },
                    ],
                },
            ],
        }

        handler = _capture_tool(register_get_case_comments, client)
        text = await handler(case_number=55)

        assert "Case 55" in text
        assert "2 event(s)" in text
        assert "Alice" in text
        assert "Initial report of the bug" in text
        assert "screenshot.png" in text
        assert "Bob" in text
        assert "Priority changed" in text
        assert "Added more details" in text

    @pytest.mark.asyncio
    async def test_handles_no_events(self):
        client = _make_mock_client()
        client.search.return_value = {
            "count": 1,
            "totalHits": 1,
            "cases": [{"ixBug": 55, "sTitle": "Empty case", "events": []}],
        }

        handler = _capture_tool(register_get_case_comments, client)
        text = await handler(case_number=55)
        assert "no events" in text


class TestListPeople:
    @pytest.mark.asyncio
    async def test_lists_people_and_filters_by_search(self):
        client = _make_mock_client()
        client.list_people.return_value = {
            "people": [
                {
                    "ixPerson": 1,
                    "sFullName": "Alice Admin",
                    "sEmail": "alice@test.com",
                    "fAdministrator": True,
                    "fCommunity": False,
                    "fVirtual": False,
                    "fDeleted": False,
                },
                {
                    "ixPerson": 2,
                    "sFullName": "Bob Builder",
                    "sEmail": "bob@test.com",
                    "fAdministrator": False,
                    "fCommunity": False,
                    "fVirtual": False,
                    "fDeleted": False,
                },
            ],
        }

        handler = _capture_tool(register_list_people, client)

        all_result = await handler(include_inactive=False)
        assert "2 user(s)" in all_result
        assert "Alice Admin" in all_result
        assert "Bob Builder" in all_result

        filtered = await handler(search="alice", include_inactive=False)
        assert "1 user(s)" in filtered
        assert "Alice Admin" in filtered
        assert "Bob Builder" not in filtered


class TestCreateCase:
    @pytest.mark.asyncio
    async def test_creates_case_with_all_fields(self):
        client = _make_mock_client()
        client.new_case.return_value = {"case": {"ixBug": 999, "operations": ["edit"]}}

        handler = _capture_tool(register_create_case, client)
        text = await handler(
            title="New Bug Report",
            project="Backend",
            priority="Must Fix",
            category="Bug",
            assigned_to="Alice",
            tags=["critical"],
            comment="Found a crash",
        )

        client.new_case.assert_called_once_with({
            "sTitle": "New Bug Report",
            "sProject": "Backend",
            "sPriority": "Must Fix",
            "sCategory": "Bug",
            "sPersonAssignedTo": "Alice",
            "sTags": "critical",
            "sEvent": "Found a crash",
        })
        assert "created successfully" in text
        assert "999" in text
        assert "New Bug Report" in text
        assert "https://fb.test/f/cases/999" in text

    @pytest.mark.asyncio
    async def test_creates_case_with_only_title(self):
        client = _make_mock_client()
        client.new_case.return_value = {"case": {"ixBug": 1000, "operations": ["edit"]}}

        handler = _capture_tool(register_create_case, client)
        text = await handler(title="Minimal case")

        client.new_case.assert_called_once_with({"sTitle": "Minimal case"})
        assert "1000" in text
        assert "created successfully" in text


class TestEditCase:
    @pytest.mark.asyncio
    async def test_maps_parameters_and_calls_edit(self):
        client = _make_mock_client()
        client.edit.return_value = {"case": {"ixBug": 42, "operations": ["edit"]}}

        handler = _capture_tool(register_edit_case, client)
        text = await handler(case_number=42, title="New Title", tags=["a", "b"], comment="Updated")

        client.edit.assert_called_once_with(42, {
            "sTitle": "New Title",
            "sTags": "a,b",
            "sEvent": "Updated",
        })
        assert "edited successfully" in text


class TestAssignCase:
    @pytest.mark.asyncio
    async def test_assigns_a_case(self):
        client = _make_mock_client()
        client.assign.return_value = {"case": {"ixBug": 10, "operations": []}}

        handler = _capture_tool(register_assign_case, client)
        text = await handler(case_number=10, assigned_to="Alice", comment="Your turn")

        client.assign.assert_called_once_with(10, "Alice", "Your turn")
        assert "assigned to" in text
        assert "Alice" in text


class TestResolveCase:
    @pytest.mark.asyncio
    async def test_resolves_a_case_with_status(self):
        client = _make_mock_client()
        client.resolve.return_value = {"case": {"ixBug": 7, "operations": []}}

        handler = _capture_tool(register_resolve_case, client)
        text = await handler(case_number=7, status="Fixed", comment="All done")

        client.resolve.assert_called_once_with(7, {"sStatus": "Fixed", "sEvent": "All done"})
        assert "resolved" in text
        assert "Fixed" in text


class TestCloseCase:
    @pytest.mark.asyncio
    async def test_closes_a_case(self):
        client = _make_mock_client()
        client.close.return_value = {"case": {"ixBug": 3, "operations": []}}

        handler = _capture_tool(register_close_case, client)
        text = await handler(case_number=3)

        client.close.assert_called_once_with(3, None)
        assert "closed" in text


class TestReopenCase:
    @pytest.mark.asyncio
    async def test_reopens_a_closed_case(self):
        client = _make_mock_client()
        client.search.return_value = {
            "count": 1,
            "totalHits": 1,
            "cases": [{"ixBug": 5, "fOpen": False, "sStatus": "Closed", "operations": ["reopen"]}],
        }
        client.reopen.return_value = {"case": {"ixBug": 5, "operations": ["edit"]}}

        handler = _capture_tool(register_reopen_case, client)
        text = await handler(case_number=5)

        client.reopen.assert_called_once_with(5, None)
        assert "reopened" in text

    @pytest.mark.asyncio
    async def test_reactivates_a_resolved_case(self):
        client = _make_mock_client()
        client.search.return_value = {
            "count": 1,
            "totalHits": 1,
            "cases": [{"ixBug": 6, "fOpen": False, "sStatus": "Resolved", "operations": ["reactivate"]}],
        }
        client.reactivate.return_value = {"case": {"ixBug": 6, "operations": ["edit"]}}

        handler = _capture_tool(register_reopen_case, client)
        text = await handler(case_number=6, comment="Not done")

        client.reactivate.assert_called_once_with(6, "Not done")
        assert "reopened" in text

    @pytest.mark.asyncio
    async def test_returns_message_if_case_already_open(self):
        client = _make_mock_client()
        client.search.return_value = {
            "count": 1,
            "totalHits": 1,
            "cases": [{"ixBug": 8, "fOpen": True, "sStatus": "Active", "operations": []}],
        }

        handler = _capture_tool(register_reopen_case, client)
        text = await handler(case_number=8)
        assert "already open" in text
