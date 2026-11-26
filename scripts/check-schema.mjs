// 저장 데이터 모양 검사. pnpm build · pnpm release 가 먼저 돌린다(직접: pnpm check:schema).
//
// 하는 일
//  1. MIGRATIONS 가 1, 2, … SCHEMA_VERSION 까지 빠짐없이 차례로 있는지
//  2. 지금 DEFAULTS 의 모양을 schema/v<버전>.json 스냅숏과 비교
//     - 위쪽(최상위)에 새 키만 늘었으면: 기본값으로 채워지니 괜찮음 → 스냅숏만 갱신
//     - 키가 없어졌거나, 타입이 바뀌었거나, 펫 안쪽에 새 칸이 생겼으면: 예전 데이터가 깨질 수 있음
//       → SCHEMA_VERSION 을 올리고 마이그레이션을 넣으라고 멈춘다
//     - 버전을 올렸으면(스냅숏이 없으면) 새 스냅숏과 그 버전의 예시 데이터(schema/fixtures/v<버전>.json)를 만든다
//  3. schema/fixtures 의 예전 버전 데이터마다 마이그레이션을 돌려서
//     - 결과가 지금 모양에 맞는지(모르는 칸 · 다른 타입이 남지 않는지)
//     - 두 번 돌려도 같은지(멱등)
//
// 사용: node scripts/check-schema.mjs           검사(문제가 있으면 exit 1)
//       import { checkSchema } from "./check-schema.mjs"   (release.mjs 에서)
import { createServer } from "vite";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = join(root, "schema");
const fixDir = join(dir, "fixtures");

// ------------------------------------------------------------ 모양
/** 값 → 모양. 배열은 원소들의 모양을 합친다(어떤 원소에만 있는 칸은 optional) */
function shapeOf(v) {
  if (v === null) return { type: "null" };
  if (Array.isArray(v)) return { type: "array", of: v.length ? v.map(shapeOf).reduce(merge) : { type: "any" } };
  if (typeof v === "object") return { type: "object", fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, { ...shapeOf(x), optional: false }])) };
  return { type: typeof v };
}
function merge(a, b) {
  if (a.type === "any") return b;
  if (b.type === "any") return a;
  if (a.type !== b.type) return { type: "mixed" };
  if (a.type === "array") return { type: "array", of: merge(a.of, b.of) };
  if (a.type !== "object") return a;
  const fields = {};
  for (const k of new Set([...Object.keys(a.fields), ...Object.keys(b.fields)])) {
    const x = a.fields[k];
    const y = b.fields[k];
    fields[k] = x && y ? { ...merge(x, y), optional: x.optional || y.optional } : { ...(x || y), optional: true };
  }
  return { type: "object", fields };
}

/** 예전 모양 → 지금 모양 차이. top: 최상위 키인지 */
function diff(before, after, path = "", out = []) {
  const name = path || "(전체)";
  if (before.type !== after.type) {
    out.push({ kind: "changed", path: name, top: !path.includes("."), from: before.type, to: after.type });
    return out;
  }
  if (before.type === "array") return diff(before.of, after.of, path + "[]", out);
  if (before.type !== "object") return out;
  for (const k of Object.keys(before.fields)) {
    const p = path ? `${path}.${k}` : k;
    if (!(k in after.fields)) out.push({ kind: "removed", path: p, top: !path });
    else diff(before.fields[k], after.fields[k], p, out);
  }
  for (const k of Object.keys(after.fields)) {
    const p = path ? `${path}.${k}` : k;
    if (!(k in before.fields)) out.push({ kind: "added", path: p, top: !path, optional: after.fields[k].optional });
  }
  return out;
}

/** 값이 모양에 맞는지. 문제 목록을 돌려준다 */
function validate(v, shape, path, out) {
  if (shape.type === "any" || shape.type === "mixed") return out;
  const t = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
  if (t !== shape.type) {
    out.push(`${path}: ${shape.type} 이어야 하는데 ${t}`);
    return out;
  }
  if (t === "array") v.forEach((x, i) => validate(x, shape.of, `${path}[${i}]`, out));
  if (t === "object")
    for (const [k, x] of Object.entries(v)) {
      if (!(k in shape.fields)) out.push(`${path}.${k}: 지금 코드가 모르는 칸(마이그레이션에서 지우거나 옮겨야 함)`);
      else validate(x, shape.fields[k], `${path}.${k}`, out);
    }
  return out;
}

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ------------------------------------------------------------ 검사
export async function checkSchema({ quiet = false } = {}) {
  const log = (...a) => quiet || console.log(...a);
  const errors = [];
  const notes = [];

  // TS 모듈을 그대로 불러온다(chrome.* 는 함수 안에서만 쓰여서 불러오기만 해서는 안 돈다)
  const vite = await createServer({ configFile: false, logLevel: "error", appType: "custom", optimizeDeps: { noDiscovery: true, entries: [] }, server: { middlewareMode: true, hmr: false }, resolve: { alias: { "@src": resolve(root, "src") } } });
  let settings, migrate;
  try {
    settings = await vite.ssrLoadModule("/src/shared/settings.ts");
    migrate = await vite.ssrLoadModule("/src/shared/migrate.ts");
  } finally {
    await vite.close();
  }
  const { DEFAULTS } = settings;
  const { SCHEMA_VERSION: N, MIGRATIONS, VERSION_KEY, applyMigrations } = migrate;
  const appVersion = read(join(root, "package.json")).version;

  // 1. 마이그레이션 순서
  const tos = MIGRATIONS.map((m) => m.to);
  const want = Array.from({ length: N }, (_, i) => i + 1);
  if (!same(tos, want)) errors.push(`MIGRATIONS 의 to 가 ${JSON.stringify(want)} 여야 하는데 ${JSON.stringify(tos)} 예요. SCHEMA_VERSION(${N})을 올렸으면 그 버전으로 가는 마이그레이션을 맨 끝에 넣어 주세요.`);

  // 2. 스냅숏 비교
  mkdirSync(fixDir, { recursive: true });
  const shape = shapeOf(DEFAULTS);
  const snapPath = join(dir, `v${N}.json`);
  if (!existsSync(snapPath)) {
    const prev = join(dir, `v${N - 1}.json`);
    if (N > 1 && existsSync(prev)) {
      const d = diff(read(prev).shape, shape);
      notes.push(`저장 버전 ${N - 1} → ${N}: ${d.map((x) => `${x.kind} ${x.path}`).join(", ") || "모양 변화 없음"}`);
    }
    write(snapPath, { schemaVersion: N, firstAppVersion: appVersion, shape });
    // 이 버전의 예시 데이터: 다음 버전 마이그레이션이 이걸 제대로 올리는지 검사할 때 쓴다
    const fx = join(fixDir, `v${N}.json`);
    if (!existsSync(fx)) write(fx, { note: `저장 버전 ${N}(앱 ${appVersion})의 기본 데이터. 손대지 마세요.`, sync: { ...DEFAULTS, [VERSION_KEY]: N }, local: { "memo:https://example.com/post?": { text: "예시 메모", title: "Example", url: "https://example.com/post", updated: 1 } } });
    notes.push(`schema/v${N}.json 스냅숏과 schema/fixtures/v${N}.json 예시 데이터를 새로 만들었어요(커밋해 주세요).`);
  } else {
    const snap = read(snapPath);
    const d = diff(snap.shape, shape);
    const safe = d.filter((x) => x.kind === "added" && x.top);
    const risky = d.filter((x) => !(x.kind === "added" && x.top));
    if (risky.length) {
      errors.push(
        [
          `저장 모양이 바뀌었는데 저장 버전(SCHEMA_VERSION = ${N})이 그대로예요. 예전 사용자의 데이터가 깨질 수 있어요:`,
          ...risky.map((x) => `   - ${x.kind === "removed" ? "없어짐" : x.kind === "changed" ? `타입 바뀜(${x.from} → ${x.to})` : "안쪽에 새 칸"}: ${x.path}`),
          `   할 일: src/shared/migrate.ts 에서 SCHEMA_VERSION 을 ${N + 1} 로 올리고, MIGRATIONS 끝에 { to: ${N + 1}, note, run } 을 넣어 예전 데이터를 새 모양으로 바꿔 주세요.`,
          `   (일부러 그런 게 아니면 settings.ts 의 DEFAULTS 를 되돌리면 돼요)`,
        ].join("\n"),
      );
    } else if (safe.length) {
      write(snapPath, { ...snap, shape });
      notes.push(`새 설정 키 ${safe.map((x) => x.path).join(", ")}: 기본값으로 채워져서 마이그레이션 없이 괜찮아요. 스냅숏을 갱신했어요.`);
    }
  }

  // 3. 예시 데이터마다 마이그레이션 → 지금 모양 · 멱등
  const fixtures = existsSync(fixDir) ? readdirSync(fixDir).filter((f) => /^v\d+\.json$/.test(f)) : [];
  for (let v = 0; v <= N; v++) if (!fixtures.includes(`v${v}.json`)) errors.push(`schema/fixtures/v${v}.json 이 없어요(저장 버전 ${v} 데이터 예시).`);
  const syncShape = { ...shape, fields: { ...shape.fields, [VERSION_KEY]: { type: "number", optional: true } } };
  for (const f of fixtures) {
    const from = +f.slice(1, -5);
    if (from > N) continue;
    const data = read(join(fixDir, f));
    const once = { sync: structuredClone(data.sync), local: structuredClone(data.local) };
    try {
      applyMigrations(once, from);
    } catch (e) {
      errors.push(`${f}: 마이그레이션이 오류로 멈췄어요: ${e.message}`);
      continue;
    }
    const twice = structuredClone(once);
    applyMigrations(twice, from);
    if (!same(once, twice)) errors.push(`${f}: 마이그레이션을 두 번 돌리면 결과가 달라요(같은 데이터에 다시 돌려도 같게 써 주세요).`);
    const probs = validate(once.sync, syncShape, "sync", []);
    if (probs.length) errors.push(`${f}: 마이그레이션 뒤에도 지금 모양과 안 맞아요:\n   - ${probs.slice(0, 8).join("\n   - ")}`);
    if (once.sync[VERSION_KEY] !== N) errors.push(`${f}: 마이그레이션 뒤 schemaVersion 이 ${N} 이 아니에요.`);
  }

  log(`저장 버전 ${N} · 마이그레이션 ${MIGRATIONS.length}개 · 예시 데이터 ${fixtures.length}개 검사`);
  for (const n of notes) log("  ✓ " + n);
  for (const e of errors) console.error("  ✗ " + e);
  return { ok: errors.length === 0, schemaVersion: N, errors, notes };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await checkSchema();
  if (!r.ok) {
    console.error("\n저장 데이터 검사에 실패했어요. 위 내용을 고친 뒤 다시 빌드하세요.");
    process.exit(1);
  }
}
