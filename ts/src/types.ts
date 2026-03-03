export interface FogBugzResponse<T = unknown> {
  data: T;
  errors: FogBugzError[];
  warnings: FogBugzWarning[];
  meta: {
    jsdbInvalidator: string;
    clientVersionAllowed: { min: number; max: number };
  };
  errorCode: number | null;
  maxCacheAge: number | null;
}

export interface FogBugzError {
  message: string;
  detail: string | null;
  code: string;
}

export interface FogBugzWarning {
  message: string;
}

export interface FogBugzCase {
  ixBug: number;
  operations?: string[];
  sTitle?: string;
  sOriginalTitle?: string;
  sLatestTextSummary?: string;
  ixBugEventLatestText?: number;
  ixProject?: number;
  sProject?: string;
  ixArea?: number;
  sArea?: string;
  ixPersonAssignedTo?: number;
  sPersonAssignedTo?: string;
  sEmailAssignedTo?: string;
  ixPersonOpenedBy?: number;
  ixPersonClosedBy?: number;
  ixPersonResolvedBy?: number;
  ixPersonLastEditedBy?: number;
  ixStatus?: number;
  sStatus?: string;
  ixPriority?: number;
  sPriority?: string;
  ixFixFor?: number;
  sFixFor?: string;
  dtFixFor?: string;
  ixCategory?: number;
  sCategory?: string;
  ixBugParent?: number;
  ixBugChildren?: number[];
  ixBugDuplicates?: number;
  ixBugOriginal?: number;
  tags?: string[];
  fOpen?: boolean;
  dtOpened?: string;
  dtResolved?: string;
  dtClosed?: string;
  dtLastUpdated?: string;
  dtDue?: string;
  dblStoryPts?: number;
  nFixForOrder?: number;
  ixKanbanColumn?: number;
  sKanbanColumn?: string;
  ixRelatedBugs?: number[];
  fSubscribed?: boolean;
  sTicket?: string;
  hrsOrigEst?: number;
  hrsCurrEst?: number;
  hrsElapsed?: number;
  sVersion?: string;
  sComputer?: string;
  sCustomerEmail?: string;
  ixMailbox?: number;
  events?: FogBugzEvent[];
  minievents?: FogBugzMiniEvent[];
}

export interface FogBugzEvent {
  ixBug: number;
  ixBugEvent: number;
  evt: number;
  sVerb: string;
  ixPerson: number;
  sPerson: string;
  ixPersonAssignedTo: number;
  dt: string;
  s: string;
  sHTML?: string;
  fEmail: boolean;
  fExternal: boolean;
  fHTML: boolean;
  sFormat?: string;
  sChanges: string;
  evtDescription: string;
  rgAttachments: FogBugzAttachment[];
  sFrom?: string;
  sTo?: string;
  sCC?: string;
  sBCC?: string;
  sReplyTo?: string;
  sSubject?: string;
  sDate?: string;
  sBodyText?: string;
  sBodyHTML?: string;
}

export interface FogBugzMiniEvent {
  ixBug: number;
  ixBugEvent: number;
  evt: number;
  sVerb: string;
  ixPerson: number;
  sPerson: string;
  ixPersonAssignedTo: number;
  dt: string;
  fEmail: boolean;
  fHTML: boolean;
  sFormat?: string;
  fExternal: boolean;
  sChanges: string;
  evtDescription: string;
  rgAttachments: FogBugzAttachment[];
}

export interface FogBugzAttachment {
  sFileName: string;
  sURL: string;
}

export interface FogBugzPerson {
  ixPerson: number;
  sFullName: string;
  sEmail: string;
  sPhone: string;
  fAdministrator: boolean;
  fCommunity: boolean;
  fVirtual: boolean;
  fDeleted: boolean;
  fNotify?: boolean;
  sHomepage: string;
  sLocale: string;
  sLanguage: string;
  sTimeZoneKey: string;
  sLDAPUid?: string;
  dtLastActivity?: string;
  ixBugWorkingOn: number;
  nType?: number;
  sFrom?: string;
}

export interface FogBugzProject {
  ixProject: number;
  sProject: string;
  ixPersonOwner: number;
  sPersonOwner: string;
  sEmail: string;
  sPhone: string;
  fInbox: boolean;
  ixGroup: number;
  iType: number;
  fDeleted: boolean;
}

export interface FogBugzFixFor {
  ixFixFor: number;
  sFixFor: string;
  fDeleted?: boolean;
  fInactive?: boolean;
  dt: string;
  dtStart: string;
  sStartNote: string;
  ixProject: number;
  sProject?: string;
  setixFixForDependency?: string;
  fReallyDeleted?: boolean;
}

export interface FogBugzKanbanColumn {
  ixPlanner: number;
  ixKanbanColumn: number;
  sKanbanColumn: string;
}

export interface FogBugzCategory {
  ixCategory: number;
  sCategory: string;
  sPlural: string;
  ixStatusDefault: number;
  fIsScheduleItem: boolean;
  fDeleted: boolean;
  iOrder: number;
  nIconType: number;
  ixAttachmentIcon: number;
  ixStatusDefaultActive: number;
}

export interface FogBugzStatus {
  ixStatus: number;
  sStatus: string;
  ixCategory: number;
  fWorkDone: boolean;
  fResolved: boolean;
  fDuplicate: boolean;
  fDeleted: boolean;
  iOrder: number;
}

export interface FogBugzPriority {
  ixPriority: number;
  sPriority: string;
  fDefault: boolean;
}

export interface SearchData {
  count: number;
  totalHits: number;
  cases: FogBugzCase[];
  description?: string;
}

export interface ListPeopleData {
  people: FogBugzPerson[];
}

export interface ViewPersonData {
  people: FogBugzPerson[];
}

export interface ListProjectsData {
  projects: FogBugzProject[];
}

export interface ListFixForsData {
  fixfors: FogBugzFixFor[];
}

export interface ListKanbanColumnsData {
  kanbancolumns: {
    kanbancolumn: FogBugzKanbanColumn[];
  };
}

export interface ListCategoriesData {
  categories: FogBugzCategory[];
}

export interface ListStatusesData {
  statuses: FogBugzStatus[];
}

export interface ListPrioritiesData {
  priorities: FogBugzPriority[];
}

export interface CaseActionData {
  case: {
    ixBug: number;
    operations: string[];
  };
}
