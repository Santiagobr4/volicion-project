import { useEffect, useMemo, useState } from "react";
import { getLeaderboard } from "../api/habits";
import { formatPercent, getCompletionTailwindClass } from "../utils/completion";
import LoadingSpinner from "./LoadingSpinner";
import defaultAvatar from "../assets/default-avatar.svg";

const METRIC_COPY = {
  daily: {
    rankLabel: "rendimiento diario",
    context: "hoy",
    trendLabel: "ritmo del día",
    tieHint: "el día aún está abierto",
    noSignal:
      "Aún no hay suficiente actividad de hoy para definir un líder diario.",
  },
  weekly: {
    rankLabel: "rendimiento semanal",
    context: "esta semana",
    trendLabel: "consistencia semanal",
    tieHint: "la semana todavía se puede mover",
    noSignal:
      "Todavía no hay una tendencia semanal suficiente para marcar liderazgo.",
  },
  historical: {
    rankLabel: "rendimiento histórico",
    context: "histórico acumulado",
    trendLabel: "constancia de largo plazo",
    tieHint: "el histórico cambia de forma gradual",
    noSignal:
      "Aún no hay base histórica suficiente para comparar la constancia entre usuarios.",
  },
};

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
  ranking,
}) => {
  const copy = METRIC_COPY[metricKey] || METRIC_COPY.historical;

  const perfectNote =
    perfectCount > 0 ? ` Ya existe un 100% en ${copy.context}.` : "";

  const noPerfectNote = ` Aún no hay 100% en ${copy.context}.`;

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
      text: copy.noSignal,
      tone: "neutral",
    };
  }

  if (leaders.length === totalParticipants) {
    if (score === 100) {
      const allPerfectTextByMetric = {
        daily:
          "Hoy todos están en 100% diario. El desempate llegará con el siguiente registro del día.",
        weekly:
          "Todos sostienen 100% semanal hasta ahora. Cualquier cambio en la semana puede mover el orden.",
        historical:
          "Todos mantienen 100% histórico acumulado. Solo una variación de constancia romperá este empate.",
      };
      return {
        metricKey,
        title,
        text:
          allPerfectTextByMetric[metricKey] ||
          `Todos están empatados al 100% en ${copy.context}. ${copy.tieHint}.`,
        tone: "neutral",
      };
    }

    const allTiedTextByMetric = {
      daily: `Hoy todos están empatados en ${formatPercent(score)} de cumplimiento diario. El próximo check-in puede mover posiciones.${perfectNote}`,
      weekly: `Esta semana todos van en ${formatPercent(score)} de cumplimiento semanal. Un par de registros puede cambiar el liderazgo.${perfectNote}`,
      historical: `Todos acumulan ${formatPercent(score)} en cumplimiento histórico. El orden cambiará cuando se consolide nueva constancia.${perfectNote}`,
    };

    return {
      metricKey,
      title,
      text:
        allTiedTextByMetric[metricKey] ||
        `Todos están empatados en ${formatPercent(score)} para ${copy.rankLabel}. Un pequeño avance puede cambiar el orden.${perfectNote}`,
      tone: "neutral",
    };
  }

  if (leaders.length > 1) {
    if (score === 100) {
      const sharedPerfectTextByMetric = {
        daily: `${formatLeaderNames(leaders)} comparten el primer lugar diario con 100% hoy.`,
        weekly: `${formatLeaderNames(leaders)} están igualados en el liderato semanal con 100%.`,
        historical: `${formatLeaderNames(leaders)} comparten la cima histórica con 100% acumulado.`,
      };
      return {
        metricKey,
        title,
        text:
          sharedPerfectTextByMetric[metricKey] ||
          `${formatLeaderNames(leaders)} comparten liderato perfecto en ${copy.context}.`,
        tone: "info",
      };
    }

    const sharedLeadTextByMetric = {
      daily: `${formatLeaderNames(leaders)} están empatados en ${formatPercent(score)} en el ranking diario.${perfectNote}`,
      weekly: `${formatLeaderNames(leaders)} comparten ${formatPercent(score)} en la clasificación semanal.${perfectNote}`,
      historical: `${formatLeaderNames(leaders)} están igualados con ${formatPercent(score)} en el histórico de cumplimiento.${perfectNote}`,
    };

    return {
      metricKey,
      title,
      text:
        sharedLeadTextByMetric[metricKey] ||
        `${formatLeaderNames(leaders)} están empatados en ${formatPercent(score)} de ${copy.rankLabel}.${perfectNote}`,
      tone: "info",
    };
  }

  if (score === 100) {
    if (firstChaser && chaserScore !== null) {
      const perfectLeadWithChaserByMetric = {
        daily: `${leaders[0].display_name} lidera hoy con 100% diario. ${firstChaser.display_name} persigue con ${formatPercent(chaserScore)} en el cierre del día.`,
        weekly: `${leaders[0].display_name} marca 100% semanal. ${firstChaser.display_name} va con ${formatPercent(chaserScore)} y sigue en carrera esta semana.`,
        historical: `${leaders[0].display_name} lidera el histórico con 100%. ${firstChaser.display_name} aparece detrás con ${formatPercent(chaserScore)} de constancia acumulada.`,
      };
      return {
        metricKey,
        title,
        text:
          perfectLeadWithChaserByMetric[metricKey] ||
          `${leaders[0].display_name} lidera ${copy.context} con 100%. ${firstChaser.display_name} le sigue con ${formatPercent(chaserScore)} en ${copy.trendLabel}.`,
        tone: "good",
      };
    }

    const perfectSoloLeadByMetric = {
      daily: `${leaders[0].display_name} domina el día en solitario con 100% de cumplimiento diario.`,
      weekly: `${leaders[0].display_name} se mantiene solo en la cima semanal con 100%.`,
      historical: `${leaders[0].display_name} ocupa en solitario el primer lugar histórico con 100%.`,
    };

    return {
      metricKey,
      title,
      text:
        perfectSoloLeadByMetric[metricKey] ||
        `${leaders[0].display_name} lidera en solitario con 100% de ${copy.rankLabel}.`,
      tone: "good",
    };
  }

  if (leadGap !== null && leadGap <= 5) {
    const closeLeadTextByMetric = {
      daily: `${leaders[0].display_name} va primero hoy con ${formatPercent(score)} diario, pero la diferencia es mínima.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
      weekly: `${leaders[0].display_name} encabeza la semana con ${formatPercent(score)} y ventaja corta.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
      historical: `${leaders[0].display_name} lidera el histórico con ${formatPercent(score)}, con margen muy ajustado.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
    };
    return {
      metricKey,
      title,
      text:
        closeLeadTextByMetric[metricKey] ||
        `${leaders[0].display_name} lidera ${copy.context} con ${formatPercent(score)}, con ventaja mínima.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
      tone: "good",
    };
  }

  if (leadGap !== null && leadGap >= 15) {
    const wideLeadTextByMetric = {
      daily: `${leaders[0].display_name} abrió una diferencia clara hoy con ${formatPercent(score)} en diario.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
      weekly: `${leaders[0].display_name} ya tomó distancia en la semana con ${formatPercent(score)} de cumplimiento semanal.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
      historical: `${leaders[0].display_name} marca una brecha sólida en el histórico con ${formatPercent(score)} acumulado.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
    };
    return {
      metricKey,
      title,
      text:
        wideLeadTextByMetric[metricKey] ||
        `${leaders[0].display_name} lidera ${copy.context} con ${formatPercent(score)} y ya abrió diferencia en ${copy.rankLabel}.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
      tone: "good",
    };
  }

  const defaultLeadTextByMetric = {
    daily: `${leaders[0].display_name} lidera hoy con ${formatPercent(score)} en cumplimiento diario.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
    weekly: `${leaders[0].display_name} encabeza esta semana con ${formatPercent(score)} en cumplimiento semanal.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
    historical: `${leaders[0].display_name} va al frente del histórico con ${formatPercent(score)} de constancia acumulada.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
  };

  return {
    metricKey,
    title,
    text:
      defaultLeadTextByMetric[metricKey] ||
      `${leaders[0].display_name} lidera ${copy.context} con ${formatPercent(score)} en ${copy.rankLabel}.${perfectCount > 0 ? perfectNote : noPerfectNote}`,
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

const getMetricChipClass = (value) => {
  if (value >= 90) {
    return "border-emerald-200/90 bg-emerald-50/90 dark:border-emerald-700/70 dark:bg-emerald-950/20";
  }
  if (value >= 70) {
    return "border-sky-200/90 bg-sky-50/90 dark:border-sky-700/70 dark:bg-sky-950/20";
  }
  if (value >= 40) {
    return "border-amber-200/90 bg-amber-50/90 dark:border-amber-700/70 dark:bg-amber-950/20";
  }
  return "border-rose-200/90 bg-rose-50/90 dark:border-rose-700/70 dark:bg-rose-950/20";
};

export default function RankingPanel({ refreshVersion = 0 }) {
  const [ranking, setRanking] = useState([]);
  const [highlights, setHighlights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllMobileRanks, setShowAllMobileRanks] = useState(false);

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
          setShowAllMobileRanks(false);
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
        ranking,
      }),
      buildHighlightInsight({
        metricKey: "weekly",
        title: "Líder semanal",
        highlight: highlights?.weekly,
        perfectCount: weeklyPerfect,
        ranking,
      }),
      buildHighlightInsight({
        metricKey: "historical",
        title: "Líder histórico de cumplimiento",
        highlight: highlights?.historical,
        perfectCount: historicalPerfect,
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

  const mobileRanking = showAllMobileRanks ? ranking : ranking.slice(0, 3);

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
        <p className="text-xs text-slate-500 dark:text-slate-300 mt-2">
          Orden del ranking global: diario, luego semanal, luego mensual y por
          último histórico.
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

      {ranking.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 bg-slate-50/70 dark:bg-slate-800/70 text-sm text-slate-600 dark:text-slate-300">
          Todavía no hay participantes con datos suficientes para la
          clasificación.
        </div>
      )}

      {ranking.length > 0 && (
        <div className="md:hidden space-y-3 mb-4">
          {mobileRanking.map((row, index) => {
            return (
              <article
                key={`mobile-${row.username}-${index}`}
                className={`rounded-xl border p-3 ${getRowStyle(index)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center min-w-9 h-8 rounded-lg border border-slate-300/80 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 text-sm font-semibold">
                      {getRankLabel(index)}
                    </span>
                    <img
                      src={row.avatar_file_url || defaultAvatar}
                      alt={row.display_name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {row.display_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300 truncate">
                        @{row.username}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-center min-w-[140px]">
                    <div className="rounded-lg bg-white/70 dark:bg-slate-900/70 px-2 py-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Diario
                      </p>
                      <p
                        className={`text-xs font-semibold ${getCompletionTailwindClass(
                          row.daily_completion,
                        )}`}
                      >
                        {formatPercent(row.daily_completion)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/70 dark:bg-slate-900/70 px-2 py-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Semanal
                      </p>
                      <p
                        className={`text-xs font-semibold ${getCompletionTailwindClass(
                          row.weekly_completion,
                        )}`}
                      >
                        {formatPercent(row.weekly_completion)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/70 dark:bg-slate-900/70 px-2 py-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Mensual
                      </p>
                      <p
                        className={`text-xs font-semibold ${getCompletionTailwindClass(
                          row.monthly_completion,
                        )}`}
                      >
                        {formatPercent(row.monthly_completion)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/70 dark:bg-slate-900/70 px-2 py-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Histórico
                      </p>
                      <p
                        className={`text-xs font-semibold ${getCompletionTailwindClass(
                          row.historical_completion,
                        )}`}
                      >
                        {formatPercent(row.historical_completion)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {ranking.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllMobileRanks((prev) => !prev)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm cursor-pointer"
            >
              {showAllMobileRanks ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      )}

      <div className="hidden md:block max-w-full overflow-x-auto">
        <table className="w-full min-w-[680px] text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-slate-500 text-sm border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 px-2 text-center">#</th>
              <th className="py-2 px-2 text-left">Usuario</th>
              <th className="py-2 px-2 text-center">Diario</th>
              <th className="py-2 px-2 text-center">Semanal</th>
              <th className="py-2 px-2 text-center">Mensual</th>
              <th className="py-2 px-2 text-center">Histórico</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, index) => (
              <tr
                key={`${row.username}-${index}`}
                className={`border transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/80 ${getRowStyle(index)}`}
              >
                <td className="py-3 px-2 pl-3">
                  <span className="inline-flex items-center justify-center min-w-10 h-8 rounded-lg border border-slate-300/80 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 text-sm font-semibold">
                    {getRankLabel(index)}
                  </span>
                </td>
                <td className="py-3 px-2">
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
                <td className="py-3 px-2 text-center">
                  <span
                    className={`inline-flex min-w-20 items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-semibold shadow-xs ${getMetricChipClass(row.daily_completion)} ${getCompletionTailwindClass(row.daily_completion)}`}
                  >
                    {formatPercent(row.daily_completion)}
                  </span>
                </td>
                <td className="py-3 px-2 text-center">
                  <span
                    className={`inline-flex min-w-20 items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-semibold shadow-xs ${getMetricChipClass(row.weekly_completion)} ${getCompletionTailwindClass(row.weekly_completion)}`}
                  >
                    {formatPercent(row.weekly_completion)}
                  </span>
                </td>
                <td className="py-3 px-2 pr-3 text-center">
                  <span
                    className={`inline-flex min-w-20 items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-semibold shadow-xs ${getMetricChipClass(row.monthly_completion)} ${getCompletionTailwindClass(row.monthly_completion)}`}
                  >
                    {formatPercent(row.monthly_completion)}
                  </span>
                </td>
                <td className="py-3 px-2 pr-3 text-center">
                  <span
                    className={`inline-flex min-w-20 items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-semibold shadow-xs ${getMetricChipClass(row.historical_completion)} ${getCompletionTailwindClass(row.historical_completion)}`}
                  >
                    {formatPercent(row.historical_completion)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
