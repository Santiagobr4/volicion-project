import { useEffect, useMemo, useState } from "react";
import { getHistory } from "../api/habits";
import LoadingSpinner from "./LoadingSpinner";
import { eyebrowClassName, segmentedButtonClassName, segmentedContainerClassName } from "./ui.js";

const RANGE_OPTIONS = [30, 90, 180, 365];

const getHeatLevel = (completion) => {
  if (completion === null || completion === undefined) return 0;
  if (completion >= 80) return 4;
  if (completion >= 60) return 3;
  if (completion >= 40) return 2;
  if (completion > 0) return 1;
  return 0;
};

const formatHistoryDate = (isoDate) => {
  if (!isoDate) return "";
  return new Intl.DateTimeFormat("es-419", {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
};

const buildHistoryInsights = (history, days) => {
  if (!history) return [];

  const validDaily = (history.daily || []).filter(
    (row) => row && row.completion !== null && row.completion !== undefined,
  );
  const values = validDaily.map((row) => row.completion);
  if (values.length === 0) {
    return [{
      tone: "neutral",
      title: "Aún no hay suficiente historial.",
      text: "Necesitas unos días registrados para que la lectura sea útil. Por ahora, los promedios mienten.",
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

  const average = Math.round(values.reduce((acc, v) => acc + v, 0) / Math.max(values.length, 1));
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
    cards.push({
      tone: "good",
      title: `Promedio en ${average}%.`,
      text: "Vas en buena racha. Lo importante ahora no es subir el número — es no romperlo. Mantener este nivel un mes más vale más que un pico aislado.",
    });
  } else if (average >= thresholds.medium) {
    cards.push({
      tone: "neutral",
      title: "Base estable, sin techo.",
      text: "Estás cerca del siguiente nivel pero no llegas. Identifica el día de la semana que te baja el promedio — ese es donde está el margen.",
    });
  } else {
    cards.push({
      tone: "warn",
      title: "El número dice bajo.",
      text: "Antes de subir el promedio, baja la exigencia. Mejor un hábito sostenido por 30 días que tres a medias por una semana.",
    });
  }

  if (trend === "up") {
    cards.push({
      tone: "good",
      title: "La curva subió.",
      text: `Tu cumplimiento está mejor que al inicio de los últimos ${days} días. Lo que cambió en este período conviértelo en regla, no en excepción.`,
    });
  } else if (trend === "down") {
    cards.push({
      tone: "warn",
      title: "La curva está cayendo.",
      text: `Vas más bajo que al arrancar el período. Antes de buscar más hábitos, vuelve a una base diaria que sí cumplas — desde ahí se sube.`,
    });
  }

  if (weakDays > 0) {
    cards.push({
      tone: weakDayRatio >= 0.35 ? "warn" : "neutral",
      title: weakDayRatio >= 0.35
        ? `${weakDays} días flojos. Ya es patrón.`
        : `${weakDays} día${weakDays === 1 ? "" : "s"} bajo${weakDays === 1 ? "" : "s"}.`,
      text: weakDayRatio >= 0.35
        ? "Esto ya no es un mal día puntual. Probablemente hay un día de la semana que falla siempre — encuéntralo y rebájalo, antes que cargar con la culpa."
        : "Está dentro de lo aceptable, pero conviene tener una versión ligera del hábito para esos días — antes de que se vuelva costumbre.",
    });
  } else if (bestDay) {
    cards.push({
      tone: "good",
      title: `Mejor día: ${formatHistoryDate(bestDay.date)}.`,
      text: "Ese fue tu nivel real cuando todo cuadró. Anota qué tenía de distinto — esa es tu hoja de ruta para repetirlo.",
    });
  }

  return cards.slice(0, 3);
};

function NoChartData({ label = "Sin datos para este período" }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-ink-3 text-center px-4">{label}</p>
    </div>
  );
}

function DailyTrend({ data }) {
  const validData = data.filter((d) => d.completion !== null && d.completion !== undefined);
  if (validData.length === 0) return <NoChartData />;

  const n = validData.length;
  const w = 1100, h = 220, pad = 20;
  const step = (w - pad * 2) / Math.max(1, n - 1);
  const pts = validData.map((d, i) => [
    pad + (n <= 1 ? (w - pad * 2) / 2 : i * step),
    h - pad - (d.completion / 100) * (h - pad * 2),
  ]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : ` L${p[0]},${p[1]}`)).join("");
  const area = path + ` L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height: 240 }}>
      <defs>
        <linearGradient id="dt-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <line
          key={i}
          x1={pad} y1={pad + p * (h - pad * 2)}
          x2={w - pad} y2={pad + p * (h - pad * 2)}
          stroke="var(--ink)" strokeOpacity="0.06"
          strokeDasharray={i === 0 || i === 4 ? undefined : "2 4"}
        />
      ))}
      <path d={area} fill="url(#dt-grad)" />
      <path d={path} fill="none" stroke="var(--ink)" strokeOpacity="0.6" strokeWidth="1.5" />
    </svg>
  );
}

function MonthBars({ data }) {
  if (!data.length) return <NoChartData label="Sin datos mensuales" />;
  return (
    <div className="flex items-end gap-3" style={{ height: 180 }}>
      {data.map((d, i) => {
        const pct = d.completion ?? 0;
        const isLast = i === data.length - 1;
        const h = Math.max(2, pct);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
            <div className="font-mono text-[11px] text-ink-2">{pct}%</div>
            <div className="flex-1 w-full flex items-end">
              <div
                className={`w-full rounded-[4px] ${isLast ? "bg-ink" : "bg-paper-3"}`}
                style={{ height: `${h}%`, transition: "height 600ms ease" }}
              />
            </div>
            <span className="font-mono text-[10px] tracking-[0.1em] text-ink-4">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function HistoryPanel({ refreshVersion = 0 }) {
  const [days, setDays] = useState(90);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await getHistory({ days, signal: controller.signal });
        if (!controller.signal.aborted) setHistory(payload);
      } catch (err) {
        if (controller.signal.aborted || err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        setError("No pudimos cargar las métricas históricas.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchHistory();
    return () => controller.abort();
  }, [days, refreshVersion]);

  const chartData = useMemo(() => {
    if (!history) return { daily: [], weekly: [], monthly: [] };
    return {
      daily:   history.daily.map((row) => ({ label: row.date.slice(5), completion: row.completion })),
      weekly:  history.weekly.map((row) => ({ label: row.start_date.slice(5), completion: row.completion })),
      monthly: history.monthly.map((row) => ({ label: row.month, completion: row.completion })),
    };
  }, [history]);

  const heatCells = useMemo(() => {
    if (!history) return [];
    const raw = [...(history.daily || [])].reverse().slice(0, 98).reverse();
    return raw.map((row) => getHeatLevel(row.completion));
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

      {/* Page head */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <span className={eyebrowClassName}>
            Historial · Lectura larga
          </span>
          <h1 className="font-serif text-[length:var(--text-h1)] leading-tight tracking-[-0.02em] mt-2">
            Lo que <em>de verdad</em><br className="hidden sm:block" /> vienes haciendo.
          </h1>
          <p className="text-[15px] sm:text-[17px] text-ink-2 max-w-[560px] leading-[1.55] mt-2">
            Cuanto más amplio el rango, menos ruido. Mira la dirección, no los días sueltos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2 shrink-0">
          <span className={eyebrowClassName}>Rango de análisis</span>
          <div className={`${segmentedContainerClassName} self-start sm:self-auto`}>
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
      </div>

      {/* Hero stats — horizontal on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t md:border-b border-ink/20 mb-12 divide-y md:divide-y-0 md:divide-x divide-ink/10">
        <div className="py-5 md:py-6 md:pr-8">
          <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">Promedio de cumplimiento</p>
          <p className="font-serif text-[44px] sm:text-[56px] lg:text-[64px] leading-tight mt-2">
            {history?.summary?.average_daily_completion !== null && history?.summary?.average_daily_completion !== undefined
              ? <>{history.summary.average_daily_completion}<span className="text-[24px] sm:text-[32px] text-ink-3">%</span></>
              : <span className="text-ink-4">—</span>}
          </p>
          <p className="font-mono text-[11px] text-ink-4 mt-1">
            Sobre {history?.summary?.active_days ?? 0} días con actividad.
          </p>
        </div>
        <div className="py-5 md:py-6 md:px-8">
          <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">Días activos</p>
          <p className="font-serif text-[44px] sm:text-[56px] lg:text-[64px] leading-tight mt-2">{history?.summary?.active_days ?? 0}</p>
          <p className="font-mono text-[11px] text-ink-4 mt-1">De {days} días totales.</p>
        </div>
        <div className="py-5 md:py-6 md:pl-8 border-b border-ink/20 md:border-b-0">
          <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">Línea base</p>
          <p className="font-serif text-[24px] sm:text-[28px] lg:text-[32px] leading-tight mt-3">{history?.range?.baseline_date ?? "—"}</p>
          <p className="font-mono text-[11px] text-ink-4 mt-1">
            Hasta hoy, {history?.range?.end_date ?? "—"}.
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
        <>
          {/* Daily trend chart */}
          <section className="mb-12">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
                  Tendencia diaria · {days}d
                </span>
                <h2 className="font-serif text-[32px] leading-tight mt-2">Cumplimiento día a día</h2>
              </div>
              <span className="font-mono text-[11px] text-ink-3">0% — 100%</span>
            </div>
            <div className="rounded-[14px] border border-ink/10 bg-paper p-4">
              <DailyTrend data={chartData.daily} />
            </div>
          </section>

          {/* Heatmap + monthly bars */}
          <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mb-12">
            <div className="rounded-[14px] border border-ink/10 bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
                  Constancia · {Math.round(heatCells.length / 7)} semanas
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-ink-4">menos</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((l) => (
                      <div key={l} className="heat-cell" data-level={l} />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-ink-4">más</span>
                </div>
              </div>
              {heatCells.length > 0 ? (
                <div className="grid gap-1 grid-cols-7 sm:grid-cols-[repeat(14,_minmax(0,_1fr))]">
                  {heatCells.map((lvl, i) => (
                    <div key={i} className="heat-cell" data-level={lvl} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-3">Sin datos disponibles.</p>
              )}
              <div className="flex justify-between mt-3">
                <span className="font-mono text-[10px] text-ink-4">{history?.range?.start_date}</span>
                <span className="font-mono text-[10px] text-ink-4">{history?.range?.end_date}</span>
              </div>
            </div>

            <div className="rounded-[14px] border border-ink/10 bg-paper p-4">
              <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
                Comparativa mensual
              </span>
              <h3 className="font-serif text-[28px] leading-tight mt-2 mb-5">Mes a mes</h3>
              <MonthBars data={chartData.monthly} />
            </div>
          </section>
        </>
      )}

      {/* Recommendations */}
      <section>
        <h2 className="font-serif text-[32px] leading-tight mb-6">Recomendaciones.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {historyInsights.map((insight, idx) => (
            <div
              key={`${insight.title}-${insight.text}`}
              className="rounded-[14px] border border-ink/10 bg-paper p-5"
            >
              <span className="font-mono text-[10px] tracking-[0.10em] uppercase text-ink-4">
                {String(idx + 1).padStart(2, "0")} · {insight.tone === "good" ? "Positivo" : insight.tone === "warn" ? "Atención" : "Info"}
              </span>
              <h4 className="font-serif text-[26px] leading-[1.15] mt-3 mb-2">{insight.title}</h4>
              <p className="text-[15px] text-ink-2 leading-[1.5]">{insight.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
