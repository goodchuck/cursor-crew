/*
 * 저장 데이터 버전 · 마이그레이션 · 백업 파일.
 *
 * - chrome.storage.sync 의 schemaVersion 이 지금 데이터 모양의 버전이다(없으면 0 = 버전을 붙이기 전).
 * - 확장이 설치·업데이트·시작될 때(background), 그리고 설정을 처음 읽을 때(loadSettings) 한 번 확인해서
 *   낮으면 MIGRATIONS 를 차례로 돌린다. 돌리기 전 데이터는 chrome.storage.local 의 BACKUP_KEY 에 남겨 둔다.
 * - 더 높으면(다른 컴퓨터에서 새 버전이 저장한 것) 건드리지 않는다.
 *
 * 데이터 모양을 바꿀 때:
 *   1. SCHEMA_VERSION 을 1 올린다.
 *   2. MIGRATIONS 맨 끝에 { to: 새 버전, note, run } 을 더한다. run 은 store.sync / store.local 을 직접 고친다
 *      (키를 지우려면 delete). 같은 데이터에 두 번 돌려도 결과가 같게(멱등) 쓴다.
 *   3. settings.ts 의 Settings · DEFAULTS 도 새 모양으로.
 */
import { ACTION_IDS, IMAGE_KEYS, MAX_CREW, MAX_MORE, MENU_KEYS } from "./settings";

export const SCHEMA_VERSION = 1;
export const VERSION_KEY = "schemaVersion";
/** 마지막 마이그레이션 직전 데이터(chrome.storage.local) */
export const BACKUP_KEY = "backup:beforeMigration";

type Bag = Record<string, unknown>;
export interface Store {
  sync: Bag;
  local: Bag;
}
interface Migration {
  to: number;
  note: string;
  run(store: Store): void;
}

const isObj = (v: unknown): v is Bag => !!v && typeof v === "object" && !Array.isArray(v);

export const MIGRATIONS: Migration[] = [
  {
    to: 1,
    note: "버전 붙이기 전 데이터 정리: 없어진 메뉴 키, 4마리 이상, 모르는 기능, 옛 이미지 키",
    run({ sync, local }) {
      // v0.6 이전의 menuKey "off" 등 → 기본 키
      if (sync.menuKey !== undefined && !MENU_KEYS.includes(sync.menuKey as never)) sync.menuKey = "Alt";
      // 펫은 최대 3마리, 모르는 기능은 빼고, 더 넣은 기능은 MAX_MORE 개까지
      if (Array.isArray(sync.crew)) {
        const known = (t: unknown) => isObj(t) && ACTION_IDS.includes(t.action as never);
        sync.crew = sync.crew
          .filter(known)
          .slice(0, MAX_CREW)
          .map((m: Bag) => {
            const more = Array.isArray(m.more) ? m.more.filter(known).slice(0, MAX_MORE) : [];
            const { more: _drop, ...rest } = m;
            return more.length ? { ...rest, more } : rest;
          });
        if (!(sync.crew as unknown[]).length) delete sync.crew; // 비면 기본 펫으로
      }
      // v0.4 이전 이미지 키(skinImage) → 첫 펫 이미지(skinImage0)
      if (typeof local.skinImage === "string") {
        if (!local[IMAGE_KEYS[0]]) local[IMAGE_KEYS[0]] = local.skinImage;
        delete local.skinImage;
      }
    },
  },
];

/** store 를 fromVersion 에서 SCHEMA_VERSION 까지 올린다(제자리에서 고침). 돌린 마이그레이션 수를 돌려준다 */
export function applyMigrations(store: Store, fromVersion: number): number {
  let n = 0;
  for (const m of MIGRATIONS) {
    if (m.to <= fromVersion) continue;
    m.run(store);
    n++;
  }
  store.sync[VERSION_KEY] = SCHEMA_VERSION;
  return n;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** 바뀐 키만 저장하고 없어진 키는 지운다 */
async function writeDiff(area: chrome.storage.StorageArea, before: Bag, after: Bag) {
  const set: Bag = {};
  for (const [k, v] of Object.entries(after)) if (JSON.stringify(v) !== JSON.stringify(before[k])) set[k] = v;
  const removed = Object.keys(before).filter((k) => !(k in after));
  if (Object.keys(set).length) await area.set(set);
  if (removed.length) await area.remove(removed);
}

export type MigrateResult = "fresh" | "current" | "newer" | "migrated";

/** 저장 데이터를 지금 버전으로 올린다. 이미 최신이면 버전 키 하나만 읽고 끝난다 */
export async function migrateStorage(): Promise<MigrateResult> {
  const { [VERSION_KEY]: raw } = await chrome.storage.sync.get(VERSION_KEY);
  const from = typeof raw === "number" ? raw : 0;
  if (from === SCHEMA_VERSION) return "current";
  if (from > SCHEMA_VERSION) return "newer";

  const sync = await chrome.storage.sync.get(null);
  const local = await chrome.storage.local.get(null);
  // 아무것도 없으면 새로 설치한 것: 버전만 적는다
  if (!Object.keys(sync).length) {
    await chrome.storage.sync.set({ [VERSION_KEY]: SCHEMA_VERSION });
    return "fresh";
  }
  // 되돌릴 수 있게 고치기 전 모습을 남긴다(이미지는 커서 빼고)
  const backupLocal: Bag = {};
  for (const [k, v] of Object.entries(local)) if (!IMAGE_KEYS.includes(k) && k !== "skinImage" && k !== BACKUP_KEY) backupLocal[k] = v;
  await chrome.storage.local.set({ [BACKUP_KEY]: { from, to: SCHEMA_VERSION, at: Date.now(), sync: clone(sync), local: backupLocal } });

  const store: Store = { sync: clone(sync), local: clone(local) };
  delete store.local[BACKUP_KEY];
  applyMigrations(store, from);
  const { [BACKUP_KEY]: _b, ...localBefore } = local;
  await writeDiff(chrome.storage.local, localBefore, store.local);
  await writeDiff(chrome.storage.sync, sync, store.sync);
  return "migrated";
}

let once: Promise<MigrateResult> | null = null;
/** 한 페이지(컨텍스트)에서 한 번만 확인 */
export function ensureMigrated(): Promise<MigrateResult> {
  return (once ??= migrateStorage().catch(() => "current" as const));
}

// ------------------------------------------------------------ 백업 파일(내보내기 · 가져오기)
export const BACKUP_APP = "cursor-crew";
export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  sync: Bag;
  /** 메모 · 안내 본 기록(이미지는 빼고) */
  local: Bag;
}

export async function exportBackup(): Promise<BackupFile> {
  await ensureMigrated();
  const sync = await chrome.storage.sync.get(null);
  const all = await chrome.storage.local.get(null);
  const local: Bag = {};
  for (const [k, v] of Object.entries(all)) if (!IMAGE_KEYS.includes(k) && k !== "skinImage" && k !== BACKUP_KEY) local[k] = v;
  return { app: BACKUP_APP, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), sync, local };
}

export type ImportResult = { ok: true; memos: number } | { ok: false; reason: "notBackup" | "newer" };

/** 백업 파일을 읽어 지금 버전으로 올린 뒤 저장한다. 설정은 통째로 바꾸고, 메모는 합친다(같은 페이지면 파일 것으로) */
export async function importBackup(text: string): Promise<ImportResult> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "notBackup" };
  }
  if (!isObj(data) || data.app !== BACKUP_APP || !isObj(data.sync) || !isObj(data.local)) return { ok: false, reason: "notBackup" };
  const from = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;
  if (from > SCHEMA_VERSION) return { ok: false, reason: "newer" };
  const store: Store = { sync: clone(data.sync), local: clone(data.local) };
  applyMigrations(store, from);
  await chrome.storage.sync.clear();
  await chrome.storage.sync.set(store.sync);
  await chrome.storage.local.set(store.local);
  return { ok: true, memos: Object.keys(store.local).filter((k) => k.startsWith("memo:")).length };
}
