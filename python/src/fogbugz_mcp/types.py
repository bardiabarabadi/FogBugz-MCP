from __future__ import annotations

from typing import Any, TypedDict


class FogBugzError(TypedDict):
    message: str
    detail: str | None
    code: str


class FogBugzWarning(TypedDict):
    message: str


class FogBugzResponse(TypedDict, total=False):
    data: Any
    errors: list[FogBugzError]
    warnings: list[FogBugzWarning]
    meta: dict[str, Any]
    errorCode: int | None
    maxCacheAge: int | None


class FogBugzAttachment(TypedDict):
    sFileName: str
    sURL: str


class FogBugzEvent(TypedDict, total=False):
    ixBug: int
    ixBugEvent: int
    evt: int
    sVerb: str
    ixPerson: int
    sPerson: str
    ixPersonAssignedTo: int
    dt: str
    s: str
    sHTML: str
    fEmail: bool
    fExternal: bool
    fHTML: bool
    sFormat: str
    sChanges: str
    evtDescription: str
    rgAttachments: list[FogBugzAttachment]
    sFrom: str
    sTo: str
    sCC: str
    sBCC: str
    sReplyTo: str
    sSubject: str
    sDate: str
    sBodyText: str
    sBodyHTML: str


class FogBugzCase(TypedDict, total=False):
    ixBug: int
    operations: list[str]
    sTitle: str
    sOriginalTitle: str
    sLatestTextSummary: str
    ixBugEventLatestText: int
    ixProject: int
    sProject: str
    ixArea: int
    sArea: str
    ixPersonAssignedTo: int
    sPersonAssignedTo: str
    sEmailAssignedTo: str
    ixPersonOpenedBy: int
    ixPersonClosedBy: int
    ixPersonResolvedBy: int
    ixPersonLastEditedBy: int
    ixStatus: int
    sStatus: str
    ixPriority: int
    sPriority: str
    ixFixFor: int
    sFixFor: str
    dtFixFor: str
    ixCategory: int
    sCategory: str
    ixBugParent: int
    ixBugChildren: list[int]
    ixBugDuplicates: int
    ixBugOriginal: int
    tags: list[str]
    fOpen: bool
    dtOpened: str
    dtResolved: str
    dtClosed: str
    dtLastUpdated: str
    dtDue: str
    dblStoryPts: float
    nFixForOrder: int
    ixKanbanColumn: int
    sKanbanColumn: str
    ixRelatedBugs: list[int]
    fSubscribed: bool
    sTicket: str
    hrsOrigEst: float
    hrsCurrEst: float
    hrsElapsed: float
    sVersion: str
    sComputer: str
    sCustomerEmail: str
    ixMailbox: int
    events: list[FogBugzEvent]


class FogBugzPerson(TypedDict, total=False):
    ixPerson: int
    sFullName: str
    sEmail: str
    sPhone: str
    fAdministrator: bool
    fCommunity: bool
    fVirtual: bool
    fDeleted: bool
    fNotify: bool
    sHomepage: str
    sLocale: str
    sLanguage: str
    sTimeZoneKey: str
    sLDAPUid: str
    dtLastActivity: str
    ixBugWorkingOn: int
    nType: int
    sFrom: str


class SearchData(TypedDict):
    count: int
    totalHits: int
    cases: list[FogBugzCase]


class ListPeopleData(TypedDict):
    people: list[FogBugzPerson]


class CaseActionData(TypedDict):
    case: CaseActionCase


class CaseActionCase(TypedDict):
    ixBug: int
    operations: list[str]
