export type WorkflowStatus = 'draft' | 'review' | 'frozen';
export type IssueLevel = 'error' | 'warning' | 'info';
export type IssueType = 'duplicate' | 'missing-response' | 'unreachable-precondition' | 'stage-order' | 'orphan-stage' | 'critical-excluded';

/** 检查项要求的运行条件：全部满足时该项才进入执行视图。 */
export type OperationalCondition = 'night' | 'icing' | 'ifr';

/** 本次航班实际运行条件，按航段在执行视图中选择。 */
export interface FlightConditions {
  night: boolean;
  icing: boolean;
  ifr: boolean;
}

export interface FlightStage {
  id: string;
  name: string;
  order: number;
  description: string;
}

export interface ChecklistItem {
  id: string;
  stageId: string;
  order: number;
  challenge: string;
  response: string;
  critical: boolean;
  preconditionIds: string[];
  abnormalProcedure: string;
  /** 必须满足的运行条件；空数组表示任意条件下都执行。 */
  requires: OperationalCondition[];
  updatedAt: string;
}

export interface ChecklistRevision {
  id: string;
  revision: number;
  status: WorkflowStatus;
  createdAt: string;
  note: string;
  stages: FlightStage[];
  items: ChecklistItem[];
  /** 冻结时该版本对应的航班运行条件，随快照保留。 */
  flightConditions: FlightConditions;
}

export interface ChecklistProject {
  id: string;
  name: string;
  aircraft: string;
  revision: number;
  status: WorkflowStatus;
  updatedAt: string;
  reviewNote: string;
  stages: FlightStage[];
  items: ChecklistItem[];
  revisions: ChecklistRevision[];
  /** 当前航班选择的运行条件，持久化到浏览器并随冻结快照留存。 */
  flightConditions: FlightConditions;
}

export interface WorkspaceState {
  schemaVersion: 1;
  selectedProjectId: string;
  projects: ChecklistProject[];
}

export interface ValidationIssue {
  id: string;
  type: IssueType;
  level: IssueLevel;
  stageId?: string;
  itemId?: string;
  title: string;
  detail: string;
}

export interface VersionOption {
  id: string;
  label: string;
}

export interface DiffField {
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

export interface DiffEntry {
  type: 'added' | 'removed' | 'changed' | 'stage';
  key: string;
  stage: string;
  before: string;
  after: string;
  /** 检查项条目的逐字段前后值（阶段类条目仍使用 before/after 文本）。 */
  fields?: DiffField[];
}
