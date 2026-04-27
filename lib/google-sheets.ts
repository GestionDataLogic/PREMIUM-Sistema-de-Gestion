import Papa from "papaparse";


interface CacheEntry {
  data: string[][];
  expiresAt: number;
}

interface SheetRequest {
  sheetId: string;
  gid: string;
}


const sheetCache = new Map<string, CacheEntry>();

function getCacheTTL(): number {
  return parseInt(process.env.SHEETS_CACHE_TTL ?? "300", 10) * 1_000;
}

function cacheKey(sheetId: string, gid: string): string {
  return `${sheetId}::${gid}`;
}

function getFromCache(sheetId: string, gid: string): string[][] | null {
  const entry = sheetCache.get(cacheKey(sheetId, gid));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sheetCache.delete(cacheKey(sheetId, gid));
    return null;
  }
  return entry.data;
}

function setInCache(sheetId: string, gid: string, data: string[][]): void {
  sheetCache.set(cacheKey(sheetId, gid), {
    data,
    expiresAt: Date.now() + getCacheTTL(),
  });
}

export function clearCache(sheetId?: string, gid?: string): void {
  if (sheetId && gid) {
    sheetCache.delete(cacheKey(sheetId, gid));
  } else {
    sheetCache.clear();
  }
}


async function fetchViaCSV({ sheetId, gid }: SheetRequest): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  const res = await fetch(url, {
    headers: { Accept: "text/csv" },
    next: { revalidate: getCacheTTL() / 1_000 },
  });

  if (!res.ok) {
    throw new Error(
      `Google Sheets CSV export failed: ${res.status} ${res.statusText} — sheet ${sheetId}, gid ${gid}`
    );
  }

  const raw = await res.text();

  const parsed = Papa.parse<string[]>(raw, {
    skipEmptyLines: false,
    header: false,
  });

  return parsed.data as string[][];
}


async function fetchViaAPI({ sheetId, gid }: SheetRequest): Promise<string[][]> {
  // Import dinámico para no penalizar el build si no se usa
  const { google } = await import("googleapis");

  const credRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credRaw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no está definida.");
  }

  const credentials = JSON.parse(credRaw);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetsList = meta.data.sheets ?? [];
  const sheet = sheetsList.find(
    (s) => String(s.properties?.sheetId) === String(gid)
  );

  if (!sheet?.properties?.title) {
    throw new Error(`No se encontró la hoja con GID ${gid} en el sheet ${sheetId}.`);
  }

  const range = sheet.properties.title;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = response.data.values ?? [];
  // Normaliza a string[][]
  return rows.map((row) => row.map((cell) => String(cell ?? "")));
}

export async function downloadSheet(
  sheetId: string,
  gid: string
): Promise<string[][]> {
  const cached = getFromCache(sheetId, gid);
  if (cached) return cached;

  const useCSV =
    process.env.USE_PUBLIC_CSV_EXPORT === "true" ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  let data: string[][];

  if (useCSV) {
    data = await fetchViaCSV({ sheetId, gid });
  } else {
    try {
      data = await fetchViaAPI({ sheetId, gid });
    } catch (err) {
      console.warn(
        "[google-sheets] API falló, fallback a CSV export:",
        (err as Error).message
      );
      data = await fetchViaCSV({ sheetId, gid });
    }
  }

  setInCache(sheetId, gid, data);
  return data;
}


import type { UserConfig } from "./types";


export async function loadUsers(): Promise<Record<string, UserConfig>> {
  const sheetId = process.env.MASTER_SHEET_ID;
  const gid = process.env.MASTER_GID ?? "0";

  if (!sheetId) {
    throw new Error("MASTER_SHEET_ID no está definida en las variables de entorno.");
  }

  const rows = await downloadSheet(sheetId, gid);

  const users: Record<string, UserConfig> = {};

  for (const row of rows.slice(2)) {
    if (row.length < 9) continue;

    const [
      nombre,
      celular,
      empresa,
      usuario,
      claveRaw,
      sheetIdU,
      gidLd,
      gidStock,
      gidIds,
    ] = row.map((c) => c.trim().replace(/^["']|["']$/g, ""));

    const clave = claveRaw.replace(/^'/, "");

    if (!usuario || !clave) continue;

    users[usuario] = {
      nombre,
      celular,
      empresa,
      usuario,
      clave,
      sheetId: sheetIdU,
      gidLd,
      gidStock,
      gidIds,
    };
  }

  return users;
}
