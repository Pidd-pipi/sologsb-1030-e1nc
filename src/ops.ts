import type { ChecklistItem, FlightConditions, FlightStage, OperationalCondition } from './types';

export const OPERATIONAL_CONDITIONS: { key: OperationalCondition; label: string; short: string; hint: string }[] = [
  { key: 'night', label: '夜航', short: '夜', hint: '夜间运行（起降或主要航段处于日落至日出之间）' },
  { key: 'icing', label: '结冰条件', short: '冰', hint: '预报或实际存在结冰条件，需使用防除冰设备' },
  { key: 'ifr', label: '仪表飞行', short: 'IFR', hint: '按仪表飞行规则运行，依赖仪表姿态与导航参考' }
];

export const conditionMeta = new Map(OPERATIONAL_CONDITIONS.map((entry) => [entry.key, entry]));

export const conditionLabel = (key: OperationalCondition): string => conditionMeta.get(key)?.label ?? key;

export const defaultFlightConditions = (): FlightConditions => ({ night: false, icing: false, ifr: false });

/** 该项在给定航班条件下尚缺的运行条件；返回空数组表示条件满足、项目可用。 */
export function missingConditions(item: ChecklistItem, flight: FlightConditions): OperationalCondition[] {
  return (item.requires ?? []).filter((key) => !flight[key]);
}

/** 用中文列出缺少的条件，如“缺少：夜航、结冰条件”。 */
export function describeMissing(keys: OperationalCondition[]): string {
  return keys.length ? `缺少：${keys.map(conditionLabel).join('、')}` : '';
}

/** 检查项上标注的运行条件要求文本。 */
export function describeRequires(keys?: OperationalCondition[]): string {
  return keys && keys.length ? `要求：${keys.map(conditionLabel).join(' + ')}` : '任意条件适用';
}

export interface ExecutionItem {
  item: ChecklistItem;
  missing: OperationalCondition[];
}

export interface ExecutionGroup {
  stage: FlightStage;
  available: ExecutionItem[];
  excluded: ExecutionItem[];
}

/**
 * 执行视图：按航班选择的条件计算可用项与排除项。
 * 条件要求为空的检查项任何航段都执行；要求任一条件未满足即进入排除区。
 */
export function evaluateChecklist(stages: FlightStage[], items: ChecklistItem[], flight: FlightConditions): ExecutionGroup[] {
  return stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stage) => {
      const stageItems = items.filter((item) => item.stageId === stage.id).sort((a, b) => a.order - b.order);
      return {
        stage,
        available: stageItems
          .map((item) => ({ item, missing: missingConditions(item, flight) }))
          .filter((entry) => entry.missing.length === 0),
        excluded: stageItems
          .map((item) => ({ item, missing: missingConditions(item, flight) }))
          .filter((entry) => entry.missing.length > 0)
      };
    })
    .filter((group) => group.available.length > 0 || group.excluded.length > 0);
}
