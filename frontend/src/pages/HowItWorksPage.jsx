import { useEffect } from "react";
import { Link } from "react-router-dom";
import PageBrandHeader from "../components/PageBrandHeader";
import { eyebrowClassName } from "../components/ui.js";

const STEPS = [
  {
    num: "01",
    title: "Define tu lista corta.",
    text: "Crea entre tres y siete hábitos. Pocos, claros, sostenibles. Cada uno con su frecuencia: diaria, lunes a viernes, fin de semana o días específicos.",
  },
  {
    num: "02",
    title: "Marca un día a la vez.",
    text: "Cada día revisas tu cuadrícula y marcas lo cumplido. Hoy aparece resaltado, los días futuros quedan inactivos. La constancia se construye marca a marca.",
  },
  {
    num: "03",
    title: "Lee la semana, no el día.",
    text: "El panel te devuelve insights sobre tu ritmo: dónde flaqueas, qué días sostienes mejor, cuándo conviene bajar la exigencia para no romper la cadena.",
  },
  {
    num: "04",
    title: "Compara contigo y con otros.",
    text: "Historial largo para mirar tendencia (no días sueltos) y una clasificación opcional para ver quién sostiene mejor el ritmo. La consistencia gana, no los picos.",
  },
];

const PRINCIPLES = [
  {
    eb: "Disciplina silenciosa",
    title: "Lo simple, sostenido.",
    text: "Sin gamificación ruidosa, sin recompensas que distraigan. Solo registro honesto y lectura clara.",
  },
  {
    eb: "Tus datos son tuyos",
    title: "Privacidad por diseño.",
    text: "No vendemos datos ni compartimos tu actividad. Solo tú ves tu detalle. La clasificación usa solo agregados.",
  },
  {
    eb: "Cambios con sentido",
    title: "Edición disciplinada.",
    text: "Crear, editar y eliminar hábitos solo en domingo. Así protegemos la semana en curso y evitamos rehacer el sistema cada vez que cuesta.",
  },
];

export default function HowItWorksPage() {
  useEffect(() => {
    document.title = "Cómo funciona | VOLICION";
  }, []);

  return (
    <>
    <PageBrandHeader />
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-12 pb-20 page-fade">

      {/* Page head */}
      <div className="mb-12">
        <span className={eyebrowClassName}>
          Cómo funciona · Lectura corta
        </span>
        <h1 className="font-serif text-[length:var(--text-h1)] leading-[0.98] tracking-[-0.025em] mt-3">
          Convierte intención<br /><em className="text-ink-3 italic">en acción.</em>
        </h1>
        <p className="text-[15px] sm:text-[17px] text-ink-2 max-w-[620px] leading-[1.55] mt-4">
          VOLICION es un cuaderno digital para sostener hábitos. Sin ruido, sin atajos, sin métricas vanidosas. Cuatro pasos para entender cómo se usa.
        </p>
      </div>

      {/* Steps */}
      <section className="mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {STEPS.map((step) => (
            <div key={step.num} className="flex gap-6">
              <span className="font-serif text-[44px] leading-none text-ink-3 shrink-0">{step.num}</span>
              <div>
                <h2 className="font-serif text-[26px] leading-[1.15]">{step.title}</h2>
                <p className="text-[15px] text-ink-2 leading-[1.55] mt-2">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="border-t border-ink/10 pt-12 mb-20">
        <span className={eyebrowClassName}>
          Principios
        </span>
        <h2 className="font-serif text-[36px] leading-tight tracking-[-0.02em] mt-2 mb-8">
          Por qué así.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRINCIPLES.map((p) => (
            <div key={p.eb} className="rounded-[14px] border border-ink/10 bg-paper p-6">
              <span className={eyebrowClassName}>{p.eb}</span>
              <h3 className="font-serif text-[22px] leading-[1.2] mt-3">{p.title}</h3>
              <p className="text-[14px] text-ink-2 leading-[1.55] mt-3">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink/10 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className={eyebrowClassName}>
              Empieza hoy
            </span>
            <h2 className="font-serif text-[36px] leading-tight tracking-[-0.02em] mt-2">
              Suficiente teoría.
            </h2>
            <p className="text-[15px] text-ink-2 max-w-[480px] leading-[1.55] mt-2">
              Lo importante es marcar el primer día. Con un hábito basta.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-ink bg-ink text-paper px-[18px] py-3 text-sm font-medium font-sans hover:-translate-y-px transition cursor-pointer"
          >
            Entrar a VOLICION <span className="font-serif italic">→</span>
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}
