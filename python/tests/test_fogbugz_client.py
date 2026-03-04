from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from fogbugz_mcp.fogbugz_client import FogBugzApiError, FogBugzClient


def _mock_response(data, errors=None, *, status_code=200):
    resp = AsyncMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.is_success = 200 <= status_code < 300
    resp.reason_phrase = "OK" if resp.is_success else "Internal Server Error"
    resp.json.return_value = {
        "data": data,
        "errors": errors or [],
        "warnings": [],
        "meta": {"jsdbInvalidator": "x", "clientVersionAllowed": {"min": 5, "max": 5}},
        "errorCode": 400 if errors else None,
        "maxCacheAge": None,
    }
    return resp


@pytest.fixture
def client():
    return FogBugzClient("https://test.fogbugz.com", "test-token")


class TestConstructor:
    def test_strips_trailing_slashes(self):
        c = FogBugzClient("https://test.fogbugz.com///", "tok")
        assert c.get_case_url(123) == "https://test.fogbugz.com/f/cases/123"


class TestGetCaseUrl:
    def test_builds_correct_case_url(self, client):
        assert client.get_case_url(42) == "https://test.fogbugz.com/f/cases/42"


class TestSearch:
    @pytest.mark.asyncio
    async def test_sends_correct_request_and_returns_data(self, client):
        search_data = {"count": 1, "totalHits": 1, "cases": [{"ixBug": 100, "sTitle": "Test Case"}]}
        mock_resp = _mock_response(search_data)

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            result = await client.search("test", ["sTitle"], 10)

            mock_post.assert_called_once()
            call_args = mock_post.call_args
            assert call_args[0][0] == "https://test.fogbugz.com/api/search"
            body = call_args[1]["json"]
            assert body["token"] == "test-token"
            assert body["q"] == "test"
            assert body["cols"] == ["sTitle"]
            assert body["max"] == 10
            assert result == search_data

    @pytest.mark.asyncio
    async def test_omits_max_when_not_provided(self, client):
        mock_resp = _mock_response({"count": 0, "totalHits": 0, "cases": []})

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            await client.search("q", ["sTitle"])
            body = mock_post.call_args[1]["json"]
            assert "max" not in body


class TestNewCase:
    @pytest.mark.asyncio
    async def test_sends_fields_to_new_endpoint(self, client):
        case_data = {"case": {"ixBug": 999, "operations": ["edit"]}}
        mock_resp = _mock_response(case_data)

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            result = await client.new_case({"sTitle": "Brand new", "sProject": "Main"})
            url = mock_post.call_args[0][0]
            body = mock_post.call_args[1]["json"]
            assert url == "https://test.fogbugz.com/api/new"
            assert body["sTitle"] == "Brand new"
            assert body["sProject"] == "Main"
            assert body["token"] == "test-token"
            assert result["case"]["ixBug"] == 999


class TestEdit:
    @pytest.mark.asyncio
    async def test_sends_ix_bug_and_fields(self, client):
        case_data = {"case": {"ixBug": 5, "operations": ["edit"]}}
        mock_resp = _mock_response(case_data)

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            result = await client.edit(5, {"sTitle": "New Title"})
            body = mock_post.call_args[1]["json"]
            assert body["ixBug"] == 5
            assert body["sTitle"] == "New Title"
            assert result["case"]["ixBug"] == 5


class TestAssign:
    @pytest.mark.asyncio
    async def test_sends_assignee_and_optional_comment(self, client):
        case_data = {"case": {"ixBug": 10, "operations": ["edit"]}}
        mock_resp = _mock_response(case_data)

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            await client.assign(10, "Alice", "Please review")
            body = mock_post.call_args[1]["json"]
            assert body["ixBug"] == 10
            assert body["sPersonAssignedTo"] == "Alice"
            assert body["sEvent"] == "Please review"

    @pytest.mark.asyncio
    async def test_omits_s_event_when_not_provided(self, client):
        mock_resp = _mock_response({"case": {"ixBug": 10, "operations": []}})

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            await client.assign(10, "Bob")
            body = mock_post.call_args[1]["json"]
            assert "sEvent" not in body


class TestResolve:
    @pytest.mark.asyncio
    async def test_sends_resolve_with_status_and_comment(self, client):
        mock_resp = _mock_response({"case": {"ixBug": 7, "operations": []}})

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            await client.resolve(7, {"sStatus": "Fixed", "sEvent": "Done"})
            body = mock_post.call_args[1]["json"]
            assert body["ixBug"] == 7
            assert body["sStatus"] == "Fixed"
            assert body["sEvent"] == "Done"


class TestClose:
    @pytest.mark.asyncio
    async def test_sends_close_request(self, client):
        mock_resp = _mock_response({"case": {"ixBug": 3, "operations": []}})

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            await client.close(3, "Closing now")
            url = mock_post.call_args[0][0]
            body = mock_post.call_args[1]["json"]
            assert "/api/close" in url
            assert body["sEvent"] == "Closing now"


class TestReopen:
    @pytest.mark.asyncio
    async def test_sends_reopen_request(self, client):
        mock_resp = _mock_response({"case": {"ixBug": 3, "operations": []}})

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            await client.reopen(3)
            url = mock_post.call_args[0][0]
            assert "/api/reopen" in url


class TestReactivate:
    @pytest.mark.asyncio
    async def test_sends_reactivate_request(self, client):
        mock_resp = _mock_response({"case": {"ixBug": 3, "operations": []}})

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp) as mock_post:
            await client.reactivate(3, "Reactivating")
            url = mock_post.call_args[0][0]
            body = mock_post.call_args[1]["json"]
            assert "/api/reactivate" in url
            assert body["sEvent"] == "Reactivating"


class TestListPeople:
    @pytest.mark.asyncio
    async def test_returns_people_list(self, client):
        people_data = {"people": [{"ixPerson": 1, "sFullName": "Alice", "sEmail": "alice@test.com"}]}
        mock_resp = _mock_response(people_data)

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp):
            result = await client.list_people({"fIncludeActive": 1})
            assert len(result["people"]) == 1
            assert result["people"][0]["sFullName"] == "Alice"


class TestErrorHandling:
    @pytest.mark.asyncio
    async def test_throws_on_api_error(self, client):
        mock_resp = _mock_response(
            {}, errors=[{"message": "Error 3: Not logged in", "detail": None, "code": "3"}]
        )

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(FogBugzApiError, match="Not logged in"):
                await client.search("test", ["sTitle"])

    @pytest.mark.asyncio
    async def test_throws_on_http_error(self, client):
        mock_resp = _mock_response({}, status_code=500)

        with patch.object(client._http, "post", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(FogBugzApiError, match="HTTP 500"):
                await client.search("test", ["sTitle"])
