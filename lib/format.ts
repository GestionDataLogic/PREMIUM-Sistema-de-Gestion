export function formatARS(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
    }
  }
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPct(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatPctPlain(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function deltaClass(value: number): string {
  if (value > 0) return "badge-green";
  if (value < 0) return "badge-red";
  return "badge-yellow";
}

export function numClass(value: number): string {
  if (value > 0) return "num-positive";
  if (value < 0) return "num-negative";
  return "num-neutral";
}

export function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatPeriodLabel(label: string): string {
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  if (/^\d{4}$/.test(label)) return `Año ${label}`;
  if (/^\d{4}-Q\d$/.test(label)) {
    const [y, q] = label.split("-Q");
    return `${y} T${q}`;
  }
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [y, m] = label.split("-");
    return `${monthNames[parseInt(m) - 1]} ${y}`;
  }
  return label;
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function alertBadgeClass(tipo: string | null): string {
  switch (tipo) {
    case "vencida": return "badge-red";
    case "3dias":   return "badge-red";
    case "7dias":   return "badge-yellow";
    default:        return "badge-blue";
  }
}

export function alertBadgeLabel(tipo: string | null, msg: string | null): string {
  if (msg) return msg;
  switch (tipo) {
    case "vencida": return "Vencida";
    case "3dias":   return "−3 días";
    case "7dias":   return "−7 días";
    default:        return "Pendiente";
  }
}

export function semaforoColor(roe: number, roic: number): string {
  const rv = roe >= 20; const ra = roe >= 12;
  const cv = roic >= 15; const ca = roic >= 8;
  if (rv && cv) return "#22c55e";
  if (rv && ca) return "#0ea5e9";
  if (ra && cv) return "#eab308";
  if (ra && ca) return "#eab308";
  return "#ef4444";
}
