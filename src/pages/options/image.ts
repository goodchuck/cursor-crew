// 올린 이미지를 저장할 data URL 로 만든다.
// 움직이는 이미지(GIF·움직이는 WebP·APNG)는 원본 그대로 둬야 움직임이 남는다.
// 정지 이미지는 128px보다 크면 줄여서 PNG 로 만든다.
import { MAX_IMAGE_BYTES } from "@src/shared/settings";

function findAscii(bytes: Uint8Array, text: string, limit?: number): number {
  const t = [...text].map((c) => c.charCodeAt(0));
  const end = Math.min(bytes.length, limit ?? bytes.length) - t.length;
  outer: for (let i = 0; i <= end; i++) {
    for (let j = 0; j < t.length; j++) if (bytes[i + j] !== t[j]) continue outer;
    return i;
  }
  return -1;
}

export function isAnimated(type: string, bytes: Uint8Array): boolean {
  if (type === "image/gif") return true; // GIF 는 늘 원본 그대로(정지 GIF 도 손해 없음)
  if (type === "image/webp") return findAscii(bytes, "ANIM", 4096) >= 0;
  if (type === "image/png" || type === "image/apng") {
    const idat = findAscii(bytes, "IDAT");
    return findAscii(bytes, "acTL", idat > 0 ? idat : undefined) >= 0;
  }
  return false;
}

const readAs = <K extends "readAsArrayBuffer" | "readAsDataURL">(file: File, how: K) =>
  new Promise<K extends "readAsArrayBuffer" ? ArrayBuffer : string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as never);
    r.onerror = () => rej(r.error);
    r[how](file);
  });

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("unreadable"));
    img.src = url;
  });
}

export type PrepareResult =
  | { ok: true; url: string; width: number; height: number; animated: boolean }
  | { ok: false; reason: "notImage" | "tooBig" | "unreadable"; mb?: string };

export async function prepareImage(file: File): Promise<PrepareResult> {
  if (!/^image\//.test(file.type)) return { ok: false, reason: "notImage" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: "tooBig", mb: (file.size / 1048576).toFixed(1) };
  try {
    const bytes = new Uint8Array(await readAs(file, "readAsArrayBuffer"));
    let url = await readAs(file, "readAsDataURL");
    const img = await loadImg(url);
    const animated = isAnimated(file.type, bytes);
    if (!animated && Math.max(img.width, img.height) > 128) {
      const k = 128 / Math.max(img.width, img.height);
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
      url = cv.toDataURL("image/png");
    }
    return { ok: true, url, width: img.width, height: img.height, animated };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
