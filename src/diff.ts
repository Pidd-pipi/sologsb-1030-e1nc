import { describeRequires } from './ops';
import type { ChecklistItem, ChecklistProject, ChecklistRevision, DiffEntry, DiffField, FlightStage, VersionOption } from './types';

interface Snapshot {
  stages: FlightStage[];
  items: ChecklistItem[];
}

export function buildVersionOptions(project: ChecklistProject): VersionOption[] {
  return [
    { id: 'current', label: `当前 r${project.revision} · ${statusLabel(project.status)}` },
    ...project.revisions.map((revision) => ({ id: revision.id, label: `r${revision.revision} · ${statusLabel(revision.status)} · ${new Date(revision.createdAt).toLocaleDateString('zh-CN')}` }))
  ];
}

export function diffVersions(project: ChecklistProject, leftId: string, rightId: string): DiffEntry[] {
  const left = versionSnapshot(project, leftId);
  const right = versionSnapshot(project, rightId);
  if (!left || !right) return [];
  const entries: DiffEntry[] = [];
  const oldItems = new Map(left.items.map((item) => [item.id, item]));
  const newItems = new Map(right.items.map((item) => [item.id, item]));
  const allIds = new Set([...oldItems.keys(), ...newItems.keys()]);

  for (const id of allIds) {
    const before = oldItems.get(id);
    const after = newItems.get(id);
    if (before && after) {
      const fields = buildItemFields(before, after, left, right);
      // 同阶段内仅顺序变化时也需要提示，但不要被 updatedAt 等元数据噪音触发。
      if (fields.some((field) => field.changed)) {
        entries.push({
          type: 'changed',
          key: id,
          stage: stageName(after.stageId, right),
          before: itemLabel(before),
          after: itemLabel(after),
          fields
        });
      }
    } else if (after) {
      entries.push({
        type: 'added',
        key: id,
        stage: stageName(after.stageId, right),
        before: '—',
        after: itemLabel(after),
        fields: buildSingleFields(after, right)
      });
    } else if (before) {
      entries.push({
        type: 'removed',
        key: id,
        stage: stageName(before.stageId, left),
        before: itemLabel(before),
        after: '—',
        fields: buildSingleFields(before, left)
      });
    }
  }

  const oldStageIds = new Set(left.stages.map((stage) => stage.id));
  const newStageIds = new Set(right.stages.map((stage) => stage.id));
  right.stages.filter((stage) => !oldStageIds.has(stage.id)).forEach((stage) => {
    entries.push({ type: 'stage', key: stage.id, stage: stage.name, before: '—', after: `新增阶段：${stage.description || stage.name}` });
  });
  left.stages.filter((stage) => !newStageIds.has(stage.id)).forEach((stage) => {
    entries.push({ type: 'stage', key: stage.id, stage: stage.name, before: `移除阶段：${stage.description || stage.name}`, after: '—' });
  });

  const stageOrderChanged = orderNames(left.stages) !== orderNames(right.stages);
  if (stageOrderChanged) {
    entries.unshift({ type: 'stage', key: 'stage-order', stage: '阶段排序', before: orderNames(left.stages), after: orderNames(right.stages) });
  }
  return entries;
}

function itemLabel(item: ChecklistItem): string {
  return `${item.challenge || '未命名'} → ${item.response || '未填写'}`;
}

function stageName(stageId: string, snapshot: Snapshot): string {
  return snapshot.stages.find((stage) => stage.id === stageId)?.name ?? '未分配阶段';
}

function orderNames(stages: FlightStage[]): string {
  return stages.slice().sort((a, b) => a.order - b.order).map((stage) => stage.name).join(' → ');
}

function preconditionNames(ids: string[], snapshot: Snapshot): string {
  if (!ids.length) return '无';
  return ids
    .map((id) => snapshot.items.find((item) => item.id === id)?.challenge || `已删除项 ${id}`)
    .join('、');
}

function stagePosition(item: ChecklistItem, snapshot: Snapshot): string {
  const stage = snapshot.stages.find((entry) => entry.id === item.stageId);
  return stage ? `${stage.name} #${item.order + 1}` : '未分配阶段';
}

const boolText = (value: boolean) => (value ? '是' : '否');

function field(label: string, before: string, after: string): DiffField {
  return { label, before, after, changed: before !== after };
}

/** 对比两个版本中同一检查项的每项配置。 */
function buildItemFields(before: ChecklistItem, after: ChecklistItem, left: Snapshot, right: Snapshot): DiffField[] {
  return [
    field('挑战语', before.challenge || '（空）', after.challenge || '（空）'),
    field('预期回应', before.response || '（空）', after.response || '（空）'),
    field('关键项', boolText(before.critical), boolText(after.critical)),
    field('阶段 / 序号', stagePosition(before, left), stagePosition(after, right)),
    field('前置条件', preconditionNames(before.preconditionIds, left), preconditionNames(after.preconditionIds, right)),
    field('异常处置', before.abnormalProcedure || '—', after.abnormalProcedure || '—'),
    field('运行条件要求', describeRequires(before.requires), describeRequires(after.requires))
  ];
}

/** 新增/删除条目也要展示该项完整配置，保证每项配置在差异中可追溯。 */
function buildSingleFields(item: ChecklistItem, snapshot: Snapshot): DiffField[] {
  return [
    field('挑战语', item.challenge || '（空）', item.challenge || '（空）'),
    field('预期回应', item.response || '（空）', item.response || '（空）'),
    field('关键项', boolText(item.critical), boolText(item.critical)),
    field('阶段 / 序号', stagePosition(item, snapshot), stagePosition(item, snapshot)),
    field('前置条件', preconditionNames(item.preconditionIds, snapshot), preconditionNames(item.preconditionIds, snapshot)),
    field('异常处置', item.abnormalProcedure || '—', item.abnormalProcedure || '—'),
    field('运行条件要求', describeRequires(item.requires), describeRequires(item.requires))
  ];
}

function versionSnapshot(project: ChecklistProject, id: string): Snapshot | undefined {
  if (id === 'current') return { stages: project.stages, items: project.items };
  const revision: ChecklistRevision | undefined = project.revisions.find((entry) => entry.id === id);
  return revision ? { stages: revision.stages, items: revision.items } : undefined;
}

function statusLabel(status: ChecklistProject['status']): string {
  return { draft: '编辑中', review: '复核中', frozen: '已冻结' }[status];
}
