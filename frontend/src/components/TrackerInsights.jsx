import CompletionRing from "./CompletionRing";
import { formatPercent } from "../utils/completion";
import {
  getIsoDayNameShort,
  formatReadableDateRange,
} from "../utils/dateLabels";

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
  success:  "border-lime/30 bg-lime/8",
  warning:  "border-gold/30 bg-gold/8",
  critical: "border-signal/25 bg-signal-soft",
  info:     "border-ink/10 bg-paper-2",
};

const toneEyebrows = {
  success:  "Positivo",
  warning:  "Atención",
  critical: "Crítico",
  info:     "Info",
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
      title: "Tu panel está listo para arrancar",
      text: "Aún no tienes hábitos activos en esta semana. Crea uno pequeño para comenzar a generar métricas útiles.",
    }];
  }

  if (isFutureWeek) {
    return [{
      tone: "info",
      title: "Semana aún no iniciada",
      text: "Cuando llegue esta semana, verás progreso real día por día. Por ahora no hacemos proyecciones.",
    }];
  }

  if (observedDays === 0) {
    if (isFirstWeek && evaluatedDays <= 1) {
      return [{
        tone: "info",
        title: "Primer día: construye inercia",
        text: "Tu objetivo hoy no es la perfección, es arrancar. Completa una versión mínima y mañana será más fácil.",
      }];
    }
    return [{
      tone: "warning",
      title: "Semana sin registros todavía",
      text: `Ya transcurrieron ${elapsedDays} de ${cappedTotalDays} días, pero aún no registras actividad. Arranca con un hábito sencillo hoy para activar tus insights.`,
    }];
  }

  if (focus?.completion !== null && focus?.completion !== undefined) {
    if (focus.completion >= 80) {
      cards.push({ tone: "success", title: "Hoy vas sólido", text: "Se nota consistencia. Mantén este mismo umbral para cerrar la semana fuerte." });
    } else if (focus.completion >= 50) {
      cards.push({ tone: "warning", title: "Hoy estás cerca", text: "Con un hábito más terminado, el día cambia de nivel y mejora tu promedio semanal." });
    } else {
      cards.push({ tone: "critical", title: "Hoy toca destrabar", text: "No busques hacerlo perfecto: cumple una versión mínima ahora y recupera tracción." });
    }
  }

  if (elapsedDays > 0) {
    if (isStartPhase) {
      cards.push({ tone: "info", title: "Inicio de semana", text: `Llevas ${elapsedDays} de ${cappedTotalDays} días transcurridos. Prioriza continuidad: dos días seguidos valen más que un día perfecto aislado.` });
    } else if (isMidPhase) {
      cards.push({ tone: "info", title: "Mitad de semana", text: `Ya tienes ${elapsedDays} de ${cappedTotalDays} días transcurridos. Este es el mejor momento para ajustar carga y proteger tus hábitos clave.` });
    } else if (isLatePhase) {
      cards.push({ tone: "info", title: "Cierre en construcción", text: `Has recorrido ${elapsedDays} de ${cappedTotalDays} días. Tu patrón ya es claro: enfócate en cerrar fuerte, no en compensar todo de golpe.` });
    }
  } else {
    cards.push({ tone: "info", title: "Aún no hay días evaluados", text: "A medida que avance la semana, aquí aparecerán métricas más precisas." });
  }

  if (week?.completion !== null && week?.completion !== undefined) {
    if (isStartPhase) {
      cards.push({ tone: "info", title: "Lectura temprana", text: "El porcentaje aún fluctúa mucho. Quédate con la dirección, no con el número exacto." });
    } else if (week.completion >= 80) {
      cards.push({ tone: "success", title: "Semana muy sólida", text: "Tu sistema está funcionando. Conserva la estructura actual y evita cambios bruscos." });
    } else if (week.completion >= 60) {
      cards.push({ tone: "info", title: "Base semanal estable", text: "Vas en buen camino. Un cierre consistente puede llevarte al siguiente nivel." });
    } else {
      cards.push({ tone: "warning", title: "Semana en recuperación", text: "Elige un hábito ancla y protégelo hasta el cierre; eso suele levantar todo el tablero." });
    }
  }

  if (!isStartPhase && observedDays >= 3 && trend === "up") {
    cards.push({ tone: "info", title: "Tendencia positiva", text: "Vas de menos a más. Repite el contexto de tus mejores días para consolidarlo." });
  } else if (!isStartPhase && observedDays >= 3 && trend === "down") {
    cards.push({ tone: "warning", title: "Tendencia en descenso", text: "Reduce fricción hoy: simplifica el hábito más pesado y vuelve a encadenar días cumplidos." });
  }

  if (!isStartPhase && observedDays >= 3 && weakDays.length > 0) {
    cards.push({
      tone: weakRatio >= 0.35 ? "critical" : "warning",
      title: `${weakDays.length} día${weakDays.length === 1 ? "" : "s"} con baja adherencia`,
      text: weakRatio >= 0.35
        ? "Los días flojos ya impactan tu semana. Define una versión de emergencia para no cortar la cadena."
        : "Tu siguiente salto está en estabilizar los días flojos con una meta mínima clara.",
    });
  }

  if (!isStartPhase && observedDays >= 3 && bestDay) {
    if (hasMultiplePerfectDays) {
      const formattedPerfectDates = perfectDays.map((row) => formatInsightDate(row.date));
      cards.push({ tone: "success", title: `${perfectDays.length} días perfectos esta semana`, text: `Lograste 100% en ${formatDateList(formattedPerfectDates)}. Eso confirma que tu sistema funciona, así que protege ese ritmo.` });
    } else if (topDays.length > 1) {
      const tiedDates = topDays.map((row) => formatInsightDate(row.date));
      cards.push({ tone: "info", title: `Mejores días de la semana: ${formatPercent(maxCompletion)}`, text: `Tu mejor resultado se repitió en ${formatDateList(tiedDates)}. Estás creando logros repetibles; refuerza ese patrón.` });
    } else {
      cards.push({ tone: "info", title: `Mejor día de la semana: ${formatInsightDate(bestDay.date)}`, text: `${formatPercent(bestDay.completion)} fue tu punto más alto. Repite ese contexto y vuelve ese buen día tu nueva normalidad.` });
    }
  }

  if (cards.length === 0) {
    cards.push({ tone: "info", title: "Señales en construcción", text: "Mantén la constancia unos días más y aparecerán recomendaciones más precisas y accionables." });
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

function TrendBars({ data }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-ink-3 text-center px-4">
          Aún no hay datos suficientes
        </p>
      </div>
    );
  }

  const n = data.length;
  const slotW = 100 / n;
  const barW = slotW * 0.6;
  const barOffset = (slotW - barW) / 2;
  const chartH = 50;

  return (
    <svg viewBox="0 0 100 68" className="w-full h-full overflow-visible">
      {[25, 50, 75].map((pct) => (
        <line
          key={pct}
          x1="0" y1={chartH * (1 - pct / 100)}
          x2="100" y2={chartH * (1 - pct / 100)}
          stroke="var(--ink)" strokeOpacity="0.08" strokeWidth="0.5"
        />
      ))}
      {data.map((d, i) => {
        const x = i * slotW + barOffset;
        const barH = Math.max(1, (d.completion / 100) * chartH);
        const y = chartH - barH;
        const fill =
          d.completion >= 80 ? "var(--lime)"
          : d.completion >= 50 ? "var(--gold)"
          : "var(--signal)";
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={fill} rx="1.5" />
            <text
              x={i * slotW + slotW / 2} y="65"
              fontSize="5" textAnchor="middle"
              fill="var(--ink)" fillOpacity="0.45"
            >
              {d.day}
            </text>
          </g>
        );
      })}
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
  const insights = buildInsights({ daily: safeDaily, focus, week, weekPhase, evaluatedDays, totalDays, isFirstWeek });
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
  const hasPartialDataContext =
    !hasNoHabitsConfigured &&
    weekPhase !== "future" &&
    weekPhase !== "complete" &&
    evaluatedDays > 0 &&
    evaluatedDays < totalDays;

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
        completion: Math.max(0, Math.min(100, numericCompletion)),
      };
    });

  const hasTrendData = trendChartData.length > 0;

  return (
    <div className="mt-10 border-t border-ink/10 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-4">
            Rendimiento actual
          </span>
          <p className="font-serif text-[28px] leading-tight tracking-[-0.02em] mt-0.5">
            {progressSubtitle}
          </p>
        </div>
        {metrics?.baseline_date && (
          <span className="font-mono text-[11px] text-ink-4">
            Base desde {metrics.baseline_date}
          </span>
        )}
      </div>

      {hasPartialDataContext && (
        <div className="mb-6 rounded-[10px] border border-ink/10 bg-paper-2 px-4 py-3">
          <p className="text-sm text-ink-3">
            Aún es pronto en la semana. Estas lecturas llegan hasta el día{" "}
            {Math.min(evaluatedDays, totalDays)} de {totalDays}.
          </p>
        </div>
      )}

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {insights.map((insight) => (
          <div
            key={`${insight.title}-${insight.text}`}
            className={`rounded-[14px] border p-4 ${toneStyles[insight.tone]}`}
          >
            <p className="font-mono text-[10px] tracking-[0.10em] uppercase text-ink-4 mb-2">
              {toneEyebrows[insight.tone]}
            </p>
            <p className="font-serif text-[18px] leading-tight mb-2">{insight.title}</p>
            <p className="text-sm leading-relaxed text-ink-2">{insight.text}</p>
          </div>
        ))}
      </div>

      {/* Performance grid */}
      <div className={`grid grid-cols-1 ${hasTrendData ? "lg:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
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

        {hasTrendData && (
          <div className="h-full rounded-[14px] border border-ink/10 p-4 bg-paper flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3">
                Tendencia semanal
              </p>
              <span className="shrink-0 rounded-full border border-ink/10 bg-paper-2 px-2.5 py-1 font-mono text-[11px] text-ink-3">
                {formatPercent(week?.completion)}
              </span>
            </div>
            <div className="flex-1 min-h-[140px]">
              <TrendBars data={trendChartData} />
            </div>
            <p className="font-mono text-[10px] text-ink-4 mt-3 text-center">
              {formatReadableDateRange(week?.start_date, week?.end_date)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
