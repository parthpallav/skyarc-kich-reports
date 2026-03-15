import React, { useState, useRef } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarRange,
  Eye,
  FileText,
  ShieldCheck,
  Users,
  Info,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// --- Analytics Quotes (shuffle by month + client seed) ---
// Each export gets a fresh quote — rotates across months and clients.
const ANALYTICS_QUOTES = [
  { text: "Data doesn't lie. It just waits for the right billboard to confess.", author: "Skyarc" },
  { text: "Every impression is a conversation your brand started — make it count.", author: "Skyarc" },
  { text: "Reach is a number. Resonance is a feeling. We chase both.", author: "Skyarc" },
  { text: "The best campaigns don't interrupt people — they become part of the scenery.", author: "Skyarc" },
  { text: "Frequency builds familiarity. Familiarity builds trust. Trust builds business.", author: "Skyarc" },
  { text: "Your audience moves. Your message should too.", author: "Skyarc" },
  { text: "Visibility is rented. Recognition is earned.", author: "Skyarc" },
  { text: "In a city of a million billboards, the one they remember is yours.", author: "Skyarc" },
  { text: "OTS measures eyeballs. We measure moments.", author: "Skyarc" },
  { text: "Numbers tell you what happened. Insights tell you why it mattered.", author: "Skyarc" },
  { text: "The street never sleeps — neither does your brand.", author: "Skyarc" },
  { text: "Good creative gets seen. Great creative gets remembered. Ours gets both.", author: "Skyarc" },
  { text: "A billboard seen a thousand times becomes a landmark. That's your brand.", author: "Skyarc" },
  { text: "The spotlight doesn't find you. You build it — one impression at a time.", author: "Skyarc" },
  { text: "Not every eye that passes is a customer. But every customer once passed your screen.", author: "Skyarc" },
  { text: "Outdoor advertising doesn't interrupt the journey. It is the journey.", author: "Skyarc" },
  { text: "Your competitor bought a click. You bought a moment in someone's day.", author: "Skyarc" },
  { text: "Data is the map. The billboard is the destination.", author: "Skyarc" },
];

const getQuote = (month, clientKey = "c1") => {
  const monthOrder = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
  const monthIndex = monthOrder.indexOf(month ?? monthOrder[0]);
  const idx = monthIndex < 0 ? 0 : monthIndex;
  // Use charCode of last char of clientKey as additional seed so each client sees a different quote
  const charSeed = clientKey ? clientKey.charCodeAt(clientKey.length - 1) : 0;
  return ANALYTICS_QUOTES[(idx + charSeed) % ANALYTICS_QUOTES.length];
};

// --- Configuration & Theme ---
const theme = {
  bg: "#06040E",
  bgSoft: "#0B0915",
  panel: "#11101C",
  border: "rgba(166, 78, 241, 0.16)",
  borderStrong: "rgba(166, 78, 241, 0.28)",
  primary: "#A64EF1",
  primarySoft: "rgba(166, 78, 241, 0.16)",
  primaryGlow: "rgba(166, 78, 241, 0.34)",
  primary2: "#C084FC",
  text: "#F8F8FA",
  textSoft: "rgba(248,248,250,0.72)",
  textMuted: "rgba(248,248,250,0.48)",
  success: "#4ADE80",
  info: "#60A5FA",
  warning: "#F59E0B",
  danger: "#F87171",
};

const client = { id: "c1", brand: "KICH", username: "kich_skyarc", slots: 2, screens: ["KICH_TOP", "KICH_BOTTOM"] };
const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];

// --- Mock Data Generator ---
function generateKichData() {
  return months.map((month) => {
    const daysInMonth = ["2025-11"].includes(month) ? 30 : month === "2026-02" ? 28 : 31;

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      let raw = 0;
      let otsMultiplier = 65;
      let ltsMultiplier = 0.55;
      const dayNum = i + 1;

      if (month === "2026-01") {
        raw = 1794;
        if (i === 0) raw = 1794;
        if (i === 1) raw = 1803;
        if (i > 1 && i <= 19) raw += 1;
        otsMultiplier = 66;
        ltsMultiplier = 0.55;
      } else if (month === "2026-02") {
        raw = Math.round(1810 + Math.sin(i) * 15);
        otsMultiplier = 70;
        ltsMultiplier = 0.58;
      } else if (["2025-10", "2025-11", "2025-12"].includes(month)) {
        raw = Math.round(1490 + Math.sin(i * 0.5) * 25);
        if (month === "2025-10") { otsMultiplier = 65; ltsMultiplier = 0.55; }
        if (month === "2025-11") { otsMultiplier = 72; ltsMultiplier = 0.58; }
        if (month === "2025-12") { otsMultiplier = 66; ltsMultiplier = 0.56; }
      }

      const ots = Math.round(raw * otsMultiplier);
      const lts = Math.round(ots * ltsMultiplier);
      const delivered = Math.round(lts / 12);

      return { day: String(dayNum).padStart(2, "0"), label: String(dayNum), raw, ots, lts, delivered };
    });

    const totalRaw = days.reduce((sum, d) => sum + d.raw, 0);
    const totalOts = days.reduce((sum, d) => sum + d.ots, 0);
    const totalLts = days.reduce((sum, d) => sum + d.lts, 0);
    const totalDelivered = days.reduce((sum, d) => sum + d.delivered, 0);

    return { month, days, totalRaw, totalOts, totalLts, totalDelivered, playsVerified: totalRaw };
  });
}

const reportMap = { c1: generateKichData() };

// --- Utilities ---
function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}
function fmtFull(n) { return new Intl.NumberFormat("en-IN").format(n); }
function monthLabel(value) {
  const [y, m] = value.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[Number(m) - 1]} ${y}`;
}
function getShortMonthName(value) {
  const m = parseInt(value.split("-")[1], 10);
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1];
}

// CSV Exporter
const handleExportData = (data, filename) => {
  const headers = ["Day", "Log Date", "Raw Plays", "Gross OTS", "True LTS", "Delivered Reach"];
  const rows = data.map(row => `${row.day},${row.label},${row.raw},${row.ots},${row.lts},${row.delivered}`);
  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// PDF Exporter — each section becomes one page sized exactly to its content (no whitespace, no cropping)
const handleExportPDF = async (pdfRef, month) => {
  const el = pdfRef.current;
  if (!el) return;

  el.style.display = "block";
  await new Promise(r => setTimeout(r, 900));

  const sections = Array.from(el.querySelectorAll("[data-pdf-section]"));

  // Capture all canvases first
  const canvases = [];
  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: theme.bg,
      logging: false,
      imageTimeout: 0,
    });
    canvases.push(canvas);
  }

  // Use pt units — jsPDF is most reliable with pt
  // 1 px (at scale 2) → divide by 2 to get CSS px → convert to pt (1 CSS px = 0.75 pt)
  const pxToPt = (px) => (px / 2) * 0.75;

  const firstW = pxToPt(canvases[0].width);
  const firstH = pxToPt(canvases[0].height);

  const pdf = new jsPDF({
    orientation: firstH >= firstW ? "portrait" : "landscape",
    unit: "pt",
    format: [firstW, firstH],
  });

  pdf.addImage(canvases[0].toDataURL("image/png"), "PNG", 0, 0, firstW, firstH);

  for (let i = 1; i < canvases.length; i++) {
    const w = pxToPt(canvases[i].width);
    const h = pxToPt(canvases[i].height);
    pdf.addPage([w, h]);
    pdf.addImage(canvases[i].toDataURL("image/png"), "PNG", 0, 0, w, h);
  }

  el.style.display = "none";
  pdf.save(`Skyarc_${client.brand}_Report_${monthLabel(month).replace(" ", "_")}.pdf`);
};

// --- Shared Components ---
function GlassCard({ children, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`,
        border: `1px solid ${theme.borderStrong}`,
        borderRadius: "1.25rem",
        boxShadow: `0 0 0 1px rgba(255,255,255,0.02) inset, 0 10px 30px rgba(0,0,0,0.35)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = theme.primary }) {
  return (
    <GlassCard style={{ padding: "1.25rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at top right, ${accent}22, transparent 42%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ color: theme.textMuted, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</div>
          <div style={{ color: theme.text, fontSize: "1.875rem", fontWeight: 800, lineHeight: 1.1, marginTop: "0.625rem" }}>{value}</div>
          <div style={{ color: theme.textSoft, fontSize: "0.75rem", marginTop: "0.5rem" }}>{sub}</div>
        </div>
        <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", background: `${accent}1f`, border: `1px solid ${accent}44`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={20} />
        </div>
      </div>
    </GlassCard>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", background: theme.primarySoft, border: `0.0625rem solid ${theme.borderStrong}`, color: theme.primary2 }}>
            <Icon size={18} />
          </div>
          <h2 style={{ color: theme.text, fontSize: "1.5rem", fontWeight: 800 }}>{title}</h2>
        </div>
        <p style={{ color: theme.textSoft, fontSize: "0.875rem", marginTop: "0.5rem" }}>{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function MiniLegend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ width: "0.625rem", height: "0.625rem", borderRadius: "99.9rem", background: color, boxShadow: `0 0 1rem ${color}55` }} />
      <span style={{ color: theme.textSoft, fontSize: "0.75rem" }}>{label}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(8,6,16,0.96)", border: `0.0625rem solid ${theme.borderStrong}`, borderRadius: "0.875rem", padding: "0.875rem 1rem", boxShadow: `0 0.75rem 1.875rem rgba(0,0,0,0.35)` }}>
      <div style={{ color: theme.text, fontWeight: 700, fontSize: "0.8125rem", marginBottom: "0.625rem" }}>Day {label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-8 mb-1 last:mb-0" style={{ fontSize: "0.75rem" }}>
          <span style={{ color: item.color }}>{item.name}</span>
          <span style={{ color: theme.text, fontWeight: 700 }}>{fmtFull(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function InfoTooltip({ content }) {
  return (
    <div className="relative group flex items-center cursor-help ml-2.5">
      <Info size={18} style={{ color: theme.textMuted }} className="transition-colors group-hover:text-white" />
      <div
        className="absolute bottom-full left-0 md:left-1/2 md:-translate-x-1/2 mb-3 w-72 p-4 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-50 shadow-2xl"
        style={{ background: "rgba(17,16,28,0.95)", border: `0.0625rem solid ${theme.borderStrong}`, color: theme.textSoft, fontSize: "0.8125rem", lineHeight: 1.6, backdropFilter: "blur(12px)" }}
      >
        {content}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF REPORT COMPONENT — hidden off-screen, renders ALL sections simultaneously
// ─────────────────────────────────────────────────────────────────────────────
function PdfReport({ month, pdfRef }) {
  const report = reportMap.c1.find((item) => item.month === month) || reportMap.c1[0];
  const previous = reportMap.c1.find((item) => item.month === months[months.indexOf(month) - 1]);
  const growth = previous ? (((report.totalDelivered - previous.totalDelivered) / previous.totalDelivered) * 100).toFixed(1) : null;
  const historicalBars = reportMap.c1.map((r) => ({ label: monthLabel(r.month), OTS: r.totalOts, LTS: r.totalLts }));

  const sectionHead = (title, sub) => (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ color: theme.text, fontWeight: 800, fontSize: "1.25rem" }}>{title}</div>
      {sub && <div style={{ color: theme.textSoft, fontSize: "0.875rem", marginTop: "0.375rem" }}>{sub}</div>}
    </div>
  );

  return (
    <div
      ref={pdfRef}
      style={{
        display: "none",
        position: "fixed",
        top: 0,
        left: "-9999px",
        width: "1200px",
        background: "transparent",
        color: theme.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          PAGE 1 — Cover + KPI Summary + Daily Exposure Trend
      ══════════════════════════════════════════════════════════════ */}
      <div
        data-pdf-section
        style={{
          width: "1200px",
          background: theme.bg,
          padding: "48px",
          boxSizing: "border-box",
        }}
      >
        {/* Cover Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px", paddingBottom: "28px", borderBottom: `1px solid ${theme.borderStrong}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <img
              src="/skyarc_logo_white.png"
              alt="Skyarc"
              style={{ height: "56px", objectFit: "contain" }}
              crossOrigin="anonymous"
            />
            <div style={{ width: "1px", height: "40px", background: theme.borderStrong }} />
            <div>
              <div style={{ color: theme.text, fontSize: "1.5rem", fontWeight: 800 }}>{client.brand} Campaign Report</div>
              <div style={{ color: theme.textSoft, fontSize: "0.875rem", marginTop: "4px" }}>{monthLabel(month)} · OOH Performance Intelligence</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: theme.textMuted, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Generated</div>
            <div style={{ color: theme.textSoft, fontSize: "0.9375rem", fontWeight: 600, marginTop: "4px" }}>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
            <div style={{ color: theme.textMuted, fontSize: "0.75rem", marginTop: "2px" }}>Skyarc Analytics Platform</div>
          </div>
        </div>

        {/* Section 1: KPI Cards */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>01 · KPI SUMMARY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {[
              { label: "Gross OTS", value: fmt(report.totalOts), sub: "Total vehicular/pedestrian flow", accent: theme.info, Icon: Users },
              { label: "True LTS", value: fmt(report.totalLts), sub: "Visibility-adjusted exposure", accent: theme.primary2, Icon: Eye },
              { label: "Delivered Reach", value: fmt(report.totalDelivered), sub: growth ? `${growth}% vs previous month` : "1/12 loop time-share applied", accent: theme.primary, Icon: Activity },
              { label: "Verified Plays", value: fmtFull(report.playsVerified), sub: "Raw machine logs (PoP)", accent: theme.success, Icon: ShieldCheck },
            ].map(({ label, value, sub, accent }) => (
              <div key={label} style={{ background: `linear-gradient(135deg, ${accent}14, rgba(255,255,255,0.02))`, border: `1px solid ${accent}33`, borderRadius: "1rem", padding: "1.25rem" }}>
                <div style={{ color: theme.textMuted, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</div>
                <div style={{ color: accent, fontSize: "2rem", fontWeight: 800, lineHeight: 1.1, margin: "10px 0 6px" }}>{value}</div>
                <div style={{ color: theme.textSoft, fontSize: "0.75rem" }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Daily Exposure Trend — fixed pixel size for reliable capture */}
        <div>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>02 · DAILY EXPOSURE TREND</div>
          <GlassCard style={{ padding: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              {sectionHead("Daily Exposure Trend", "OTS and LTS movement through the month")}
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                <MiniLegend color={theme.info} label="Gross OTS" />
                <MiniLegend color={theme.primary2} label="True LTS" />
              </div>
            </div>
            {/* Fixed width/height — no ResponsiveContainer so chart always renders off-screen */}
            <AreaChart width={1072} height={340} data={report.days} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="pdf-otsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.info} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={theme.info} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="pdf-ltsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.primary2} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={theme.primary2} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: theme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
              <YAxis tick={{ fill: theme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={52} />
              <Area type="monotone" dataKey="ots" name="Gross OTS" stroke={theme.info} fill="url(#pdf-otsFill)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="lts" name="True LTS" stroke={theme.primary2} fill="url(#pdf-ltsFill)" strokeWidth={2.5} />
            </AreaChart>
          </GlassCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 2 — Exposure Funnel + Historical Performance Trend
      ══════════════════════════════════════════════════════════════ */}
      <div
        data-pdf-section
        style={{
          width: "1200px",
          background: theme.bg,
          padding: "48px",
          boxSizing: "border-box",
        }}
      >
        {/* Page header repeat */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px", paddingBottom: "20px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src="/skyarc_logo_white.png" alt="Skyarc" style={{ height: "40px", objectFit: "contain" }} crossOrigin="anonymous" />
            <div style={{ width: "1px", height: "28px", background: theme.border }} />
            <div style={{ color: theme.textMuted, fontSize: "0.8125rem" }}>{client.brand} Campaign Report · {monthLabel(month)}</div>
          </div>
          <div style={{ color: theme.textMuted, fontSize: "0.75rem" }}>Page 2</div>
        </div>

        {/* Section 3: Exposure Funnel */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>03 · MONTHLY EXPOSURE MODEL</div>
          <GlassCard style={{ padding: "2rem" }}>
            {sectionHead("Monthly Exposure Funnel", "Skyarc OOH reporting logic — from Gross Opportunities to Delivered Reach")}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
              {[
                { label: "Gross Opportunities (OTS)", value: report.totalOts, color: theme.info, pct: 100 },
                { label: "Visibility-Adjusted (LTS)", value: report.totalLts, color: theme.primary2, pct: Math.round((report.totalLts / report.totalOts) * 100) },
                { label: "Delivered (10s Slot Time-Share)", value: report.totalDelivered, color: theme.primary, pct: Math.round((report.totalDelivered / report.totalOts) * 100) },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: theme.textSoft, fontSize: "0.9375rem", fontWeight: 500 }}>{item.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ color: theme.textMuted, fontSize: "0.8125rem" }}>{item.pct}%</span>
                      <span style={{ color: item.color, fontWeight: 800, fontSize: "1rem" }}>{fmtFull(item.value)}</span>
                    </div>
                  </div>
                  <div style={{ height: "14px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, boxShadow: `0 0 20px ${item.color}66` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Section 4: Historical Line Chart — fixed pixel size */}
        <div>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>04 · HISTORICAL PERFORMANCE TREND</div>
          <GlassCard style={{ padding: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              {sectionHead("Historical Performance Trend", "Exposure comparison from Oct '25 to Feb '26")}
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                <MiniLegend color={theme.info} label="Gross OTS" />
                <MiniLegend color={theme.primary2} label="True LTS" />
              </div>
            </div>
            <LineChart width={1072} height={320} data={historicalBars} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: theme.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} dy={12} />
              <YAxis tick={{ fill: theme.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={52} />
              <Line type="monotone" dataKey="OTS" name="Gross OTS" stroke={theme.info} strokeWidth={3} dot={{ r: 5, fill: theme.bg, stroke: theme.info, strokeWidth: 2 }} activeDot={{ r: 8, fill: theme.info }} />
              <Line type="monotone" dataKey="LTS" name="True LTS" stroke={theme.primary2} strokeWidth={4} dot={{ r: 6, fill: theme.bg, stroke: theme.primary2, strokeWidth: 2 }} activeDot={{ r: 9, fill: theme.primary2 }} />
            </LineChart>
          </GlassCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 3 — PoP Summary + Daily Log (rows 1–12)
      ══════════════════════════════════════════════════════════════ */}
      <div
        data-pdf-section
        style={{ width: "1200px", background: theme.bg, padding: "48px", boxSizing: "border-box" }}
      >
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px", paddingBottom: "20px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src="/skyarc_logo_white.png" alt="Skyarc" style={{ height: "40px", objectFit: "contain" }} crossOrigin="anonymous" />
            <div style={{ width: "1px", height: "28px", background: theme.border }} />
            <div style={{ color: theme.textMuted, fontSize: "0.8125rem" }}>{client.brand} Campaign Report · {monthLabel(month)}</div>
          </div>
          <div style={{ color: theme.textMuted, fontSize: "0.75rem" }}>Page 3</div>
        </div>

        {/* Section 5: PoP Summary */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>05 · PROOF OF PLAY SUMMARY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { label: "Total Plays Verified", value: fmtFull(report.playsVerified), Icon: ShieldCheck, accent: theme.primary },
              { label: "Active Screen Slots", value: String(client.slots), Icon: Building2, accent: theme.primary2 },
              { label: "Offline / Missing Days", value: "0", Icon: Activity, accent: theme.success },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${item.accent}33`, borderRadius: "1rem", padding: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ color: theme.textSoft, fontSize: "0.875rem", fontWeight: 500 }}>{item.label}</div>
                  <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", background: `${item.accent}1d`, color: item.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <item.Icon size={18} />
                  </div>
                </div>
                <div style={{ color: item.accent, fontWeight: 800, fontSize: "2rem" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6a: Daily Log — rows 1–12 */}
        <div>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>06 · DAILY LOG BREAKDOWN</div>
          <GlassCard style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1.5rem 2rem", borderBottom: `1px solid ${theme.borderStrong}` }}>
              <div style={{ color: theme.text, fontWeight: 800, fontSize: "1.125rem" }}>Daily Log Breakdown</div>
              <div style={{ color: theme.textSoft, fontSize: "0.8125rem", marginTop: "4px" }}>Granular campaign exposure — raw server logs for {monthLabel(month)} · Days 1–12</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme.panel }}>
                  {["Log Date", "Raw Count", "Gross OTS", "True LTS", "Delivered Reach", "Network Status"].map((h) => (
                    <th key={h} style={{ color: theme.textMuted, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, padding: "1rem 1.5rem", textAlign: "left", borderBottom: `1px solid ${theme.borderStrong}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.days.slice(0, 12).map((row, index) => (
                  <tr key={row.day} style={{ background: index % 2 ? "rgba(255,255,255,0.015)" : "transparent", borderTop: index === 0 ? "none" : `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ color: theme.textSoft, padding: "0.875rem 1.5rem", fontSize: "0.875rem" }}>{getShortMonthName(month)} {row.day}, {month.split("-")[0]}</td>
                    <td style={{ color: theme.text, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.raw)}</td>
                    <td style={{ color: theme.info, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.ots)}</td>
                    <td style={{ color: theme.primary2, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.lts)}</td>
                    <td style={{ color: theme.primary, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.delivered)}</td>
                    <td style={{ padding: "0.875rem 1.5rem" }}>
                      <span style={{ background: "rgba(74,222,128,0.1)", color: theme.success, border: "1px solid rgba(74,222,128,0.2)", borderRadius: "999px", padding: "4px 14px", fontSize: "0.75rem", fontWeight: 700 }}>Delivered</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 4 — Daily Log (rows 13–24)
      ══════════════════════════════════════════════════════════════ */}
      <div
        data-pdf-section
        style={{ width: "1200px", background: theme.bg, padding: "48px", boxSizing: "border-box" }}
      >
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px", paddingBottom: "20px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src="/skyarc_logo_white.png" alt="Skyarc" style={{ height: "40px", objectFit: "contain" }} crossOrigin="anonymous" />
            <div style={{ width: "1px", height: "28px", background: theme.border }} />
            <div style={{ color: theme.textMuted, fontSize: "0.8125rem" }}>{client.brand} Campaign Report · {monthLabel(month)}</div>
          </div>
          <div style={{ color: theme.textMuted, fontSize: "0.75rem" }}>Page 4</div>
        </div>

        {/* Section 6b: Daily Log — rows 13–24 */}
        <div>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>06 · DAILY LOG BREAKDOWN (continued)</div>
          <GlassCard style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 2rem", borderBottom: `1px solid ${theme.borderStrong}` }}>
              <div style={{ color: theme.textSoft, fontSize: "0.8125rem" }}>Days 13–24 · {monthLabel(month)}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme.panel }}>
                  {["Log Date", "Raw Count", "Gross OTS", "True LTS", "Delivered Reach", "Network Status"].map((h) => (
                    <th key={h} style={{ color: theme.textMuted, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, padding: "1rem 1.5rem", textAlign: "left", borderBottom: `1px solid ${theme.borderStrong}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.days.slice(12, 24).map((row, index) => (
                  <tr key={row.day} style={{ background: index % 2 ? "rgba(255,255,255,0.015)" : "transparent", borderTop: index === 0 ? "none" : `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ color: theme.textSoft, padding: "0.875rem 1.5rem", fontSize: "0.875rem" }}>{getShortMonthName(month)} {row.day}, {month.split("-")[0]}</td>
                    <td style={{ color: theme.text, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.raw)}</td>
                    <td style={{ color: theme.info, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.ots)}</td>
                    <td style={{ color: theme.primary2, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.lts)}</td>
                    <td style={{ color: theme.primary, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.delivered)}</td>
                    <td style={{ padding: "0.875rem 1.5rem" }}>
                      <span style={{ background: "rgba(74,222,128,0.1)", color: theme.success, border: "1px solid rgba(74,222,128,0.2)", borderRadius: "999px", padding: "4px 14px", fontSize: "0.75rem", fontWeight: 700 }}>Delivered</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 5 — Daily Log (rows 25–end)
      ══════════════════════════════════════════════════════════════ */}
      <div
        data-pdf-section
        style={{ width: "1200px", background: theme.bg, padding: "48px", boxSizing: "border-box" }}
      >
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px", paddingBottom: "20px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src="/skyarc_logo_white.png" alt="Skyarc" style={{ height: "40px", objectFit: "contain" }} crossOrigin="anonymous" />
            <div style={{ width: "1px", height: "28px", background: theme.border }} />
            <div style={{ color: theme.textMuted, fontSize: "0.8125rem" }}>{client.brand} Campaign Report · {monthLabel(month)}</div>
          </div>
          <div style={{ color: theme.textMuted, fontSize: "0.75rem" }}>Page 5</div>
        </div>

        {/* Section 6c: Daily Log — rows 25–end */}
        <div>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>06 · DAILY LOG BREAKDOWN (continued)</div>
          <GlassCard style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 2rem", borderBottom: `1px solid ${theme.borderStrong}` }}>
              <div style={{ color: theme.textSoft, fontSize: "0.8125rem" }}>Days 25–{report.days.length} · {monthLabel(month)}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme.panel }}>
                  {["Log Date", "Raw Count", "Gross OTS", "True LTS", "Delivered Reach", "Network Status"].map((h) => (
                    <th key={h} style={{ color: theme.textMuted, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, padding: "1rem 1.5rem", textAlign: "left", borderBottom: `1px solid ${theme.borderStrong}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.days.slice(24).map((row, index) => (
                  <tr key={row.day} style={{ background: index % 2 ? "rgba(255,255,255,0.015)" : "transparent", borderTop: index === 0 ? "none" : `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ color: theme.textSoft, padding: "0.875rem 1.5rem", fontSize: "0.875rem" }}>{getShortMonthName(month)} {row.day}, {month.split("-")[0]}</td>
                    <td style={{ color: theme.text, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.raw)}</td>
                    <td style={{ color: theme.info, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.ots)}</td>
                    <td style={{ color: theme.primary2, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.lts)}</td>
                    <td style={{ color: theme.primary, padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 700 }}>{fmtFull(row.delivered)}</td>
                    <td style={{ padding: "0.875rem 1.5rem" }}>
                      <span style={{ background: "rgba(74,222,128,0.1)", color: theme.success, border: "1px solid rgba(74,222,128,0.2)", borderRadius: "999px", padding: "4px 14px", fontSize: "0.75rem", fontWeight: 700 }}>Delivered</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Footer watermark */}
            <div style={{ padding: "1.25rem 2rem", borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: theme.textMuted, fontSize: "0.75rem" }}>Confidential · {client.brand} · {monthLabel(month)} Report</div>
              <div style={{ color: theme.textMuted, fontSize: "0.75rem" }}>Powered by Skyarc Analytics</div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 6 — Methodology, Disclaimer & Closing
      ══════════════════════════════════════════════════════════════ */}
      <div
        data-pdf-section
        style={{
          width: "1200px",
          background: theme.bg,
          padding: "48px",
          boxSizing: "border-box",
        }}
      >
        {/* Page header repeat */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "36px", paddingBottom: "20px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src="/skyarc_logo_white.png" alt="Skyarc" style={{ height: "40px", objectFit: "contain" }} crossOrigin="anonymous" />
            <div style={{ width: "1px", height: "28px", background: theme.border }} />
            <div style={{ color: theme.textMuted, fontSize: "0.8125rem" }}>{client.brand} Campaign Report · {monthLabel(month)}</div>
          </div>
          <div style={{ color: theme.textMuted, fontSize: "0.75rem" }}>Page 6</div>
        </div>

        {/* Methodology Summary */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>07 · MEASUREMENT METHODOLOGY</div>
          <GlassCard style={{ padding: "2rem" }}>
            <div style={{ color: theme.text, fontWeight: 800, fontSize: "1.125rem", marginBottom: "6px" }}>How We Measure — OOH Industry Standards</div>
            <div style={{ color: theme.textSoft, fontSize: "0.8rem", marginBottom: "24px" }}>All metrics in this report are derived from globally recognised Out-of-Home advertising measurement frameworks, including guidelines published by the Indian Outdoor Advertising Association (IOAA), the World Out of Home Organization (WOO) Global Guidelines on Out-of-Home Audience Measurement (2022), ESOMAR, and the Outdoor Advertising Association of America (OAAA), alongside academic research in traffic flow modelling and visual attention studies.</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {[
                {
                  term: "Gross OTS (Opportunities to See)",
                  color: theme.info,
                  body: "Represents the total number of individuals — vehicular and pedestrian — who pass within the measurable visibility zone of the display during the campaign period. Derived from location-specific traffic count data and extrapolated using industry-standard daily traffic flow coefficients. Methodology consistent with IOAA (Indian Outdoor Advertising Association) practices and OAAA OOH Impression Measurement Guidelines.",
                },
                {
                  term: "True LTS (Likely to See)",
                  color: theme.primary2,
                  body: "A visibility-adjusted subset of Gross OTS. Applies the Visibility Adjustment Index (VAI) — a composite factor accounting for display angle, dwell time, ambient lighting conditions, and average vehicle/pedestrian speed at the site. Equivalent to the globally recognised VAC (Visibility Adjusted Contact) concept defined in ESOMAR guidelines and the WOO Global Guidelines on Out-of-Home Audience Measurement (2022). VAI is calibrated using field research on human visual attention in outdoor environments.",
                },
                {
                  term: "Delivered Reach",
                  color: theme.primary,
                  body: "The estimated unique audience attributable to the advertiser's specific creative slot within the display loop. Calculated by applying the proportional time-share of the brand's 10-second slot within the 120-second content loop (1/12 allocation) to the True LTS figure. This conservative model ensures figures represent only the brand's earned share of visibility.",
                },
                {
                  term: "Verified Plays (Proof of Play)",
                  color: theme.success,
                  body: "Raw play-count logs generated directly by the digital display management system (DMS) server. Each log entry corresponds to a confirmed content delivery event timestamped at the screen hardware level. These machine-generated logs serve as the primary source of truth for campaign delivery verification and are not subject to manual adjustment.",
                },
              ].map((item) => (
                <div key={item.term} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${item.color}22`, borderRadius: "0.875rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <div style={{ color: item.color, fontSize: "0.8125rem", fontWeight: 700 }}>{item.term}</div>
                  </div>
                  <div style={{ color: theme.textSoft, fontSize: "0.775rem", lineHeight: 1.65 }}>{item.body}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Legal Disclaimer */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ color: theme.primary2, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "16px" }}>08 · LEGAL DISCLAIMER</div>
          <div style={{ background: "rgba(166,78,241,0.05)", border: `1px solid ${theme.border}`, borderRadius: "0.875rem", padding: "1.5rem 2rem" }}>
            <div style={{ color: theme.textSoft, fontSize: "0.75rem", lineHeight: 1.8 }}>
              <p style={{ marginBottom: "10px" }}>
                This report has been prepared by <strong style={{ color: theme.text }}>Skyarc</strong>, a brand of <strong style={{ color: theme.text }}>Skymurals Advertisement Private Limited</strong>, solely for the use of the named client and is strictly confidential. The data, metrics, estimates, and projections contained herein are derived from industry-standard OOH measurement methodologies, location-specific traffic intelligence, and digital display server logs. They are provided for informational and campaign performance assessment purposes only.
              </p>
              <p style={{ marginBottom: "10px" }}>
                All audience and exposure figures (OTS, LTS, Delivered Reach) represent statistical estimates based on established outdoor advertising measurement frameworks and are not guarantees of actual viewership. Traffic flow data used in the computation of Gross OTS is sourced from field observations, municipal traffic studies, and third-party location data consistent with industry practice. Figures may vary from independent third-party audits due to differences in methodology, data collection period, or site-specific variables.
              </p>
              <p style={{ marginBottom: "10px" }}>
                Verified Play counts are generated by the display management system (DMS) and reflect server-confirmed content delivery events. These logs are maintained with a full audit trail and are available for independent verification upon request. Skymurals Advertisement Private Limited makes no representation that the estimated audience metrics constitute a legally binding performance guarantee unless otherwise expressly agreed in writing.
              </p>
              <p>
                This document, including all data, charts, and analysis contained herein, is the intellectual property of Skymurals Advertisement Private Limited. Reproduction, redistribution, or use of any portion of this report for any purpose other than internal client review is prohibited without prior written consent. By receiving this report, the recipient agrees to maintain its confidentiality.
              </p>
            </div>
          </div>
        </div>

        {/* Closing Footer */}
        <div style={{ borderTop: `1px solid ${theme.borderStrong}`, paddingTop: "28px" }}>
          {/* Quirky quote */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ color: theme.primary, fontSize: "1.125rem", fontWeight: 800, letterSpacing: "0.02em", marginBottom: "6px" }}>
              "{getQuote(month).text}"
            </div>
            <div style={{ color: theme.textMuted, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>— {getQuote(month).author} · Find Your Spotlight.</div>
          </div>

          {/* Footer row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img src="/skyarc_logo_white.png" alt="Skyarc" style={{ height: "32px", objectFit: "contain" }} crossOrigin="anonymous" />
              <div>
                <div style={{ color: theme.textSoft, fontSize: "0.75rem", fontWeight: 600 }}>Skymurals Advertisement Private Limited</div>
                <div style={{ color: theme.textMuted, fontSize: "0.6875rem", marginTop: "2px" }}>
                  <span style={{ color: theme.primary, fontWeight: 600 }}>www.skyarcads.com</span>
                  {" · "}Confidential · {client.brand} · {monthLabel(month)} Report
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: theme.textMuted, fontSize: "0.6875rem" }}>Generated {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
              <div style={{ color: theme.textMuted, fontSize: "0.6875rem", marginTop: "2px" }}>Powered by Skyarc Analytics Platform</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Views ---
function ClientDashboard({ month, pdfRef }) {
  const [activeTab, setActiveTab] = useState("exposure");
  const [pdfLoading, setPdfLoading] = useState(false);

  const report = reportMap.c1.find((item) => item.month === month) || reportMap.c1[0];
  const previous = reportMap.c1.find((item) => item.month === months[months.indexOf(month) - 1]);
  const growth = previous ? (((report.totalDelivered - previous.totalDelivered) / previous.totalDelivered) * 100).toFixed(1) : null;
  const historicalBars = reportMap.c1.map((r) => ({ label: monthLabel(r.month), OTS: r.totalOts, LTS: r.totalLts }));

  const tabs = [
    { id: "exposure", label: "Exposure & Funnel" },
    { id: "historical", label: "Historical Trends" },
    { id: "verification", label: "Proof of Play Log" },
  ];

  const onExportPDF = async () => {
    setPdfLoading(true);
    try {
      await handleExportPDF(pdfRef, month);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={BarChart3}
        title={`${monthLabel(month)} Campaign Intelligence`}
        subtitle="Visibility-adjusted performance models aligned with OOH industry standards."
        right={
          <div className="flex items-center gap-3">
            {/* <button
              onClick={() => handleExportData(report.days, `Skyarc_KPI_Report_${monthLabel(month).replace(" ", "_")}.csv`)}
              className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.05)", color: theme.textSoft, border: `0.0625rem solid ${theme.border}` }}
            >
              <Download size={15} /> CSV
            </button> */}
            <button
              onClick={onExportPDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={{ background: theme.primarySoft, color: theme.text, border: `0.0625rem solid ${theme.borderStrong}` }}
            >
              <FileText size={16} />
              {pdfLoading ? "Generating…" : "Export PDF Report"}
            </button>
          </div>
        }
      />

      {/* Main KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Gross OTS" value={fmt(report.totalOts)} sub="Total vehicular/pedestrian flow" accent={theme.info} />
        <StatCard icon={Eye} label="True LTS" value={fmt(report.totalLts)} sub="Visibility-adjusted exposure" accent={theme.primary2} />
        <StatCard icon={Activity} label="Delivered Reach" value={fmt(report.totalDelivered)} sub={growth ? `${growth}% vs previous month` : "1/12 loop time-share applied"} accent={theme.primary} />
        <StatCard icon={ShieldCheck} label="Verified Plays" value={fmtFull(report.playsVerified)} sub="Raw machine logs (PoP)" accent={theme.success} />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b" style={{ borderColor: theme.border, paddingBottom: "1rem", marginTop: "2.5rem" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              background: activeTab === tab.id ? theme.primarySoft : "transparent",
              color: activeTab === tab.id ? theme.text : theme.textSoft,
              border: `0.0625rem solid ${activeTab === tab.id ? theme.borderStrong : "transparent"}`,
              fontWeight: activeTab === tab.id ? 700 : 600,
              fontSize: "0.875rem",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "exposure" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <GlassCard style={{ padding: "2rem" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center">
                  <div style={{ color: theme.text, fontWeight: 800, fontSize: "1.25rem" }}>Daily Exposure Trend</div>
                  <InfoTooltip content="Traffic multipliers and True LTS conversions are dynamically adjusted to reflect actual crowd density variations, such as higher dwell times during festive/wedding seasons in Rajkot." />
                </div>
                <div style={{ color: theme.textSoft, fontSize: "0.875rem", marginTop: "0.375rem" }}>OTS and LTS movement through the month</div>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <MiniLegend color={theme.info} label="Gross OTS" />
                <MiniLegend color={theme.primary2} label="True LTS" />
              </div>
            </div>
            <div style={{ width: "100%", height: "26rem" }}>
              <ResponsiveContainer>
                <AreaChart data={report.days} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="otsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.info} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={theme.info} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ltsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.primary2} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={theme.primary2} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: theme.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: theme.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={52} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="ots" name="Gross OTS" stroke={theme.info} fill="url(#otsFill)" strokeWidth={2.4} />
                  <Area type="monotone" dataKey="lts" name="True LTS" stroke={theme.primary2} fill="url(#ltsFill)" strokeWidth={2.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard style={{ padding: "2rem" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center">
                  <div style={{ color: theme.text, fontWeight: 800, fontSize: "1.25rem" }}>Monthly Exposure Model</div>
                  <InfoTooltip content={<>This model aligns strictly with OOH standards. We start with <b>Gross Opportunities (OTS)</b> from vehicular flow. We apply a Visibility Adjustment Index to obtain <b>True LTS</b>, then allocate <b>Delivered Reach</b> based on your brand's 10s slot in the 120s loop.</>} />
                </div>
                <div style={{ color: theme.textSoft, fontSize: "0.875rem", marginTop: "0.375rem" }}>Skyarc reporting logic for final visibility estimation</div>
              </div>
            </div>
            <div className="space-y-7">
              {[
                { label: "Gross Opportunities (OTS)", value: report.totalOts, color: theme.info, pct: 100 },
                { label: "Visibility-Adjusted (LTS)", value: report.totalLts, color: theme.primary2, pct: Math.round((report.totalLts / report.totalOts) * 100) },
                { label: "Delivered (10s Slot Time-Share)", value: report.totalDelivered, color: theme.primary, pct: Math.round((report.totalDelivered / report.totalOts) * 100) },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-4">
                    <span style={{ color: theme.textSoft, fontSize: "0.9375rem", fontWeight: 500 }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 800, fontSize: "1rem" }}>{fmtFull(item.value)}</span>
                  </div>
                  <div style={{ height: "0.875rem", borderRadius: "99.9rem", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, boxShadow: `0 0 1.25rem ${item.color}66` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "historical" && (
        <GlassCard style={{ padding: "2rem" }} className="animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center">
                <div style={{ color: theme.text, fontWeight: 800, fontSize: "1.25rem" }}>Historical Performance Trend</div>
                <InfoTooltip content="Exposure comparison from Oct '25 to Feb '26. Notice the elevated exposure during peak local events and festive seasons due to adjusted traffic multipliers." />
              </div>
              <div style={{ color: theme.textSoft, fontSize: "0.875rem", marginTop: "0.375rem" }}>Exposure comparison across months</div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <MiniLegend color={theme.info} label="Gross OTS" />
              <MiniLegend color={theme.primary2} label="True LTS" />
            </div>
          </div>
          <div style={{ width: "100%", height: "28rem", marginTop: "2rem" }}>
            <ResponsiveContainer>
              <LineChart data={historicalBars} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: theme.textMuted, fontSize: 13 }} axisLine={false} tickLine={false} dy={15} />
                <YAxis tick={{ fill: theme.textMuted, fontSize: 13 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={52} />
                <Tooltip content={(props) => <ChartTooltip {...props} label={props.label} />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
                <Line type="monotone" dataKey="OTS" name="Gross OTS" stroke={theme.info} strokeWidth={3} dot={{ r: 5, fill: theme.bg, stroke: theme.info, strokeWidth: 2 }} activeDot={{ r: 8, fill: theme.info }} />
                <Line type="monotone" dataKey="LTS" name="True LTS" stroke={theme.primary2} strokeWidth={4} dot={{ r: 6, fill: theme.bg, stroke: theme.primary2, strokeWidth: 2 }} activeDot={{ r: 9, fill: theme.primary2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {activeTab === "verification" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-6 animate-in fade-in duration-500">
          <GlassCard style={{ padding: "2rem", height: "fit-content" }}>
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <div style={{ color: theme.text, fontWeight: 800, fontSize: "1.25rem" }}>Proof of Play</div>
                <div style={{ color: theme.textSoft, fontSize: "0.875rem", marginTop: "0.375rem" }}>Delivery integrity check</div>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              {[
                { label: "Total Plays Verified", value: fmtFull(report.playsVerified), icon: ShieldCheck, accent: theme.primary },
                { label: "Active Screen Slots", value: client.slots, icon: Building2, accent: theme.primary2 },
                { label: "Offline / Missing Days", value: "0", icon: Activity, accent: theme.success },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: `0.0625rem solid ${theme.border}` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div style={{ color: theme.textSoft, fontSize: "0.875rem", fontWeight: 500 }}>{item.label}</div>
                    <div className="flex items-center justify-center" style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", background: `${item.accent}1d`, color: item.accent }}>
                      <item.icon size={20} />
                    </div>
                  </div>
                  <div style={{ color: theme.text, fontWeight: 800, fontSize: "2rem", marginTop: "1rem" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard style={{ padding: 0, overflow: "hidden" }}>
            <div className="flex items-center justify-between px-8 py-6" style={{ borderBottom: `0.0625rem solid ${theme.border}` }}>
              <div>
                <div style={{ color: theme.text, fontWeight: 800, fontSize: "1.25rem" }}>Daily Log Breakdown</div>
                <div style={{ color: theme.textSoft, fontSize: "0.875rem", marginTop: "0.25rem" }}>Granular campaign exposure table matching raw server logs</div>
              </div>
            </div>
            <div>
              <table className="min-w-full relative">
                <thead className="sticky top-0 z-10" style={{ background: theme.panel, boxShadow: `0 0.0625rem 0 ${theme.border}` }}>
                  <tr>
                    {["Log Date", "Raw Count", "Gross OTS", "True LTS", "Network Status"].map((h) => (
                      <th key={h} style={{ color: theme.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, padding: "1.25rem 2rem", textAlign: "left" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.days.map((row, index) => (
                    <tr key={row.day} className="transition hover:bg-[rgba(255,255,255,0.02)]" style={{ borderTop: index === 0 ? "none" : `0.0625rem solid rgba(255,255,255,0.04)`, background: index % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                      <td style={{ color: theme.textSoft, padding: "1.25rem 2rem", fontSize: "0.9375rem" }}>{getShortMonthName(month)} {row.day}, {month.split("-")[0]}</td>
                      <td style={{ color: theme.text, padding: "1.25rem 2rem", fontSize: "0.9375rem", fontWeight: 700 }}>{fmtFull(row.raw)}</td>
                      <td style={{ color: theme.info, padding: "1.25rem 2rem", fontSize: "0.9375rem", fontWeight: 700 }}>{fmtFull(row.ots)}</td>
                      <td style={{ color: theme.primary2, padding: "1.25rem 2rem", fontSize: "0.9375rem", fontWeight: 700 }}>{fmtFull(row.lts)}</td>
                      <td style={{ padding: "1.25rem 2rem" }}>
                        <span className="rounded-full px-4 py-1.5" style={{ background: "rgba(74,222,128,0.1)", color: theme.success, border: "0.0625rem solid rgba(74,222,128,0.2)", fontSize: "0.75rem", fontWeight: 700 }}>
                          Delivered
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// --- Main Shell ---
export default function App() {
  const [month, setMonth] = useState("2026-02");
  const pdfRef = useRef(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at top right, rgba(166,78,241,0.16), transparent 24%),
          radial-gradient(circle at bottom left, rgba(124,58,237,0.18), transparent 28%),
          linear-gradient(180deg, ${theme.bgSoft}, ${theme.bg})
        `,
        color: theme.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Hidden PDF render target */}
      <PdfReport month={month} pdfRef={pdfRef} />

      {/* Top Bar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,4,14,0.82)", borderBottom: `0.0625rem solid ${theme.border}` }}>
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 sm:px-8 py-4">
          <div className="flex items-center gap-4">
            <img
              src="/skyarc_logo_white.png"
              alt="Skyarc"
              className="h-[4.5rem] w-auto object-contain"
            />
          </div>
          <div className="hidden sm:block" style={{ width: "0.0625rem", height: "2rem", background: theme.border }} />
          <div className="hidden sm:block" style={{ color: theme.textSoft, fontSize: "1rem", fontWeight: 600 }}>
            {client.brand} Report Analytics
          </div>
          <div className="ml-auto flex items-center gap-6">
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: `0.0625rem solid ${theme.border}` }}>
              <CalendarRange size={18} color={theme.textMuted} />
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ background: "transparent", color: theme.text, border: "none", outline: "none", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer" }}
              >
                {months.map((m) => (
                  <option key={m} value={m} style={{ background: theme.bg }}>{monthLabel(m)}</option>
                ))}
              </select>
            </div>
            <div className="hidden md:flex items-center gap-4 pl-6 border-l" style={{ borderColor: theme.border }}>
              <div className="text-right">
                <div style={{ color: theme.text, fontSize: "0.9375rem", fontWeight: 700 }}>{client.brand}</div>
                <div style={{ color: theme.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.125rem" }}>Client Portal</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-8">
        <ClientDashboard month={month} pdfRef={pdfRef} />
      </div>

      {/* Site Footer */}
      <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: "4rem", background: "rgba(6,4,14,0.7)", backdropFilter: "blur(12px)" }}>
        {/* Methodology & Disclaimer strip */}
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Methodology summary */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}`, borderRadius: "1rem", padding: "1.5rem" }}>
              <div style={{ color: theme.primary2, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "12px" }}>Measurement Methodology</div>
              <div style={{ color: theme.textMuted, fontSize: "0.75rem", lineHeight: 1.75 }}>
                All audience metrics are computed using industry-standard OOH frameworks aligned with IOAA (Indian Outdoor Advertising Association), WOO Global Guidelines on Out-of-Home Audience Measurement (2022), ESOMAR, and OAAA OOH Impression Measurement Guidelines. <strong style={{ color: theme.textSoft }}>Gross OTS</strong> reflects total vehicular &amp; pedestrian flow past the site. <strong style={{ color: theme.textSoft }}>True LTS</strong> applies a Visibility Adjustment Index (VAI) for dwell time, angle, and speed. <strong style={{ color: theme.textSoft }}>Delivered Reach</strong> represents the brand's 1/12 time-share of True LTS. <strong style={{ color: theme.textSoft }}>Verified Plays</strong> are DMS server-confirmed content delivery logs — unedited and auditable.
              </div>
            </div>
            {/* Legal disclaimer */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border}`, borderRadius: "1rem", padding: "1.5rem" }}>
              <div style={{ color: theme.primary2, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "12px" }}>Legal Disclaimer</div>
              <div style={{ color: theme.textMuted, fontSize: "0.75rem", lineHeight: 1.75 }}>
                This report is prepared by <strong style={{ color: theme.textSoft }}>Skyarc</strong>, a brand of <strong style={{ color: theme.textSoft }}>Skymurals Advertisement Private Limited</strong>, for the exclusive use of the named client. All exposure figures are statistical estimates based on established measurement models and do not constitute a legally binding viewership guarantee unless expressly agreed in writing. This document is confidential and the intellectual property of Skymurals Advertisement Private Limited. Unauthorised reproduction or redistribution is prohibited.
              </div>
            </div>
          </div>

          {/* Divider + quote + brand row */}
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: "24px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ color: theme.primary, fontSize: "1rem", fontWeight: 800, letterSpacing: "0.01em" }}>
                "{getQuote(month).text}"
              </div>
              <div style={{ color: theme.textMuted, fontSize: "0.6875rem", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: "6px" }}>— {getQuote(month).author} · Find Your Spotlight.</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img src="/skyarc_logo_white.png" alt="Skyarc" style={{ height: "28px", objectFit: "contain" }} />
                <div>
                  <div style={{ color: theme.textSoft, fontSize: "0.75rem", fontWeight: 600 }}>Skymurals Advertisement Private Limited</div>
                  <a href="https://www.skyarcads.com" target="_blank" rel="noreferrer" style={{ color: theme.primary, fontSize: "0.6875rem", textDecoration: "none", fontWeight: 600 }}>www.skyarcads.com</a>
                </div>
              </div>
              <div style={{ color: theme.textMuted, fontSize: "0.6875rem", textAlign: "right" }}>
                Confidential · {client.brand} · Powered by Skyarc Analytics Platform
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
