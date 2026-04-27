"use client";

import { useState } from "react";
import {
  LayoutDashboard, BarChart3, Wallet, CircleDollarSign,
  CreditCard, Package, ArrowLeftRight, Bell, RefreshCw,
  LogOut, Menu,
} from "lucide-react";
import type { Period } from "@/lib/types";
import { formatPeriodLabel } from "@/lib/format";

export type TabId = "dashboard" | "resultados" | "patrimonio" | "flujo" | "deudas" | "stock" | "comparador";

export const NAV_ITEMS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { id: "resultados", label: "Resultados",    icon: BarChart3 },
  { id: "patrimonio", label: "Patrimonio",    icon: Wallet },
  { id: "flujo",      label: "Flujo de Caja", icon: CircleDollarSign },
  { id: "deudas",     label: "Deudas",        icon: CreditCard },
  { id: "stock",      label: "Stock",         icon: Package },
  { id: "comparador", label: "Comparador",    icon: ArrowLeftRight },
];

interface SidebarLayoutProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  periodLabel: string;
  onChangePeriod: (label: string) => void;
  periods: Period[];
  alertCount: number;
  userName: string;
  userEmpresa: string;
  onRefresh: () => void;
  children: React.ReactNode;
}

export function SidebarLayout({
  activeTab, onChangeTab,
  periodLabel, onChangePeriod, periods,
  alertCount, userName, userEmpresa,
  onRefresh, children,
}: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid var(--border-default)",
    background: "var(--bg-elevated)", color: "var(--text-primary)",
    fontFamily: "DM Sans, sans-serif", fontSize: 12, cursor: "pointer",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* ── Sidebar ── */}
      <aside
        className="sidebar-desktop"
        style={{
          width: "var(--sidebar-w)", flexShrink: 0,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40,
        }}
      >
        {/* Brand */}
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--brand), #7cb3ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px var(--brand-glow)",
            }}>
              <BarChart3 size={16} style={{ color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>DataLogic</div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Panel Financiero</div>
            </div>
          </div>
        </div>

        {/* Period */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Período Activo
          </div>
          <select value={periodLabel} onChange={(e) => onChangePeriod(e.target.value)} style={selectStyle}>
            {periods.map((p) => (
              <option key={p.label} value={p.label} style={{ background: "var(--bg-elevated)" }}>
                {formatPeriodLabel(p.label)}
              </option>
            ))}
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => { onChangeTab(id); setSidebarOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 10, marginBottom: 1,
                  background: active ? "var(--brand-dim)" : "transparent",
                  border: `1px solid ${active ? "var(--brand-glow)" : "transparent"}`,
                  color: active ? "var(--brand)" : "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s ease", textAlign: "left",
                }}
              >
                <Icon size={15} />
                <span>{label}</span>
                {id === "deudas" && alertCount > 0 && (
                  <span style={{
                    marginLeft: "auto", background: "var(--red)", color: "#fff",
                    borderRadius: "99px", fontSize: 10, fontWeight: 700, padding: "1px 7px",
                  }}>
                    {alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "var(--brand-dim)", border: "1px solid var(--brand-glow)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--brand)", fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userEmpresa}
              </div>
            </div>
            <button
              onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)" }}
              title="Salir"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 39, backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Main */}
      <main style={{ flex: 1, marginLeft: "var(--sidebar-w)", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Top bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "rgba(10,11,13,0.88)", backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0 28px", height: 58,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </h1>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {userEmpresa} · {formatPeriodLabel(periodLabel)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={onRefresh}
              title="Actualizar datos"
              style={{
                background: "none", border: "1px solid var(--border-subtle)", borderRadius: 8,
                padding: "6px 10px", cursor: "pointer", color: "var(--text-secondary)",
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "inherit",
              }}
            >
              <RefreshCw size={13} />
            </button>
            <div style={{ position: "relative" }}>
              <button style={{
                background: "none", border: "1px solid var(--border-subtle)", borderRadius: 8,
                padding: "6px 8px", cursor: "pointer", color: "var(--text-secondary)",
                display: "flex", alignItems: "center",
              }}>
                <Bell size={14} />
              </button>
              {alertCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: "var(--red)", color: "#fff",
                  width: 16, height: 16, borderRadius: "50%",
                  fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid var(--bg-base)",
                }}>
                  {alertCount}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: "26px 28px", flex: 1 }}>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav" style={{
        display: "none",
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        zIndex: 50, padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
      }}>
        {NAV_ITEMS.slice(0, 5).map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onChangeTab(id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                background: "none", border: "none", cursor: "pointer", padding: "5px 0",
                color: active ? "var(--brand)" : "var(--text-tertiary)",
                fontFamily: "inherit", fontSize: 9, fontWeight: active ? 600 : 400,
                transition: "color 0.15s",
              }}
            >
              <div style={{ position: "relative" }}>
                <Icon size={19} />
                {id === "deudas" && alertCount > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -6,
                    background: "var(--red)", color: "#fff",
                    width: 13, height: 13, borderRadius: "50%",
                    fontSize: 8, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {alertCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          main { margin-left: 0 !important; padding-bottom: 68px; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
        }
        @media (max-width: 640px) {
          .grid-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
