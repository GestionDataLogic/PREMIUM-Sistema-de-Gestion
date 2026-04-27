import { downloadSheet } from "./google-sheets";
import {
  parseJournal,
  parseStock,
  parseIdList,
  readInflation,
} from "./parsers";
import { generarPeriodos } from "./periods";
import type { CompanyData, UserConfig } from "./types";

interface CompanyCacheEntry {
  data: CompanyData;
  expiresAt: number;
}

const companyCache = new Map<string, CompanyCacheEntry>();

function companyKey(user: UserConfig): string {
  return `${user.sheetId}::${user.gidLd}::${user.gidStock}::${user.gidIds}`;
}

export function clearCompanyCache(user?: UserConfig): void {
  if (user) {
    companyCache.delete(companyKey(user));
  } else {
    companyCache.clear();
  }
}

export async function loadCompanyData(user: UserConfig): Promise<CompanyData> {
  const key = companyKey(user);
  const ttl = parseInt(process.env.SHEETS_CACHE_TTL ?? "300", 10) * 1_000;

  const cached = companyCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const [rawLd, rawStk, rawIds] = await Promise.all([
    downloadSheet(user.sheetId, user.gidLd),
    downloadSheet(user.sheetId, user.gidStock),
    downloadSheet(user.sheetId, user.gidIds),
  ]);

  const ld = parseJournal(rawLd);
  const { stock: stk, deudas: deudasCuotas } = parseStock(rawStk);
  const nombresCapa1 = parseIdList(rawIds);
  const inflacionPorMes = readInflation(rawIds);
  const periodos = generarPeriodos(ld);

  const data: CompanyData = {
    ld,
    stk,
    deudas_cuotas: deudasCuotas,
    nombres_capa1: nombresCapa1,
    inflacion_por_mes: inflacionPorMes,
    periodos,
  };

  companyCache.set(key, { data, expiresAt: Date.now() + ttl });
  return data;
}
