const STORAGE_KEY = "fintrack_budget_thresholds_v1";

export interface BudgetThresholds {
  warning1Percent: number;
  warning2Percent: number;
}

interface StoredData {
  version: 1;
  warning1Percent: number;
  warning2Percent: number;
}

const DEFAULTS: BudgetThresholds = { warning1Percent: 80, warning2Percent: 90 };

function load(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, ...DEFAULTS };
    const parsed = JSON.parse(raw) as StoredData;
    if (parsed.version !== 1) return { version: 1, ...DEFAULTS };
    return parsed;
  } catch {
    return { version: 1, ...DEFAULTS };
  }
}

function save(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getThresholds(): BudgetThresholds {
  const d = load();
  return { warning1Percent: d.warning1Percent, warning2Percent: d.warning2Percent };
}

export function validateThresholds(input: Partial<BudgetThresholds>): BudgetThresholds {
  let w1 = Math.round(input.warning1Percent ?? DEFAULTS.warning1Percent);
  let w2 = Math.round(input.warning2Percent ?? DEFAULTS.warning2Percent);
  w1 = Math.max(1, Math.min(98, w1));
  w2 = Math.max(2, Math.min(99, w2));
  if (w1 >= w2) w1 = w2 - 1;
  return { warning1Percent: w1, warning2Percent: w2 };
}

export function saveBudgetThresholds(input: BudgetThresholds) {
  const validated = validateThresholds(input);
  save({ version: 1, ...validated });
}

export type BudgetStatusType = "ok" | "warn1" | "warn2" | "over" | "none";

export function getBudgetStatus(
  spent: number,
  limit: number,
  thresholds?: BudgetThresholds
): { status: BudgetStatusType; pct: number } {
  if (limit <= 0) return { status: "none", pct: 0 };
  const pct = (spent / limit) * 100;
  const t = thresholds ?? getThresholds();
  if (pct >= 100) return { status: "over", pct };
  if (pct >= t.warning2Percent) return { status: "warn2", pct };
  if (pct >= t.warning1Percent) return { status: "warn1", pct };
  return { status: "ok", pct };
}
