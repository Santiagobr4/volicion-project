import { useEffect, useMemo, useState } from "react";
import { getLeaderboard } from "../api/habits";
import LoadingSpinner from "./LoadingSpinner";
import { eyebrowClassName, segmentedButtonClassName, segmentedContainerClassName } from "./ui.js";

const PERIODS = [
  { key: "daily",      label: "Diario" },
  { key: "weekly",     label: "Semanal" },
  { key: "monthly",    label: "Mensual" },
  { key: "historical", label: "Histórico" },
];

const getMetricValue = (row, key) => {
  if (key === "daily")      return row.daily_completion;
  if (key === "weekly")     return row.weekly_completion;
  if (key === "monthly")    return row.monthly_completion;
  return row.historical_completion;
};

const isZeroEngagement = (row) =>
  (row?.daily_completion ?? 0) === 0 &&
  (row?.weekly_completion ?? 0) === 0 &&
  (row?.monthly_completion ?? 0) === 0 &&
  (row?.historical_completion ?? 0) === 0;

const formatLeaderNames = (leaders) => {
  if (!leaders.length) return "—";
  if (leaders.length === 1) return leaders[0].display_name;
  if (leaders.length === 2) return `${leaders[0].display_name} y ${leaders[1].display_name}`;
  return `${leaders[0].display_name}, ${leaders[1].display_name} y otros`;
};

/**
 * Build a context-aware narrative for the leader card based on:
 * - the metric (daily / weekly / historical) — each has its own voice
 * - score level (100, ≥80, ≥50, <50)
 * - tie size (solo, 2-tied, all-tied)
 * - gap to the chaser (close <5pts vs wide >15pts)
 */
const buildLeaderNote = (metric, highlight, ranking) => {
  const leaders = highlight?.leaders || [];
  const score = highlight?.score;
  const total = highlight?.total ?? 0;

  if (!leaders.length || score === null || score === undefined) {
    if (metric === "daily")      return "Día sin actividad suficiente. Marca algo y reabres la pelea.";
    if (metric === "weekly")     return "La semana aún no muestra tendencia.";
    return "Aún no hay base histórica para un líder claro.";
  }

  const allTied = leaders.length === total && total > 1;
  const sharedTie = leaders.length > 1 && !allTied;
  const leaderUsernames = new Set(leaders.map((l) => l.username));
  const scoredRows = (ranking || [])
    .filter((row) => leaderUsernames.has(row.username) === false)
    .map((row) => {
      if (metric === "daily")      return row.daily_completion;
      if (metric === "weekly")     return row.weekly_completion;
      return row.historical_completion;
    })
    .filter((value) => value !== null && value !== undefined);
  const chaserScore = scoredRows.length ? Math.max(...scoredRows) : null;
  const gap = chaserScore !== null ? score - chaserScore : null;
  const lead = leaders[0].display_name;

  // Daily — short-window stakes, high volatility
  if (metric === "daily") {
    if (allTied && score === 100)   return "Día perfecto para todos. El siguiente check decide.";
    if (allTied)                    return `Empate general en ${score}%. La aguja no se ha movido hoy.`;
    if (sharedTie && score === 100) return `${formatLeaderNames(leaders)} cerraron el día perfecto. Nadie soltó.`;
    if (sharedTie)                  return `${formatLeaderNames(leaders)} comparten la cima del día con ${score}%.`;
    if (score === 100 && chaserScore === null) return `${lead} cerró el día perfecto. Nadie más llegó.`;
    if (score === 100)              return `${lead} cerró el día perfecto. ${chaserScore}% fue lo más cerca que hubo.`;
    if (gap !== null && gap >= 15)  return `${lead} abrió distancia clara hoy. El segundo viene a ${chaserScore}%.`;
    if (gap !== null && gap <= 5)   return `${lead} encabeza con ${score}%, pero el segundo va a ${chaserScore}%. Cualquier check mueve esto.`;
    if (score < 50)                 return `Día corto para todos. ${lead} encabeza con apenas ${score}%.`;
    return `${lead} lidera el día con ${score}%. La carrera sigue abierta.`;
  }

  // Weekly — medium-window, narrative of the week
  if (metric === "weekly") {
    if (allTied && score === 100)   return "Todos al 100% esta semana. Cualquier día rompe el empate.";
    if (allTied)                    return `Semana pareja: todos en ${score}%. El cierre va a definir.`;
    if (sharedTie && score === 100) return `${formatLeaderNames(leaders)} no han fallado un solo día.`;
    if (sharedTie)                  return `${formatLeaderNames(leaders)} comparten el liderato semanal con ${score}%.`;
    if (score === 100)              return `${lead} no ha fallado un día esta semana.`;
    if (gap !== null && gap >= 15)  return `${lead} ya tomó distancia esta semana. Difícil de alcanzar antes del domingo.`;
    if (gap !== null && gap <= 5)   return `${lead} encabeza con ventaja corta. La semana se decide en el cierre.`;
    if (score < 50)                 return `Semana baja para todos. ${lead} sostiene el liderato con ${score}%.`;
    return `${lead} encabeza la semana con ${score}%. Hay margen para moverse.`;
  }

  // Historical — long-window, slow-moving
  if (allTied && score === 100)   return "Empate histórico en 100%. Solo una falla romperá esto.";
  if (allTied)                    return `Empate histórico en ${score}%. La diferencia va a venir de constancia, no de un día.`;
  if (sharedTie && score === 100) return `${formatLeaderNames(leaders)} comparten un histórico perfecto.`;
  if (sharedTie)                  return `${formatLeaderNames(leaders)} llevan el histórico parejo en ${score}%.`;
  if (score === 100)              return `${lead} no ha tenido un día débil en todo el histórico.`;
  if (gap !== null && gap >= 15)  return `${lead} se separó del resto en lo histórico. La constancia ya pesa.`;
  if (gap !== null && gap <= 5)   return `${lead} lidera el histórico con margen mínimo. Cualquier semana mala lo cambia.`;
  if (score < 50)                 return `Aún nadie consolida un histórico fuerte. ${lead} encabeza con ${score}%.`;
  return `${lead} acumula ${score}% en el histórico. La distancia se construye de a poco.`;
};

export default function RankingPanel({ refreshVersion = 0 }) {
  const [ranking, setRanking] = useState([]);
  const [highlights, setHighlights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("weekly");

  useEffect(() => {
    const controller = new AbortController();
    const loadRanking = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await getLeaderboard({ signal: controller.signal });
        if (!controller.signal.aborted) {
          setRanking(payload.results || []);
          setHighlights(payload.highlights || null);
        }
      } catch (err) {
        if (controller.signal.aborted || err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        setError("No pudimos cargar la clasificación.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadRanking();
    return () => controller.abort();
  }, [refreshVersion]);

  const visibleRanking = useMemo(
    () => ranking.filter((row) => !isZeroEngagement(row)),
    [ranking],
  );

  const sortedRanking = useMemo(
    () => [...visibleRanking].sort((a, b) => (getMetricValue(b, period) ?? -1) - (getMetricValue(a, period) ?? -1)),
    [visibleRanking, period],
  );

  const leaderCards = useMemo(() => [
    {
      eyebrow: "Líder diario",
      name: formatLeaderNames(highlights?.daily?.leaders || []),
      pct: highlights?.daily?.score ?? null,
      note: buildLeaderNote("daily", highlights?.daily, visibleRanking),
      dark: true,
    },
    {
      eyebrow: "Líder semanal",
      name: formatLeaderNames(highlights?.weekly?.leaders || []),
      pct: highlights?.weekly?.score ?? null,
      note: buildLeaderNote("weekly", highlights?.weekly, visibleRanking),
    },
    {
      eyebrow: "Líder histórico",
      name: formatLeaderNames(highlights?.historical?.leaders || []),
      pct: highlights?.historical?.score ?? null,
      note: buildLeaderNote("historical", highlights?.historical, visibleRanking),
    },
  ], [highlights, visibleRanking]);

  const hiddenZeroCount = Math.max(ranking.length - visibleRanking.length, 0);
  const activePeriodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">
        <LoadingSpinner label="Cargando clasificación..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">
        <div className="rounded-[14px] border border-signal/25 bg-signal-soft px-4 py-3 text-sm text-signal">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">

      {/* Page head */}
      <div className="mb-8">
        <span className={eyebrowClassName}>
          Clasificación · Período actual
        </span>
        <h1 className="font-serif text-[length:var(--text-h1)] leading-tight tracking-[-0.02em] mt-2">
          Quién sostiene<br /><em>el ritmo.</em>
        </h1>
        <p className="text-[15px] sm:text-[17px] text-ink-2 max-w-[560px] leading-[1.55] mt-2">
          Orden global: primero diario, luego semanal, mensual y por último histórico. La consistencia gana, no los picos.
        </p>
      </div>

      {/* Period tabs + count */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className={`${segmentedContainerClassName} max-w-full overflow-x-auto no-scrollbar`}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={segmentedButtonClassName(period === p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-ink-3">
          {visibleRanking.length} usuario{visibleRanking.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Leader cards */}
      {leaderCards.some((c) => c.pct !== null) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {leaderCards.map((card, i) => {
            // Featured card uses fixed colors that don't swap in dark mode.
            // #161513 = ink, #FAFAF7 = paper. Hardcoded so the dark card stays
            // dark on either theme (otherwise --ink/--paper invert).
            const featured = card.dark;
            return (
              <div
                key={i}
                className="rounded-[14px] border p-5"
                style={
                  featured
                    ? { background: "#161513", color: "#FAFAF7", borderColor: "#161513" }
                    : { borderColor: "var(--paper-3)" }
                }
              >
                <span
                  className="font-mono text-[10px] tracking-[0.10em] uppercase"
                  style={{ color: featured ? "rgba(250,250,247,0.55)" : "var(--ink-4)" }}
                >
                  {card.eyebrow}
                </span>
                <div
                  className="font-serif text-[28px] sm:text-[32px] lg:text-[36px] leading-tight mt-3 mb-1 break-words"
                  style={{ color: featured ? "#FAFAF7" : "var(--ink)" }}
                >
                  {card.name}
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span
                    className="font-serif text-[24px] sm:text-[28px]"
                    style={{ color: featured ? "var(--lime)" : "var(--ink)" }}
                  >
                    {card.pct !== null ? `${card.pct}%` : "—"}
                  </span>
                  <span
                    className="font-mono text-[10px] tracking-[0.08em] uppercase"
                    style={{ color: featured ? "rgba(250,250,247,0.55)" : "var(--ink-3)" }}
                  >
                    cumplimiento
                  </span>
                </div>
                <p
                  className="text-[13px] leading-[1.5]"
                  style={{ color: featured ? "rgba(250,250,247,0.75)" : "var(--ink-2)" }}
                >
                  {card.note}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {hiddenZeroCount > 0 && (
        <p className="font-mono text-[11px] text-ink-4 mb-6 tracking-[0.04em]">
          + {hiddenZeroCount} usuario{hiddenZeroCount === 1 ? "" : "s"} sin actividad ocultados.
        </p>
      )}

      {visibleRanking.length === 0 && (
        <div className="border-l-2 border-ink/20 pl-4 py-1">
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3 mb-1.5">
            Sin clasificación
          </p>
          <p className="font-serif text-[18px] leading-[1.3] text-ink">
            Aún no hay participantes con actividad suficiente para mostrar una clasificación útil.
          </p>
        </div>
      )}

      {/* Ranking table */}
      {sortedRanking.length > 0 && (
        <div className="max-w-full">
          {/* Header row — single metric column matches the active period tab */}
          <div className="grid gap-3 sm:gap-4 pb-3 border-b border-ink/20 mb-2 grid-cols-[36px_1fr_auto] sm:grid-cols-[48px_1fr_auto]">
            <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">#</span>
            <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">Usuario</span>
            <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4 text-right">
              {activePeriodLabel}
            </span>
          </div>

          {sortedRanking.map((row, idx) => {
            const isTop1 = idx === 0;
            const isTop3 = idx <= 2;
            const tier = isTop1 ? "TOP 1" : isTop3 ? "TOP 3" : idx <= 9 ? "TOP 10" : null;
            const val = getMetricValue(row, period);
            const hasValue = val !== null && val !== undefined;
            const isZero = hasValue && val === 0;
            const isHigh = hasValue && val >= 50;
            const valueColorClass = !hasValue || isZero ? "text-ink-4" : isHigh ? "text-ink" : "text-ink-2";

            return (
              <div
                key={`${row.username}-${idx}`}
                className={`relative grid gap-3 sm:gap-4 py-4 sm:py-5 border-b border-ink/8 fade-up items-center grid-cols-[36px_1fr_auto] sm:grid-cols-[48px_1fr_auto] ${
                  row.is_current_user ? "before:absolute before:left-[-16px] before:top-2 before:bottom-2 before:w-[2px] before:bg-lime" : ""
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className={`font-serif leading-none ${isTop1 ? "text-[28px] sm:text-[32px]" : isTop3 ? "text-[22px] sm:text-[26px]" : "text-[18px] sm:text-[20px] text-ink-3"}`}>
                  {String(idx + 1).padStart(2, "0")}
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  {row.avatar_file_url ? (
                    <img
                      src={row.avatar_file_url}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      decoding="async"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-ink/10 shrink-0"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-ink/10 shrink-0 flex items-center justify-center font-serif text-[16px] leading-none ${
                        isTop1 ? "bg-ink text-paper" : "bg-paper-3 text-ink"
                      }`}
                    >
                      {row.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-[18px] sm:text-[20px] leading-tight truncate">{row.display_name}</span>
                      {row.is_current_user && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-lime text-lime-ink rounded-[3px] tracking-[0.08em] uppercase shrink-0">Tú</span>
                      )}
                      {tier && (
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.5 rounded-[3px] tracking-[0.08em] uppercase shrink-0 ${
                            isTop1
                              ? "bg-ink text-paper"
                              : isTop3
                                ? "border border-ink/30 text-ink-2"
                                : "border border-ink/15 text-ink-4"
                          }`}
                        >
                          {tier}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-ink-4 tracking-[0.08em] truncate block mt-0.5">
                      @{row.username.toUpperCase()}
                    </span>
                  </div>
                </div>

                <span
                  className={`font-serif text-[18px] sm:text-[22px] justify-self-end ${valueColorClass}`}
                  style={isHigh ? { color: "var(--lime-ink)", background: "var(--lime)", padding: "2px 10px", borderRadius: 6 } : undefined}
                >
                  {hasValue ? (isZero ? "—" : `${val}%`) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
