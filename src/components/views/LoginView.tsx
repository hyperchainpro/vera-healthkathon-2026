/**
 * VERA Login View — BPJS-style branding
 */

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Activity, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export function LoginView() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("admin@bpjs.go.id");
  const [password, setPassword] = useState("vera2026");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="min-h-screen bg-[#0F2A5C] flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-sky-500/10 to-transparent" />

      <div className="relative z-10 w-full max-w-md px-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur mb-4">
            <Activity className="w-9 h-9 text-sky-400" />
          </div>
          <h1 className="font-serif text-5xl font-black text-white tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>
            VERA
          </h1>
          <p className="text-sm text-white/60 mt-2 uppercase tracking-widest">
            Validasi Episode &amp; Recovery Anomaly
          </p>
          <p className="text-xs text-white/40 mt-1 italic">
            "Membaca Kurva Biologis, Membongkar Waktu Fiktif."
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5 block">
              Email Reviewer BPJS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-sky-400"
              placeholder="reviewer@bpjs.go.id"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError(); }}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-sky-400"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-200">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi...</>
            ) : (
              <>Masuk ke Dashboard</>
            )}
          </button>

          {/* Demo credentials */}
          <div className="pt-4 border-t border-white/10">
            <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Akun Demo Healthkathon</span>
              <span className="text-[9px] text-white/40">Klik untuk pilih</span>
            </div>
            <div className="space-y-1.5">
              {[
                { name: "dr. Hendra Pratama, Sp.PK", email: "admin@bpjs.go.id", role: "Administrator" },
                { name: "dr. Maya Safitri, Sp.S", email: "supervisor@bpjs.go.id", role: "Supervisor" },
                { name: "Andi Wicaksono, S.Kep., Ners", email: "reviewer@bpjs.go.id", role: "Verifikator" },
                { name: "dr. Budi Setiawan, Sp.P", email: "medofficer@bpjs.go.id", role: "Medical Officer" },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("vera2026");
                    clearError();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-left"
                >
                  <div>
                    <div className="text-xs font-semibold text-white/90">{acc.name}</div>
                    <div className="text-[10px] text-sky-300 font-mono">{acc.email}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-medium">
                    {acc.role}
                  </span>
                </button>
              ))}
              <div className="text-[10px] text-white/40 pt-1 text-center font-mono">
                Password default: <span className="text-white/80 font-bold">vera2026</span>
              </div>
            </div>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-[10px] text-white/40">
            © 2026 BPJS Kesehatan · Healthkathon 2026 · Tim VERA
          </p>
        </div>
      </div>
    </div>
  );
}
