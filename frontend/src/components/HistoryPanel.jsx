import { useEffect, useMemo, useState } from "react";
import { getHistory } from "../api/habits";
import { getCompletionColor } from "../utils/completion";
import LoadingSpinner from "./LoadingSpinner";
import { segmentedButtonClassName, segmentedContainerClassName } from "./ui.js";

const RANGE_OPTIONS = [30, 90, 180, 365];

const buildHistoryInsights = (history, days) => {
  if (!history) return [];

  const validDaily = (history.daily || []).filter(
    (row) => row && row.completion !== null && row.completion !== undefined,
  );
  const values = validDaily.map((row) => row.completion);
  if (values.length === 0) {
    return [{
      tone: "neutral",
      title: "Todavía no hay suficiente historial",
      text: "Registra unos días más para ver recomendaciones útiles.",
    }];
  }

  const thresholds =
    days <= 30
      ? { high: 80, medium: 60 }
      : days <= 90
        ? { high: 75, medium: 55 }
        : days <= 180
          ? { high: 70, medium: 50 }
          : { high: 68, medium: 48 };

  const average = values.reduce((acc, v) => acc + v, 0) / Math.max(values.length, 1);
  const weakDays = values.filter((v) => v < 50).length;
  const weakDayRatio = weakDays / Math.max(values.length, 1);
  const bestDay = validDaily.reduce(
    (best, row) =>
      best === null || (row.completion ?? -1) > (best.completion ?? -1) ? row : best,
    null,
  );

  let trend = "flat";
  if (values.length >= 2) {
    trend = values[values.length - 1] > values[0] ? "up" : "down";
    if (values[values.length - 1] === values[0]) trend = "flat";
  }

  const cards = [];

  if (average >= thresholds.high) {
    cards.push({ tone: "good", title: "Buen ritmo", text: "Tu constancia va bien. Mantén el ritmo." });
  } else if (average >= thresholds.medium) {
    cards.push({ tone: "neutral", title: "Base estable", text: "Estás cerca del siguiente nivel. Un hábito extra en días flojos puede marcar diferencia." });
  } else {
    cards.push({ tone: "warn", title: "Aún falta impulso", text: "Baja la exigencia en días difíciles y cuida tu racha." });
  }

  if (trend === "up") {
    cards.push({ tone: "good", title: "La tendencia mejora", text: `Tu cumplimiento mejoró en los últimos ${days} días. Repite lo que funcionó.` });
  } else if (trend === "down") {
    cards.push({ tone: "warn", title: "Hay una baja", text: `Tu cumplimiento bajó en los últimos ${days} días. Vuelve a una base diaria.` });
  }

  if (weakDays > 0) {
    cards.push({
      tone: weakDayRatio >= 0.35 ? "warn" : "neutral",
      title: `${weakDays} día${weakDays === 1 ? "" : "s"} flojo${weakDays === 1 ? "" : "s"}`,
      text: weakDayRatio >= 0.35
        ? "Protege esos días con una versión ligera de tu rutina."
        : "Define una versión de respaldo para mantener el ritmo.",
    });
  } else if (bestDay) {
    cards.push({ tone: "good", title: `Mejor día: ${bestDay.date}`, text: "Ya sabes qué te funciona. Repite ese contexto." });
  }

  return cards.slice(0, 3);
};

const historyInsightTone = {
  good:    "border-lime/30 bg-lime/8",
  warn:    "border-gold/30 bg-gold/8",
  neutral: "border-ink/10 bg-paper-2",
};

const historyInsightEyebrow = {
  good: "Positivo",
  warn: "Atención",
  neutral: "Info",
};

function NoChartData({ label = "Sin datos para este período" }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-ink-3 text-center px-4">{label}</p>
    </div>
  );
}

function SVGLineChart({ data }) {
  const n = data.length;
  if (n === 0) return <NoChartData />;

  const VW = Math.max(300, n * 3);
  const CH = 80;
  const LH = 14;
  const VH = CH + LH;
  const labelStep = Math.max(1, Math.ceil(n / 10));

  let pathD = "";
  data.forEach((d, i) => {
    if (d.completion === null || d.completion === undefined) return;
    const x = n <= 1 ? VW / 2 : (i / (n - 1)) * VW;
    const y = CH * (1 - d.completion / 100);
    const prevNull = i === 0 || data[i - 1]?.completion == null;
    pathD += prevNull ? `M${x},${y}` : ` L${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full">
      {[25, 50, 75].map((pct) => (
        <line
          key={pct}
          x1="0" y1={CH * (1 - pct / 100)}
          x2={VW} y2={CH * (1 - pct / 100)}
          stroke="var(--ink)" strokeOpacity="0.08" strokeWidth="0.8"
        />
      ))}
      {pathD && (
        <path d={pathD} fill="none" stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="1.5" />
      )}
      {data.map((d, i) => {
        if (d.completion === null || d.completion === undefined) return null;
        const x = n <= 1 ? VW / 2 : (i / (n - 1)) * VW;
        const y = CH * (1 - d.completion / 100);
        return (
          <circle key={i} cx={x} cy={y} r={n > 90 ? 1.8 : 2.5}
            fill={getCompletionColor(d.completion)} />
        );
      })}
      {data
        .filter((_, i) => i % labelStep === 0)
        .map((d, j) => {
          const origI = j * labelStep;
          const x = n <= 1 ? VW / 2 : (origI / (n - 1)) * VW;
          return (
            <text key={j} x={x} y={VH - 1}
              fontSize="9" textAnchor="middle"
              fill="var(--ink)" fillOpacity="0.4">
              {d.label}
            </text>
          );
        })}
    </svg>
  );
}

function SVGBarChart({ data }) {
  const n = data.length;
  if (n === 0) return <NoChartData />;

  const VW = 100;
  const CH = 70;
  const LH = 14;
  const VH = CH + LH;
  const slotW = VW / n;
  const barW = slotW * 0.65;
  const barOffset = (slotW - barW) / 2;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full">
      {[25, 50, 75].map((pct) => (
        <line
          key={pct}
          x1="0" y1={CH * (1 - pct / 100)}
          x2="100" y2={CH * (1 - pct / 100)}
          stroke="var(--ink)" strokeOpacity="0.08" strokeWidth="0.5"
        />
      ))}
      {data.map((d, i) => {
        if (d.completion === null || d.completion === undefined) return null;
        const x = i * slotW + barOffset;
        const h = Math.max(1, (d.completion / 100) * CH);
        const y = CH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h}
              fill={getCompletionColor(d.completion)} rx="1.5" />
            {n <= 24 && (
              <text x={x + barW / 2} y={VH - 1}
                fontSize="7" textAnchor="middle"
                fill="var(--ink)" fillOpacity="0.4">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function HistoryPanel({ refreshVersion = 0 }) {
  const [days, setDays] = useState(90);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;
    const fetchHistory = async () => {
      try {
        if (!isCancelled) { setLoading(true); setError(""); }
        const payload = await getHistory({ days });
        if (!isCancelled) setHistory(payload);
      } catch {
        if (!isCancelled) setError("No pudimos cargar las métricas históricas.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    fetchHistory();
    return () => { isCancelled = true; };
  }, [days, refreshVersion]);

  const chartData = useMemo(() => {
    if (!history) return { daily: [], weekly: [], monthly: [] };
    return {
      daily:   history.daily.map((row) => ({ label: row.date.slice(5), completion: row.completion })),
      weekly:  history.weekly.map((row) => ({ label: row.start_date.slice(5), completion: row.completion })),
      monthly: history.monthly.map((row) => ({ label: row.month, completion: row.completion })),
    };
  }, [history]);

  const hasAnyMetricData =
    (history?.daily || []).some((row) => row.completion !== null) ||
    (history?.weekly || []).some((row) => row.completion !== null) ||
    (history?.monthly || []).some((row) => row.completion !== null);

  const historyInsights = useMemo(() => buildHistoryInsights(history, days), [history, days]);

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">
        <LoadingSpinner label="Cargando historial..." />
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

      {/* Section header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-4">
            Historial
          </span>
          <h2 className="font-serif text-[32px] leading-tight tracking-[-0.02em] mt-1">
            Historial y analítica
          </h2>
          <p className="text-sm text-ink-3 mt-1">
            Recomendaciones según el rango que elegiste.
          </p>
        </div>

        <div className={segmentedContainerClassName}>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={segmentedButtonClassName(days === option)}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-[14px] border border-ink/10 bg-paper-2 p-4">
          <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
            Promedio de cumplimiento
          </span>
          <p className="font-serif text-[40px] leading-tight mt-1">
            {history?.summary?.average_daily_completion !== null
              ? `${history.summary.average_daily_completion}%`
              : "N/D"}
          </p>
        </div>
        <div className="rounded-[14px] border border-ink/10 bg-paper-2 p-4">
          <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
            Días activos
          </span>
          <p className="font-serif text-[40px] leading-tight mt-1">
            {history?.summary?.active_days ?? 0}
          </p>
        </div>
        <div className="rounded-[14px] border border-ink/10 bg-paper-2 p-4">
          <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
            Rango
          </span>
          <p className="text-sm font-medium mt-2">
            {history?.range?.start_date} — {history?.range?.end_date}
          </p>
          <p className="font-mono text-[10px] text-ink-4 mt-1">
            Base: {history?.range?.baseline_date}
          </p>
        </div>
      </div>

      {!hasAnyMetricData && (
        <div className="rounded-[14px] border border-ink/10 bg-paper-2 px-4 py-4 mb-6">
          <p className="text-sm text-ink-3">
            Aún no hay métricas para este período. Las métricas comienzan desde la fecha
            de creación de tu cuenta y de tus hábitos.
          </p>
        </div>
      )}

      {hasAnyMetricData && (
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="rounded-[14px] border border-ink/10 bg-paper p-4">
            <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3 mb-3">
              Tendencia diaria de cumplimiento
            </p>
            <div className="h-48">
              <SVGLineChart data={chartData.daily} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[14px] border border-ink/10 bg-paper p-4">
              <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3 mb-3">
                Comparativa semanal
              </p>
              <div className="h-44">
                <SVGBarChart data={chartData.weekly} />
              </div>
            </div>
            <div className="rounded-[14px] border border-ink/10 bg-paper p-4">
              <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3 mb-3">
                Comparativa mensual
              </p>
              <div className="h-44">
                <SVGBarChart data={chartData.monthly} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="border-t border-ink/10 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-4">
            Recomendaciones
          </span>
          <span className="font-mono text-[10px] text-ink-4">
            Base: {history?.range?.baseline_date}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {historyInsights.map((insight) => (
            <div
              key={`${insight.title}-${insight.text}`}
              className={`rounded-[14px] border p-4 ${historyInsightTone[insight.tone]}`}
            >
              <p className="font-mono text-[10px] tracking-[0.10em] uppercase text-ink-4 mb-2">
                {historyInsightEyebrow[insight.tone]}
              </p>
              <p className="font-serif text-[18px] leading-tight mb-2">{insight.title}</p>
              <p className="text-sm leading-relaxed text-ink-2">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
