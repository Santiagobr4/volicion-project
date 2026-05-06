import { useMemo } from "react";
import CompletionRing from "./CompletionRing";
import { formatPercent } from "../utils/completion";
import {
  getIsoDayNameShort,
  formatReadableDateRange,
} from "../utils/dateLabels";
import { eyebrowClassName } from "./ui.js";

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
  isFirstWeek,
}) => {
  const validDaily = daily.filter(
    (row) => row && row.completion !== null && row.completion !== undefined,
  );
  const values = validDaily.map((row) => row.completion);
  const observedDays = values.length;
  const elapsedDays = Math.max(evaluatedDays ?? 0, observedDays);
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
      best === null || (row.completion ?? -1) > (best.completion ?? -1) ? row : best,
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
    return [{
      tone: "info",
      title: "Empieza por uno.",
      text: "Crea un hábito que sepas que vas a cumplir esta semana. La consistencia se construye sobre lo que ya funciona, no sobre lo que te gustaría hacer.",
    }];
  }

  if (isFutureWeek) {
    return [{
      tone: "info",
      title: "Esta semana aún no llega.",
      text: "Sin proyecciones por adelantado. Cuando arranque, los datos hablan.",
    }];
  }

  if (observedDays === 0) {
    if (isFirstWeek && evaluatedDays <= 1) {
      return [{
        tone: "info",
        title: "Día uno.",
        text: "Hoy basta con marcar un hábito — el más fácil, el que sepas que terminas en cinco minutos. Mañana esto cuesta menos.",
      }];
    }
    return [{
      tone: "warning",
      title: `${elapsedDays} ${elapsedDays === 1 ? "día" : "días"} sin marcar.`,
      text: "El tiempo corre igual. Pon una versión mínima de un hábito hoy y rompe la inercia antes de que pese más.",
    }];
  }

  if (focus?.completion !== null && focus?.completion !== undefined) {
    if (focus.completion >= 80) {
      cards.push({ tone: "success", title: "Día sólido.", text: "Lo que hiciste hoy es lo que sostiene una semana arriba del 70%. No agregues — repite mañana." });
    } else if (focus.completion >= 50) {
      cards.push({ tone: "warning", title: "Falta uno para cerrar bien.", text: "Estás a un hábito de que el día cuente como bueno. Elige el más rápido y termínalo antes de la noche." });
    } else {
      cards.push({ tone: "critical", title: "Día corto, pero rescatable.", text: "Forzarte más no rescata el día; bajar la exigencia sí. Cumple la versión más simple de un hábito — la que sale en cinco minutos sin pelearla." });
    }
  }

  if (elapsedDays > 0) {
    if (isStartPhase) {
      cards.push({ tone: "info", title: "Inicio de semana.", text: "Los primeros dos días definen el resto. Si encadenas dos buenos, el tercero baja de dificultad. Si fallas el segundo, todo cuesta el doble." });
    } else if (isMidPhase) {
      cards.push({ tone: "info", title: "Mitad de semana.", text: "Si algo no está saliendo, hoy es el día para ajustarlo, no en el cierre. Reduce un hábito en vez de saltártelo." });
    } else if (isLatePhase) {
      cards.push({ tone: "info", title: "Último tramo.", text: "El patrón de la semana ya se ve. No fuerces lo perdido — protege lo que sí estás cumpliendo hasta el domingo." });
    }
  } else {
    cards.push({ tone: "info", title: "Sin datos aún.", text: "A medida que avance la semana, los números se vuelven útiles. Por ahora, marca lo de hoy." });
  }

  if (week?.completion !== null && week?.completion !== undefined) {
    if (isStartPhase) {
      cards.push({ tone: "info", title: "Lectura temprana.", text: "Con uno o dos días, el porcentaje todavía exagera lo bueno y lo malo. Quédate con la dirección, no con el número." });
    } else if (week.completion >= 80) {
      cards.push({ tone: "success", title: "Semana en alto.", text: "Esto que estás haciendo funciona. Anota el contexto — hora del día, orden, qué quitaste. Eso es lo que vas a replicar." });
    } else if (week.completion >= 60) {
      cards.push({ tone: "info", title: "Cerca de tu mejor versión.", text: "Estás un escalón abajo. Dos hábitos extra antes del domingo y la semana cambia de zona, sin tocar los días que ya cerraron." });
    } else {
      cards.push({ tone: "warning", title: "Semana en recuperación.", text: "Elige un hábito ancla — el más fácil — y no lo sueltes los días que quedan. Ese sostiene a los demás." });
    }
  }

  if (!isStartPhase && observedDays >= 3 && trend === "up") {
    cards.push({ tone: "info", title: "Vas de menos a más.", text: "Algo está cambiando esta semana. Lo que sea — orden, hora, contexto — ese es el patrón que vale la pena fijar." });
  } else if (!isStartPhase && observedDays >= 3 && trend === "down") {
    cards.push({ tone: "warning", title: "Vienes perdiendo terreno.", text: "No es flojera, es fricción acumulada. Reduce o quita el hábito más pesado antes de romper la cadena entera." });
  }

  if (!isStartPhase && observedDays >= 3 && weakDays.length > 0) {
    cards.push({
      tone: weakRatio >= 0.35 ? "critical" : "warning",
      title: weakRatio >= 0.35
        ? `${weakDays.length} días flojos. Ya pesa.`
        : `${weakDays.length} día${weakDays.length === 1 ? "" : "s"} flojo${weakDays.length === 1 ? "" : "s"} esta semana.`,
      text: weakRatio >= 0.35
        ? "Esto no es un mal día puntual, es un patrón. Reduce el plan — tres hábitos cumplidos valen más que seis a medias."
        : "Cuando cae el ritmo, la solución no es compensar — es no acumular. Una versión ligera del hábito antes de dormir suele bastar.",
    });
  }

  if (!isStartPhase && observedDays >= 3 && bestDay) {
    if (hasMultiplePerfectDays) {
      const formattedPerfectDates = perfectDays.map((row) => formatInsightDate(row.date));
      cards.push({ tone: "success", title: `${perfectDays.length} días al 100% esta semana.`, text: `Cerraste perfecto ${formatDateList(formattedPerfectDates)}. Eso no es suerte — es repetible. Lo que hiciste distinto esos días es tu plan para la próxima semana.` });
    } else if (topDays.length > 1) {
      const tiedDates = topDays.map((row) => formatInsightDate(row.date));
      cards.push({ tone: "info", title: `Tu mejor nivel se repitió: ${formatPercent(maxCompletion)}.`, text: `Llegaste al mismo punto ${formatDateList(tiedDates)}. Cuando un máximo se repite, deja de ser casualidad y empieza a ser tu nivel real.` });
    } else {
      cards.push({ tone: "info", title: `Tu mejor día: ${formatInsightDate(bestDay.date)}.`, text: `${formatPercent(bestDay.completion)} es tu nivel real cuando todo cuadra. La pregunta no es por qué fue alto — es qué pasó ese día que quieres replicar.` });
    }
  }

  if (cards.length === 0) {
    cards.push({ tone: "info", title: "Sin lectura clara aún.", text: "Marca unos días más y aparecen recomendaciones específicas. Por ahora, repite mañana lo que hiciste hoy." });
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

function LineChart({ data }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-ink-3 text-center px-4">Aún no hay datos suficientes</p>
      </div>
    );
  }

  const w = 360, h = 140, pad = 8;
  if (data.length === 1) {
    const x = w / 2;
    const y = h - pad - (data[0].completion / 100) * (h - pad * 2);
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--ink)" strokeOpacity="0.1" />
        <circle cx={x} cy={y} r="4" fill="var(--ink)" />
      </svg>
    );
  }

  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((d, i) => [pad + i * stepX, h - pad - (d.completion / 100) * (h - pad * 2)]);
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : ` L${p[0]},${p[1]}`)).join("");
  const area = path + ` L${points[points.length - 1][0]},${h - pad} L${points[0][0]},${h - pad} Z`;
  const lastPt = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id="linechart-lg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--ink)" strokeOpacity="0.1" />
      <path d={area} fill="url(#linechart-lg)" />
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill="var(--ink)" />
    </svg>
  );
}

export default function TrackerInsights({ metrics }) {
  const daily = metrics?.daily || [];
  const safeDaily = daily.filter((row) => row && row.date);
  const focus = metrics?.focus;
  const week = metrics?.week;
  const isFirstWeek =
    metrics?.baseline_date && week?.start_date && metrics.baseline_date === week.start_date;
  const isCurrentWeek = metrics?.is_current_week;
  const weekPhase = metrics?.week_phase || (safeDaily.length === 0 ? "future" : "mid");
  const evaluatedDays = Math.max(metrics?.evaluated_days ?? 0, safeDaily.length);
  const totalDays = Math.max(metrics?.total_days ?? 7, evaluatedDays, 1);
  const insights = useMemo(
    () => buildInsights({ daily: safeDaily, focus, week, weekPhase, evaluatedDays, isFirstWeek }),
    [safeDaily, focus, week, weekPhase, evaluatedDays, isFirstWeek],
  );
  const hasNoHabitsConfigured = (focus?.total ?? 0) === 0 && (week?.total ?? 0) === 0;
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
  const getWeekNumber = (isoDate) => {
    if (!isoDate) return null;
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };
  const weekNum = getWeekNumber(week?.start_date);
  const sectionEyebrow = weekNum ? `LECTURA · SEMANA ${weekNum}` : "LECTURA";
  const daysAhead = Math.max(0, totalDays - Math.min(evaluatedDays, totalDays));
  const daySubtitle = weekPhase !== "future" && evaluatedDays > 0
    ? `Día ${Math.min(evaluatedDays, totalDays)} / ${totalDays} · ${daysAhead} día${daysAhead === 1 ? "" : "s"} por delante`
    : weekPhase === "future" ? "Semana aún no inicia" : progressSubtitle;

  const trendRawRows = safeDaily.slice(0, Math.max(evaluatedDays, 0));
  const trendChartData = trendRawRows
    .filter((row) =>
      Number.isFinite(
        typeof row?.completion === "number" ? row.completion : Number(row?.completion),
      ),
    )
    .map((row) => {
      const numericCompletion =
        typeof row.completion === "number" ? row.completion : Number(row.completion);
      return {
        day: getIsoDayNameShort(row.date),
        date: row.date,
        completion: Math.max(0, Math.min(100, numericCompletion)),
      };
    });

  const hasTrendData = trendChartData.length > 0;

  const trendDelta = trendChartData.length >= 2
    ? trendChartData[trendChartData.length - 1].completion - trendChartData[0].completion
    : 0;
  const trendArrow = trendDelta > 0 ? "↗" : trendDelta < 0 ? "↘" : "→";
  const trendSign = trendDelta > 0 ? "+" : "";

  const formatTrendDate = (iso) => {
    if (!iso) return "";
    const [, m, d] = iso.split("-");
    const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    return `${d}·${months[Number(m) - 1] || ""}`;
  };

  return (
    <div className="mt-10 border-t border-ink/10 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <span className={eyebrowClassName}>
            {sectionEyebrow}
          </span>
          <h2 className="font-serif text-[36px] leading-tight tracking-[-0.02em] mt-2">
            Cómo vas.
          </h2>
        </div>
        <span className={eyebrowClassName}>
          {daySubtitle}
        </span>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {insights.map((insight, idx) => {
          const isDark = idx === 2 && insights.length === 3;
          return (
            <div
              key={`${insight.title}-${insight.text}`}
              className={`rounded-[14px] border p-6 ${isDark ? "bg-ink border-ink" : "border-ink/10 bg-paper"}`}
            >
              <span className={`font-mono text-[11px] tracking-[0.12em] uppercase ${isDark ? "text-paper/55" : "text-ink-3"}`}>
                {insight.title}
              </span>
              <p className={`font-serif text-[22px] leading-[1.3] mt-3 ${isDark ? "text-paper" : "text-ink"}`}>
                {insight.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Performance grid */}
      <div className={`grid grid-cols-1 ${hasTrendData ? "lg:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
        <CompletionRing
          value={focus?.completion}
          title={focusLabel}
          subtitle={`${focus?.done ?? 0} de ${focus?.total ?? 0} completados hoy.`}
          accent="lime"
        />

        <CompletionRing
          value={week?.completion}
          title={weekLabel}
          subtitle={
            weekPhase === "future"
              ? "Esta semana todavía no inicia"
              : `${formatReadableDateRange(week?.start_date, week?.end_date)}.`
          }
          accent="ink"
        />

        {hasTrendData && (
          <div className="h-full rounded-[14px] border border-ink/10 p-5 bg-paper flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className={eyebrowClassName}>
                Tendencia {trendChartData.length} días
              </p>
              <span className="shrink-0 font-mono text-[11px] text-ink-3">
                {trendArrow} {trendSign}{Math.round(trendDelta)}%
              </span>
            </div>
            <div className="flex-1 min-h-[140px]">
              <LineChart data={trendChartData} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-mono text-[10px] text-ink-4">{formatTrendDate(trendChartData[0]?.date)}</span>
              <span className="font-mono text-[10px] text-ink-4">{formatTrendDate(trendChartData[trendChartData.length - 1]?.date)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
