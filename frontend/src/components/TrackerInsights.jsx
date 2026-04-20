import CompletionRing from "./CompletionRing";
import { formatPercent, getCompletionColor } from "../utils/completion";
import {
  getIsoDayNameShort,
  formatReadableDateRange,
} from "../utils/dateLabels";
import CardHeader from "./CardHeader";

const getBarHeight = (value) => {
  if (value === null || value === undefined) return 8;
  return Math.max(8, Math.round((value / 100) * 120));
};

const formatInsightDate = (isoDate) => {
  if (!isoDate) return "Fecha desconocida";
  return new Intl.DateTimeFormat("es-419", {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
};

const formatDateList = (dates) => {
  if (!dates.length) return "";
  if (dates.length === 1) return dates[0];
  if (dates.length === 2) return `${dates[0]} y ${dates[1]}`;
  return `${dates[0]}, ${dates[1]} y ${dates.length - 2} más`;
};

const toneStyles = {
  success:
    "border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/20",
  warning:
    "border-amber-200 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/20",
  critical:
    "border-rose-200 dark:border-rose-800/70 bg-rose-50/80 dark:bg-rose-950/20",
  info: "border-sky-200 dark:border-sky-800/70 bg-sky-50/80 dark:bg-sky-950/20",
};

const getTrendDirection = (values) => {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === null || last === null) return null;
  if (last > first) return "up";
  if (last < first) return "down";
  return "flat";
};

const buildInsights = ({
  daily,
  focus,
  week,
  weekPhase,
  evaluatedDays,
  totalDays,
  isFirstWeek,
}) => {
  const validDaily = daily.filter(
    (row) => row && row.completion !== null && row.completion !== undefined,
  );
  const values = validDaily.map((row) => row.completion);
  const observedDays = values.length;
  const elapsedDays = Math.max(evaluatedDays ?? 0, observedDays);
  const cappedTotalDays = Math.max(totalDays ?? 7, elapsedDays, 1);
  const hasNoHabitsConfigured =
    (focus?.total ?? 0) === 0 && (week?.total ?? 0) === 0;
  const isFutureWeek = weekPhase === "future";
  const isStartPhase = weekPhase === "start";
  const isMidPhase = weekPhase === "mid";
  const isLatePhase = weekPhase === "late" || weekPhase === "complete";
  const weakDays = validDaily.filter((row) => row.completion < 50);
  const weakRatio = weakDays.length / Math.max(observedDays, 1);
  const trend = getTrendDirection(values);

  const bestDay = validDaily.reduce(
    (best, row) =>
      best === null || (row.completion ?? -1) > (best.completion ?? -1)
        ? row
        : best,
    null,
  );

  const maxCompletion = bestDay?.completion ?? null;
  const topDays =
    maxCompletion === null
      ? []
      : validDaily.filter((row) => row.completion === maxCompletion);

  const perfectDays = validDaily.filter((row) => row.completion === 100);
  const hasMultiplePerfectDays = perfectDays.length > 1;

  const cards = [];

  if (hasNoHabitsConfigured) {
    return [
      {
        tone: "info",
        title: "Tu panel está listo para arrancar",
        text: "Aún no tienes hábitos activos en esta semana. Crea uno pequeño para comenzar a generar métricas útiles.",
      },
    ];
  }

  if (isFutureWeek) {
    return [
      {
        tone: "info",
        title: "Semana aún no iniciada",
        text: "Cuando llegue esta semana, verás progreso real día por día. Por ahora no hacemos proyecciones.",
      },
    ];
  }

  if (observedDays === 0) {
    if (isFirstWeek && evaluatedDays <= 1) {
      return [
        {
          tone: "info",
          title: "Primer día: construye inercia",
          text: "Tu objetivo hoy no es la perfección, es arrancar. Completa una versión mínima y mañana será más fácil.",
        },
      ];
    }

    return [
      {
        tone: "warning",
        title: "Semana sin registros todavía",
        text: `Ya transcurrieron ${elapsedDays} de ${cappedTotalDays} días, pero aún no registras actividad. Arranca con un hábito sencillo hoy para activar tus insights.`,
      },
    ];
  }

  if (focus?.completion !== null && focus?.completion !== undefined) {
    if (focus.completion >= 80) {
      cards.push({
        tone: "success",
        title: "Hoy vas sólido",
        text: "Se nota consistencia. Mantén este mismo umbral para cerrar la semana fuerte.",
      });
    } else if (focus.completion >= 50) {
      cards.push({
        tone: "warning",
        title: "Hoy estás cerca",
        text: "Con un hábito más terminado, el día cambia de nivel y mejora tu promedio semanal.",
      });
    } else {
      cards.push({
        tone: "critical",
        title: "Hoy toca destrabar",
        text: "No busques hacerlo perfecto: cumple una versión mínima ahora y recupera tracción.",
      });
    }
  }

  if (elapsedDays > 0) {
    if (isStartPhase) {
      cards.push({
        tone: "info",
        title: "Inicio de semana",
        text: `Llevas ${elapsedDays} de ${cappedTotalDays} días transcurridos. Prioriza continuidad: dos días seguidos valen más que un día perfecto aislado.`,
      });
    } else if (isMidPhase) {
      cards.push({
        tone: "info",
        title: "Mitad de semana",
        text: `Ya tienes ${elapsedDays} de ${cappedTotalDays} días transcurridos. Este es el mejor momento para ajustar carga y proteger tus hábitos clave.`,
      });
    } else if (isLatePhase) {
      cards.push({
        tone: "info",
        title: "Cierre en construcción",
        text: `Has recorrido ${elapsedDays} de ${cappedTotalDays} días. Tu patrón ya es claro: enfócate en cerrar fuerte, no en compensar todo de golpe.`,
      });
    }
  } else {
    cards.push({
      tone: "info",
      title: "Aún no hay días evaluados",
      text: "A medida que avance la semana, aquí aparecerán métricas más precisas.",
    });
  }

  if (week?.completion !== null && week?.completion !== undefined) {
    if (isStartPhase) {
      cards.push({
        tone: "info",
        title: "Lectura temprana",
        text: "El porcentaje aún fluctúa mucho. Quédate con la dirección, no con el número exacto.",
      });
    } else if (week.completion >= 80) {
      cards.push({
        tone: "success",
        title: "Semana muy sólida",
        text: "Tu sistema está funcionando. Conserva la estructura actual y evita cambios bruscos.",
      });
    } else if (week.completion >= 60) {
      cards.push({
        tone: "info",
        title: "Base semanal estable",
        text: "Vas en buen camino. Un cierre consistente puede llevarte al siguiente nivel.",
      });
    } else {
      cards.push({
        tone: "warning",
        title: "Semana en recuperación",
        text: "Elige un hábito ancla y protégelo hasta el cierre; eso suele levantar todo el tablero.",
      });
    }
  }

  if (!isStartPhase && observedDays >= 3 && trend === "up") {
    cards.push({
      tone: "info",
      title: "Tendencia positiva",
      text: "Vas de menos a más. Repite el contexto de tus mejores días para consolidarlo.",
    });
  } else if (!isStartPhase && observedDays >= 3 && trend === "down") {
    cards.push({
      tone: "warning",
      title: "Tendencia en descenso",
      text: "Reduce fricción hoy: simplifica el hábito más pesado y vuelve a encadenar días cumplidos.",
    });
  }

  if (!isStartPhase && observedDays >= 3 && weakDays.length > 0) {
    cards.push({
      tone: weakRatio >= 0.35 ? "critical" : "warning",
      title: `${weakDays.length} día${weakDays.length === 1 ? "" : "s"} con baja adherencia`,
      text:
        weakRatio >= 0.35
          ? "Los días flojos ya impactan tu semana. Define una versión de emergencia para no cortar la cadena."
          : "Tu siguiente salto está en estabilizar los días flojos con una meta mínima clara.",
    });
  }

  if (!isStartPhase && observedDays >= 3 && bestDay) {
    if (hasMultiplePerfectDays) {
      const formattedPerfectDates = perfectDays.map((row) =>
        formatInsightDate(row.date),
      );
      cards.push({
        tone: "success",
        title: `${perfectDays.length} días perfectos esta semana`,
        text: `Lograste 100% en ${formatDateList(formattedPerfectDates)}. Eso confirma que tu sistema funciona, así que protege ese ritmo.`,
      });
    } else if (topDays.length > 1) {
      const tiedDates = topDays.map((row) => formatInsightDate(row.date));
      cards.push({
        tone: "info",
        title: `Mejores días de la semana: ${formatPercent(maxCompletion)}`,
        text: `Tu mejor resultado se repitió en ${formatDateList(tiedDates)}. Estás creando logros repetibles; refuerza ese patrón.`,
      });
    } else {
      cards.push({
        tone: "info",
        title: `Mejor día de la semana: ${formatInsightDate(bestDay.date)}`,
        text: `${formatPercent(bestDay.completion)} fue tu punto más alto. Repite ese contexto y vuelve ese buen día tu nueva normalidad.`,
      });
    }
  }

  if (cards.length === 0) {
    cards.push({
      tone: "info",
      title: "Señales en construcción",
      text: "Mantén la constancia unos días más y aparecerán recomendaciones más precisas y accionables.",
    });
  }

  const hasCriticalWeakSignal = weakRatio >= 0.35;
  const orderedCards = hasCriticalWeakSignal
    ? cards.sort((a, b) => {
        const rank = { critical: 0, warning: 1, info: 2, success: 3 };
        return (rank[a.tone] ?? 99) - (rank[b.tone] ?? 99);
      })
    : cards;

  return orderedCards.slice(0, 3);
};

export default function TrackerInsights({ metrics }) {
  const daily = metrics?.daily || [];
  const safeDaily = daily.filter((row) => row && row.date);
  const focus = metrics?.focus;
  const week = metrics?.week;
  const isFirstWeek =
    metrics?.baseline_date &&
    week?.start_date &&
    metrics.baseline_date === week.start_date;
  const isCurrentWeek = metrics?.is_current_week;
  const weekPhase =
    metrics?.week_phase || (safeDaily.length === 0 ? "future" : "mid");
  const evaluatedDays = Math.max(
    metrics?.evaluated_days ?? 0,
    safeDaily.length,
  );
  const totalDays = Math.max(metrics?.total_days ?? 7, evaluatedDays, 1);
  const insights = buildInsights({
    daily: safeDaily,
    focus,
    week,
    weekPhase,
    evaluatedDays,
    totalDays,
    isFirstWeek,
  });
  const hasNoHabitsConfigured =
    (focus?.total ?? 0) === 0 && (week?.total ?? 0) === 0;
  const focusLabel = hasNoHabitsConfigured
    ? "Sin hábitos activos"
    : weekPhase === "future"
      ? "Sin datos evaluados"
      : isCurrentWeek
        ? "Cumplimiento de hoy"
        : `Cumplimiento del ${metrics?.focus_date}`;
  const weekLabel = hasNoHabitsConfigured
    ? "Panel sin actividad"
    : weekPhase === "future"
      ? "Semana futura"
      : isCurrentWeek
        ? "Semana en curso"
        : "Cierre de semana";
  const progressSubtitle = hasNoHabitsConfigured
    ? "Activa hábitos para ver métricas"
    : weekPhase === "future"
      ? "Semana aún no inicia"
      : `Semana en día ${Math.min(evaluatedDays, totalDays)} de ${totalDays}`;
  const hasPartialDataContext =
    !hasNoHabitsConfigured &&
    weekPhase !== "future" &&
    weekPhase !== "complete" &&
    evaluatedDays > 0 &&
    evaluatedDays < totalDays;
  const showTrendInline = safeDaily.length > 0 && safeDaily.length <= 7;

  return (
    <div className="mt-7 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="text-lg font-semibold">Rendimiento actual</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
          <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 px-3 py-1">
            {progressSubtitle}
          </span>
          <span className="hidden sm:inline">
            Línea base desde {metrics?.baseline_date}
          </span>
        </div>
      </div>

      {hasPartialDataContext && (
        <div className="mb-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-800/50 px-4 py-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Aún es pronto en la semana. Estas lecturas llegan hasta el día{" "}
            {Math.min(evaluatedDays, totalDays)} de {totalDays}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {insights.map((insight) => (
          <div
            key={`${insight.title}-${insight.text}`}
            className={`rounded-2xl border p-4 shadow-sm ${toneStyles[insight.tone]}`}
          >
            <p className="text-sm font-semibold">{insight.title}</p>
            <p className="text-sm mt-2 leading-6 opacity-90">{insight.text}</p>
          </div>
        ))}
      </div>

      <div
        className={`grid grid-cols-1 ${showTrendInline ? "lg:grid-cols-3" : "md:grid-cols-2"} gap-4 mb-6`}
      >
        <CompletionRing
          value={focus?.completion}
          title={focusLabel}
          subtitle={`${focus?.done ?? 0} completados de ${focus?.total ?? 0}`}
        />

        <CompletionRing
          value={week?.completion}
          title={weekLabel}
          subtitle={
            weekPhase === "future"
              ? "Esta semana todavía no inicia"
              : `${formatReadableDateRange(week?.start_date, week?.end_date)} · ${progressSubtitle}`
          }
        />

        {showTrendInline && (
          <div className="h-full rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800/70 flex flex-col">
            <CardHeader
              title="Tendencia semanal"
              badge={formatPercent(week?.completion)}
            />
            <div className="flex-1 flex items-end gap-2 pb-1 justify-between min-h-32">
              {safeDaily.map((row) => (
                <div key={row.date} className="flex-1 min-w-8 text-center">
                  <div className="h-32 flex items-end justify-center">
                    <div
                      className="w-full max-w-7 rounded-t-md"
                      style={{ height: `${getBarHeight(row.completion)}px` }}
                      title={formatPercent(row.completion)}
                      aria-label={`${row.date} ${formatPercent(row.completion)}`}
                    >
                      <div
                        className="w-full h-full rounded-t-md"
                        style={{
                          backgroundColor: getCompletionColor(row.completion),
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {getIsoDayNameShort(row.date)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center min-h-8">
              {formatReadableDateRange(week?.start_date, week?.end_date)}
            </p>
          </div>
        )}
      </div>

      {!showTrendInline && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800/70">
          <CardHeader
            title="Tendencia semanal"
            badge={formatPercent(week?.completion)}
          />
          <div className="flex items-end gap-3 h-36 overflow-x-auto pb-1">
            {safeDaily.length === 0 && (
              <p className="text-sm text-slate-500">
                Aún no hay datos para esta semana.
              </p>
            )}

            {safeDaily.map((row) => (
              <div key={row.date} className="min-w-10 text-center">
                <div className="h-32 flex items-end justify-center">
                  <div
                    className="w-7 rounded-t-md"
                    style={{ height: `${getBarHeight(row.completion)}px` }}
                    title={formatPercent(row.completion)}
                    aria-label={`${row.date} ${formatPercent(row.completion)}`}
                  >
                    <div
                      className="w-full h-full rounded-t-md"
                      style={{
                        backgroundColor: getCompletionColor(row.completion),
                      }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {getIsoDayNameShort(row.date)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center min-h-8">
            {formatReadableDateRange(week?.start_date, week?.end_date)}
          </p>
        </div>
      )}
    </div>
  );
}
