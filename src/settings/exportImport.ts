const PREFIX = "comrade.";

export interface ExportBundle {
  app: "comrade";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function exportAll(): ExportBundle {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const raw = localStorage.getItem(k);
    if (raw == null) continue;
    try {
      data[k] = JSON.parse(raw);
    } catch {
      data[k] = raw;
    }
  }
  return {
    app: "comrade",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function downloadExport() {
  const bundle = exportAll();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = bundle.exportedAt.replace(/[:.]/g, "-");
  a.href = url;
  a.download = `comrade-export-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: boolean;
  imported: number;
  error?: string;
}

export function importAll(bundle: unknown, opts: { wipeExisting?: boolean } = {}): ImportResult {
  if (!bundle || typeof bundle !== "object") {
    return { ok: false, imported: 0, error: "Invalid bundle" };
  }
  const b = bundle as Partial<ExportBundle>;
  if (b.app !== "comrade" || !b.data || typeof b.data !== "object") {
    return { ok: false, imported: 0, error: "Not a Comrade export file" };
  }

  if (opts.wipeExisting) {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }

  let imported = 0;
  for (const [k, v] of Object.entries(b.data)) {
    if (!k.startsWith(PREFIX)) continue;
    const serialized = typeof v === "string" ? v : JSON.stringify(v);
    localStorage.setItem(k, serialized);
    imported++;
  }
  return { ok: true, imported };
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}
