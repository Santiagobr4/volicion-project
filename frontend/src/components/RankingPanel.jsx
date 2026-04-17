import { useEffect, useMemo, useState } from "react";
import { getLeaderboard } from "../api/habits";
import { formatPercent, getCompletionTailwindClass } from "../utils/completion";
import LoadingSpinner from "./LoadingSpinner";
import defaultAvatar from "../assets/default-avatar.svg";

const getRankLabel = (index) => {
  if (index === 0) return "#1";
  if (index === 1) return "#2";
  if (index === 2) return "#3";
  return `#${index + 1}`;
};

const getRowStyle = (index) => {
  if (index === 0) {
    return "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-700/50";
  }
  if (index === 1) {
    return "bg-slate-100/90 dark:bg-slate-800/70 border-slate-300/70 dark:border-slate-600/70";
  }
  if (index === 2) {
    return "bg-orange-50/80 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-700/50";
  }
  return "bg-white/80 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-700/60";
};

const formatLeaderNames = (leaders) => {
  if (!leaders.length) return "";
  if (leaders.length === 1) return leaders[0].display_name;
  if (leaders.length === 2) {
    return `${leaders[0].display_name} y ${leaders[1].display_name}`;
  }
  return `${leaders[0].display_name}, ${leaders[1].display_name} y otros`;
};

const getMetricValue = (row, metricKey) => {
  if (metricKey === "daily") return row.daily_completion;
  if (metricKey === "weekly") return row.weekly_completion;
  return row.historical_completion;
};

const buildHighlightInsight = ({
  metricKey,
  title,
  highlight,
  perfectCount,
  metricLabel,
  ranking,
}) => {
  const perfectNote =
    perfectCount > 0
      ? metricLabel === "day"
        ? " Ya hay un puntaje perfecto hoy."
        : metricLabel === "week"
          ? " Ya hay una semana perfecta en juego."
          : " Ya se marcó un estándar perfecto histórico."
      : "";

  const noPerfectNote =
    metricLabel === "day"
      ? " Aún no hay puntaje perfecto hoy."
      : metricLabel === "week"
        ? " Aún no hay semana perfecta."
        : " Aún no hay puntaje perfecto histórico.";

  const score = highlight?.score;
  const leaders = highlight?.leaders || [];
  const totalParticipants = highlight?.total || 0;

  const scoredRows = (ranking || [])
    .filter((row) => getMetricValue(row, metricKey) !== null)
    .sort(
      (a, b) => getMetricValue(b, metricKey) - getMetricValue(a, metricKey),
    );

  const leaderNameSet = new Set(leaders.map((row) => row.username));
  const firstChaser = scoredRows.find(
    (row) => !leaderNameSet.has(row.username),
  );
  const chaserScore = firstChaser
    ? getMetricValue(firstChaser, metricKey)
    : null;
  const leadGap =
    chaserScore !== null && score !== null && score !== undefined
      ? score - chaserScore
      : null;

  if (score === null || score === undefined || totalParticipants === 0) {
    return {
      metricKey,
      title,
      text: `Todavía no hay una señal clara para ${metricLabel.toLowerCase()}.`,
      tone: "neutral",
    };
  }

  if (leaders.length === totalParticipants) {
    if (score === 100) {
      return {
        metricKey,
        title,
        text: "Todos están empatados al 100%. La constancia definirá el orden.",
        tone: "neutral",
      };
    }

    return {
      metricKey,
      title,
      text: `Todos están empatados en ${formatPercent(score)}. Un pequeño avance puede cambiar el orden.${perfectNote}`,
      tone: "neutral",
    };
  }

  if (leaders.length > 1) {
    if (score === 100) {
      return {
        metricKey,
        title,
        text: `${formatLeaderNames(leaders)} comparten un liderato perfecto.`,
        tone: "info",
      };
    }

    return {
      metricKey,
      title,
      text: `${formatLeaderNames(leaders)} están empatados en ${formatPercent(score)}.${perfectNote}`,
      tone: "info",
    };
  }

  if (score === 100) {
    if (firstChaser && chaserScore !== null) {
      return {
        metricKey,
        title,
        text: `${leaders[0].display_name} marca el ritmo con 100%, y ${firstChaser.display_name} lo sigue con ${formatPercent(chaserScore)}.`,
        tone: "good",
      };
    }

    return {
      metricKey,
      title,
      text: `${leaders[0].display_name} lidera en solitario con puntaje perfecto.`,
      tone: "good",
    };
  }

  if (leadGap !== null && leadGap <= 5) {
    return {
      metricKey,
      title,
      text: `${leaders[0].display_name} lidera con ${formatPercent(score)}, con ventaja mínima.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
      tone: "good",
    };
  }

  if (leadGap !== null && leadGap >= 15) {
    return {
      metricKey,
      title,
      text: `${leaders[0].display_name} lidera con ${formatPercent(score)} y ya abrió diferencia.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
      tone: "good",
    };
  }

  return {
    metricKey,
    title,
    text: `${leaders[0].display_name} lidera con ${formatPercent(score)}.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
    tone: "good",
  };
};

const insightCardClass = {
  daily:
    "border-amber-200/90 dark:border-amber-700/70 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900",
  weekly:
    "border-sky-200/90 dark:border-sky-700/70 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/20 dark:to-slate-900",
  historical:
    "border-emerald-200/90 dark:border-emerald-700/70 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900",
  neutral:
    "border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/70",
};

const insightBadgeClass = {
  daily: "text-amber-700 dark:text-amber-300",
  weekly: "text-sky-700 dark:text-sky-300",
  historical: "text-emerald-700 dark:text-emerald-300",
  neutral: "text-slate-600 dark:text-slate-300",
};

export default function RankingPanel({ refreshVersion = 0 }) {
  const [ranking, setRanking] = useState([]);
  const [highlights, setHighlights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadRanking = async () => {
      try {
        if (!isCancelled) {
          setLoading(true);
          setError("");
        }
        const payload = await getLeaderboard();
        if (!isCancelled) {
          setRanking(payload.results || []);
          setHighlights(payload.highlights || null);
        }
      } catch {
        if (!isCancelled) {
          setError("No pudimos cargar la clasificación.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadRanking();

    return () => {
      isCancelled = true;
    };
  }, [refreshVersion]);

  const rankingInsights = useMemo(() => {
    const dailyPerfect = ranking.filter(
      (row) => row.daily_completion === 100,
    ).length;
    const weeklyPerfect = ranking.filter(
      (row) => row.weekly_completion === 100,
    ).length;
    const historicalPerfect = ranking.filter(
      (row) => row.historical_completion === 100,
    ).length;

    return [
      buildHighlightInsight({
        metricKey: "daily",
        title: "Líder diario",
        highlight: highlights?.daily,
        perfectCount: dailyPerfect,
        metricLabel: "dia",
        ranking,
      }),
      buildHighlightInsight({
        metricKey: "weekly",
        title: "Líder semanal",
        highlight: highlights?.weekly,
        perfectCount: weeklyPerfect,
        metricLabel: "semana",
        ranking,
      }),
      buildHighlightInsight({
        metricKey: "historical",
        title: "Líder histórico de cumplimiento",
        highlight: highlights?.historical,
        perfectCount: historicalPerfect,
        metricLabel: "historico",
        ranking,
      }),
    ];
  }, [highlights, ranking]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 dark:bg-slate-900/80 dark:border-slate-700 p-6 shadow-sm">
        <LoadingSpinner label="Cargando clasificación..." />
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
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 dark:bg-slate-900/80 dark:border-slate-700 p-3 sm:p-4 md:p-6 shadow-sm">
      <div className="mb-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Clasificación</h2>

          <span className="text-xs font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            Período actual
          </span>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
          Basada en tu cumplimiento diario, semanal y mensual.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {rankingInsights.map((insight) => (
          <div
            key={`${insight.title}-${insight.text}`}
            className={`rounded-2xl border p-4 shadow-sm ${insightCardClass[insight.metricKey] || insightCardClass.neutral}`}
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${insightBadgeClass[insight.metricKey] || insightBadgeClass.neutral}`}
            >
              {insight.title}
            </p>
            <p className="text-sm mt-2 leading-6 opacity-90">{insight.text}</p>
          </div>
        ))}
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[680px] text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-slate-500 text-sm border-b border-slate-200 dark:border-slate-700">
              <th className="py-2">#</th>
              <th className="py-2">Usuario</th>
              <th className="py-2">Diario</th>
              <th className="py-2">Semanal</th>
              <th className="py-2">Mensual</th>
              <th className="py-2">Histórico</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, index) => (
              <tr
                key={`${row.username}-${index}`}
                className={`border ${getRowStyle(index)}`}
              >
                <td className="py-3 pl-3">
                  <span className="inline-flex items-center justify-center min-w-10 h-8 rounded-lg border border-slate-300/80 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 text-sm font-semibold">
                    {getRankLabel(index)}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={row.avatar_file_url || defaultAvatar}
                      alt={row.display_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                    />
                    <div>
                      <p className="font-medium">{row.display_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        @{row.username}
                      </p>
                    </div>
                  </div>
                </td>
                <td
                  className={`py-3 font-semibold ${getCompletionTailwindClass(row.daily_completion)}`}
                >
                  {formatPercent(row.daily_completion)}
                </td>
                <td
                  className={`py-3 font-semibold ${getCompletionTailwindClass(row.weekly_completion)}`}
                >
                  {formatPercent(row.weekly_completion)}
                </td>
                <td
                  className={`py-3 font-semibold pr-3 ${getCompletionTailwindClass(row.monthly_completion)}`}
                >
                  {formatPercent(row.monthly_completion)}
                </td>
                <td
                  className={`py-3 pr-3 font-semibold ${getCompletionTailwindClass(row.historical_completion)}`}
                >
                  {formatPercent(row.historical_completion)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
