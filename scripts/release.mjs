// 새 버전 내기: 저장 데이터 검사 → 버전 올리기 → 기록 → 빌드·zip.
// 사용: pnpm release            0.8.0 → 0.8.1
//       pnpm release minor      0.8.0 → 0.9.0
//       pnpm release major      0.8.0 → 1.0.0
//       pnpm release 1.2.3      그 버전으로
//
// 저장 모양이 바뀌었는데 마이그레이션이 없으면 여기서 멈춘다(scripts/check-schema.mjs).
// schema/history.json 에 "앱 버전 ↔ 저장 버전"을 남겨서, 어떤 버전 사용자가 어떤 데이터를 갖고 있는지 알 수 있게 한다.
// 커밋·태그·스토어 업로드는 직접 한다(마지막에 할 일을 알려 줌).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSchema } from "./check-schema.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkgPath = join(root, "package.json");
const histPath = join(root, "schema", "history.json");
const pkgText = readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(pkgText);
const arg = process.argv[2] || "patch";

function bump(v, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [a, b, c] = v.split(".").map(Number);
  if (kind === "major") return `${a + 1}.0.0`;
  if (kind === "minor") return `${a}.${b + 1}.0`;
  if (kind === "patch") return `${a}.${b}.${c + 1}`;
  console.error(`모르는 값: ${kind} (patch · minor · major · 1.2.3 중 하나)`);
  process.exit(1);
}
const newer = (x, y) => {
  const p = (v) => v.split(".").map(Number);
  const [a, b] = [p(x), p(y)];
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};

const from = pkg.version;
const to = bump(from, arg);
if (!newer(to, from)) {
  console.error(`새 버전(${to})이 지금 버전(${from})보다 커야 해요.`);
  process.exit(1);
}

console.log(`\n① 저장 데이터 검사`);
const check = await checkSchema();
if (!check.ok) {
  console.error(`\n저장 데이터 검사에 실패해서 ${to} 를 내지 않았어요. 위 내용을 고친 뒤 다시 pnpm release ${arg}`);
  process.exit(1);
}

const history = existsSync(histPath) ? JSON.parse(readFileSync(histPath, "utf8")) : [];
const lastSchema = history.at(-1)?.schemaVersion;
const histText = existsSync(histPath) ? readFileSync(histPath, "utf8") : null;

console.log(`\n② 버전 ${from} → ${to}`);
writeFileSync(pkgPath, pkgText.replace(`"version": "${from}"`, `"version": "${to}"`));
history.push({ appVersion: to, schemaVersion: check.schemaVersion, date: new Date().toISOString().slice(0, 10) });
writeFileSync(histPath, JSON.stringify(history, null, 2) + "\n");

console.log(`\n③ 빌드 · zip`);
const r = spawnSync("pnpm", ["zip"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
if (r.status !== 0) {
  // 실패하면 버전·기록을 되돌린다
  writeFileSync(pkgPath, pkgText);
  if (histText == null) writeFileSync(histPath, "[]\n");
  else writeFileSync(histPath, histText);
  console.error(`\n빌드에 실패해서 버전을 ${from} 로 되돌렸어요.`);
  process.exit(1);
}

const schemaNote =
  lastSchema == null || lastSchema === check.schemaVersion
    ? `저장 버전 ${check.schemaVersion} 그대로(예전 사용자 데이터 그대로 읽힘)`
    : `저장 버전 ${lastSchema} → ${check.schemaVersion}: 업데이트하면 사용자 데이터가 자동으로 마이그레이션돼요(고치기 전 모습은 백업)`;
console.log(`
완료: cursor-crew-${to}.zip
  · ${schemaNote}

남은 일
  1. 실제 크롬에서 확인: 예전 버전(${from})을 설치해 둔 상태에서 dist 를 다시 로드 → 펫·설정·메모가 그대로인지
  2. git add -A && git commit -m "release: ${to}" && git tag v${to}
  3. 크롬 웹 스토어 개발자 대시보드에 cursor-crew-${to}.zip 업로드
`);
