import type { ChecklistItem, OperationCondition } from './types';

export const OPERATION_CONDITIONS: OperationCondition[] = ['night', 'icing', 'ifr'];

export const conditionMeta: Record<OperationCondition, { label: string; short: string; description: string }> = {
  night: { label: '夜航', short: '夜航', description: '夜间运行所需的照明、灯光与目视参考检查。' },
  icing: { label: '结冰条件', short: '结冰', description: '已知或预报结冰条件下的防冰 / 除冰检查。' },
  ifr: { label: '仪表飞行', short: '仪表', description: 'IFR 运行所需的仪表、导航与许可检查。' }
};

export const formatConditions = (conditions: OperationCondition[]): string =>
  conditions.map((condition) => conditionMeta[condition].label).join('、');

/** 按固定顺序整理条件集合，保证存储与比较结果稳定。 */
export const normalizeConditions = (conditions: Iterable<OperationCondition>): OperationCondition[] => {
  const selected = new Set(conditions);
  return OPERATION_CONDITIONS.filter((condition) => selected.has(condition));
};

/** 检查项要求、但当前航班未选择的运行条件。 */
export function missingConditions(item: ChecklistItem, flightConditions: OperationCondition[]): OperationCondition[] {
  const active = new Set(flightConditions);
  return (item.requiredConditions ?? []).filter((condition) => !active.has(condition));
}

export interface ExcludedItem {
  item: ChecklistItem;
  missing: OperationCondition[];
}

/** 按航班条件把检查项分成可执行项与排除项（附缺少的条件）。 */
export function partitionItems(items: ChecklistItem[], flightConditions: OperationCondition[]): { usable: ChecklistItem[]; excluded: ExcludedItem[] } {
  const usable: ChecklistItem[] = [];
  const excluded: ExcludedItem[] = [];
  items.forEach((item) => {
    const missing = missingConditions(item, flightConditions);
    if (missing.length > 0) {
      excluded.push({ item, missing });
    } else {
      usable.push(item);
    }
  });
  return { usable, excluded };
}
