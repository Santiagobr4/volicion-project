import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Inicio", to: "/" },
  { label: "Términos", to: "/terms" },
  { label: "Privacidad", to: "/privacy" },
  { label: "Cookies", to: "/cookies" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg font-semibold tracking-tight">Volicion</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300 max-w-md">
              Construye hábitos, mantén la disciplina y avanza con claridad. Un
              espacio simple para crecer con consistencia.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Navegación
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-t border-slate-200/80 dark:border-slate-700 pt-4 text-sm text-slate-500 dark:text-slate-400">
          <p>© {year} Volicion. Todos los derechos reservados.</p>
          <p>Hecho para disciplina, constancia y mejora personal.</p>
        </div>
      </div>
    </footer>
  );
}
