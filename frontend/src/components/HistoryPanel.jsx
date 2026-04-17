import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getHistory } from "../api/habits";
import { getCompletionColor } from "../utils/completion";
import LoadingSpinner from "./LoadingSpinner";

const RANGE_OPTIONS = [30, 90, 180, 365];

/**
 * Build adaptive coaching insights from history payload and selected window.
 */
const buildHistoryInsights = (history, days) => {
  if (!history) return [];

  const validDaily = (history.daily || []).filter(
    (row) => row && row.completion !== null && row.completion !== undefined,
  );
  const values = validDaily.map((row) => row.completion);
  if (values.length === 0) {
    return [
      {
        tone: "neutral",
        title: "Todavía no hay suficiente historial",
        text: "Registra unos días más para ver recomendaciones útiles.",
      },
    ];
  }

  const thresholds =
    days <= 30
      ? { high: 80, medium: 60 }
      : days <= 90
        ? { high: 75, medium: 55 }
        : days <= 180
          ? { high: 70, medium: 50 }
          : { high: 68, medium: 48 };

  const average =
    values.reduce((acc, value) => acc + value, 0) / Math.max(values.length, 1);
  const weakDays = values.filter((value) => value < 50).length;
  const weakDayRatio = weakDays / Math.max(values.length, 1);
  const bestDay = validDaily.reduce(
    (best, row) =>
      best === null || (row.completion ?? -1) > (best.completion ?? -1)
        ? row
        : best,
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
      title: "Buen ritmo",
      text: "Tu constancia va bien. Mantén el ritmo.",
    });
  } else if (average >= thresholds.medium) {
    cards.push({
      tone: "neutral",
      title: "Base estable",
      text: "Estás cerca del siguiente nivel. Un hábito extra en días flojos puede marcar diferencia.",
    });
  } else {
    cards.push({
      tone: "warn",
      title: "Aún falta impulso",
      text: "Baja la exigencia en días difíciles y cuida tu racha.",
    });
  }

  if (trend === "up") {
    cards.push({
      tone: "good",
      title: "La tendencia mejora",
      text: `Tu cumplimiento mejoró en los últimos ${days} días. Repite lo que funcionó.`,
    });
  } else if (trend === "down") {
    cards.push({
      tone: "warn",
      title: "Hay una baja",
      text: `Tu cumplimiento bajó en los últimos ${days} días. Vuelve a una base diaria.`,
    });
  }

  if (weakDays > 0) {
    cards.push({
      tone: weakDayRatio >= 0.35 ? "warn" : "neutral",
      title: `${weakDays} día${weakDays === 1 ? "" : "s"} flojo${weakDays === 1 ? "" : "s"}`,
      text:
        weakDayRatio >= 0.35
          ? "Protege esos días con una versión ligera de tu rutina."
          : "Define una versión de respaldo para mantener el ritmo.",
    });
  } else if (bestDay) {
    cards.push({
      tone: "good",
      title: `Mejor día: ${bestDay.date}`,
      text: "Ya sabes qué te funciona. Repite ese contexto.",
    });
  }

  return cards.slice(0, 3);
};

const historyInsightTone = {
  good: "border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/20",
  warn: "border-amber-200 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/20",
  neutral:
    "border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/70",
};

const useElementWidth = () => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setWidth((prev) => (prev === nextWidth ? prev : nextWidth));
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateWidth();
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    const onResize = () => updateWidth();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return [containerRef, width];
};

/**
 * History analytics panel with responsive charts and range-based insights.
 */
export default function HistoryPanel({ refreshVersion = 0 }) {
  const [days, setDays] = useState(90);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dailyContainerRef, dailyWidth] = useElementWidth();
  const [weeklyContainerRef, weeklyWidth] = useElementWidth();
  const [monthlyContainerRef, monthlyWidth] = useElementWidth();

  useEffect(() => {
    let isCancelled = false;

    const fetchHistory = async () => {
      try {
        if (!isCancelled) {
          setLoading(true);
          setError("");
        }
        const payload = await getHistory({ days });
        if (!isCancelled) {
          setHistory(payload);
        }
      } catch {
        if (!isCancelled) {
          setError("No pudimos cargar las métricas históricas.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isCancelled = true;
    };
  }, [days, refreshVersion]);

  const chartData = useMemo(() => {
    if (!history) return { daily: [], weekly: [], monthly: [] };

    return {
      daily: history.daily.map((row) => ({
        label: row.date.slice(5),
        completion: row.completion,
      })),
      weekly: history.weekly.map((row) => ({
        label: row.start_date.slice(5),
        completion: row.completion,
      })),
      monthly: history.monthly.map((row) => ({
        label: row.month,
        completion: row.completion,
      })),
    };
  }, [history]);

  const hasAnyMetricData =
    (history?.daily || []).some((row) => row.completion !== null) ||
    (history?.weekly || []).some((row) => row.completion !== null) ||
    (history?.monthly || []).some((row) => row.completion !== null);

  const historyInsights = useMemo(
    () => buildHistoryInsights(history, days),
    [history, days],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 dark:bg-slate-900/80 dark:border-slate-700 p-6 shadow-sm">
        <LoadingSpinner label="Cargando historial..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 text-red-600 p-6 dark:bg-red-950/30 dark:border-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 dark:bg-slate-900/80 dark:border-slate-700 p-3 sm:p-4 md:p-6 shadow-sm overflow-hidden">
        <div className="mb-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-linear-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-3 sm:p-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Historial
              </p>
              <h2 className="text-xl font-semibold mt-1">
                Historial y analítica
              </h2>
            </div>

            <div className="inline-flex rounded-xl border border-slate-300 dark:border-slate-600 p-1 bg-slate-100/70 dark:bg-slate-800/80 overflow-x-auto">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm transition whitespace-nowrap cursor-pointer ${
                    days === option
                      ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {option}d
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-300 mt-3">
            Recomendaciones según el rango que elegiste.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Promedio de cumplimiento
            </p>
            <p className="text-2xl font-bold mt-1">
              {history?.summary?.average_daily_completion !== null
                ? `${history.summary.average_daily_completion}%`
                : "N/D"}
            </p>
          </div>

          <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Días activos
            </p>
            <p className="text-2xl font-bold mt-1">
              {history?.summary?.active_days ?? 0}
            </p>
          </div>

          <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-300">Rango</p>
            <p className="text-sm font-medium mt-2">
              {history?.range?.start_date} a {history?.range?.end_date}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
              Línea base de métricas: {history?.range?.baseline_date}
            </p>
          </div>
        </div>

        {!hasAnyMetricData && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 bg-slate-50/70 dark:bg-slate-800/70">
            Aún no hay métricas para este período. Las métricas comienzan desde
            la fecha de creación de tu cuenta y de tus hábitos.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 min-w-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 min-w-0">
            <h3 className="font-medium mb-3">
              Tendencia diaria de cumplimiento
            </h3>
            <div ref={dailyContainerRef} className="h-64 min-w-0">
              <LineChart
                width={Math.max(220, dailyWidth)}
                height={256}
                data={chartData.daily}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="label" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="completion"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (
                      payload?.completion === null ||
                      payload?.completion === undefined
                    ) {
                      return null;
                    }

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill={getCompletionColor(payload.completion)}
                      />
                    );
                  }}
                />
              </LineChart>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 min-w-0">
              <h3 className="font-medium mb-3">Comparativa semanal</h3>
              <div ref={weeklyContainerRef} className="h-56 min-w-0">
                <BarChart
                  width={Math.max(220, weeklyWidth)}
                  height={224}
                  data={chartData.weekly}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis dataKey="label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="completion" radius={[6, 6, 0, 0]}>
                    {chartData.weekly.map((entry, index) => (
                      <Cell
                        key={`weekly-cell-${entry.label}-${index}`}
                        fill={getCompletionColor(entry.completion)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 min-w-0">
              <h3 className="font-medium mb-3">Comparativa mensual</h3>
              <div ref={monthlyContainerRef} className="h-56 min-w-0">
                <BarChart
                  width={Math.max(220, monthlyWidth)}
                  height={224}
                  data={chartData.monthly}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis dataKey="label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="completion" radius={[6, 6, 0, 0]}>
                    {chartData.monthly.map((entry, index) => (
                      <Cell
                        key={`monthly-cell-${entry.label}-${index}`}
                        fill={getCompletionColor(entry.completion)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
            <h3 className="font-semibold">Recomendaciones</h3>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Base de métricas: {history?.range?.baseline_date}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {historyInsights.map((insight) => (
              <div
                key={`${insight.title}-${insight.text}`}
                className={`rounded-xl border p-3 ${historyInsightTone[insight.tone]}`}
              >
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="text-sm mt-2 leading-6 opacity-90">
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
