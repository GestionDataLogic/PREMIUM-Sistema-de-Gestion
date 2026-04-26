"use client";

import { useState } from "react";
import { BarChart3, Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario || !clave) { setError("Ingresá usuario y contraseña"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, clave }),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        setError(data.error ?? "Credenciales incorrectas");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-base)", padding: "24px",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Glow blob */}
      <div style={{
        position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(79,142,247,0.08) 0%, transparent 70%)",
        zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }} className="fade-up">
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, var(--brand), #7cb3ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", boxShadow: "0 0 32px var(--brand-glow)",
          }}>
            <BarChart3 size={24} style={{ color: "#fff" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            DataLogic
          </h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
            Panel de análisis financiero
          </p>
        </div>

        {/* Form card */}
        <div className="card fade-up fade-up-2" style={{ padding: "32px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block", color: "var(--text-secondary)", fontSize: 12,
                fontWeight: 500, marginBottom: 8,
              }}>
                Usuario
              </label>
              <div style={{ position: "relative" }}>
                <User size={14} style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                }} />
                <input
                  type="text"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  placeholder="tu_usuario"
                  autoComplete="username"
                  style={{
                    width: "100%", padding: "10px 12px 10px 34px",
                    borderRadius: 10, border: "1px solid var(--border-default)",
                    background: "var(--bg-elevated)", color: "var(--text-primary)",
                    fontFamily: "DM Sans, sans-serif", fontSize: 14,
                    outline: "none", transition: "border-color 0.2s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--brand)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block", color: "var(--text-secondary)", fontSize: 12,
                fontWeight: 500, marginBottom: 8,
              }}>
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                }} />
                <input
                  type={showPw ? "text" : "password"}
                  value={clave}
                  onChange={e => setClave(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: "100%", padding: "10px 36px 10px 34px",
                    borderRadius: 10, border: "1px solid var(--border-default)",
                    background: "var(--bg-elevated)", color: "var(--text-primary)",
                    fontFamily: "DM Sans, sans-serif", fontSize: 14,
                    outline: "none", transition: "border-color 0.2s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--brand)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-tertiary)", padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                color: "var(--red)", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "11px",
                background: loading ? "var(--bg-hover)" : "var(--brand)",
                border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
                color: loading ? "var(--text-tertiary)" : "#fff",
                fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "Iniciando..." : (
                <>Ingresar <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: 11, marginTop: 24 }}>
          DataLogic · Sistema de Gestión Financiera
        </p>
      </div>
    </div>
  );
}
