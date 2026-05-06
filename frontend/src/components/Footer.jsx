import { Link } from "react-router-dom";
import { eyebrowClassName } from "./ui.js";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-ink/10 pt-12 pb-9 text-[13px] text-ink-3">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12">
          <div>
            <div className="flex items-center gap-2.5 font-serif text-[22px] text-ink mb-3.5">
              <BrandMark />
              VOLICION
            </div>
            <p className="max-w-xs leading-relaxed">
              Construye hábitos. Mantén la disciplina. Avanza con claridad. Un
              espacio simple para crecer con consistencia.
            </p>
          </div>

          <div>
            <h6 className={`${eyebrowClassName} mb-3.5`}>
              Producto
            </h6>
            <div className="flex flex-col gap-1">
              <Link to="/" className="py-1 text-ink-2 hover:text-ink transition-colors">Inicio</Link>
              <Link to="/how-it-works" className="py-1 text-ink-2 hover:text-ink transition-colors">Cómo funciona</Link>
            </div>
          </div>

          <div>
            <h6 className={`${eyebrowClassName} mb-3.5`}>
              Legal
            </h6>
            <div className="flex flex-col gap-1">
              <Link to="/terms" className="py-1 text-ink-2 hover:text-ink transition-colors">Términos</Link>
              <Link to="/privacy" className="py-1 text-ink-2 hover:text-ink transition-colors">Privacidad</Link>
              <Link to="/cookies" className="py-1 text-ink-2 hover:text-ink transition-colors">Cookies</Link>
            </div>
          </div>

          <div>
            <h6 className={`${eyebrowClassName} mb-3.5`}>
              Contacto
            </h6>
            <div className="flex flex-col gap-1">
              <a href="mailto:hola@volicion.org" className="py-1 text-ink-2 hover:text-ink transition-colors">
                hola@volicion.org
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-ink/10 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
            © {year} VOLICION · TODOS LOS DERECHOS RESERVADOS
          </span>
          <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
            HECHO PARA DISCIPLINA · CONSTANCIA · MEJORA
          </span>
        </div>
      </div>
    </footer>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex w-[22px] h-[22px] rounded-full bg-ink items-center justify-center shrink-0">
      <span className="absolute inset-[4px] rounded-full bg-paper" />
      <span className="relative z-10 w-[6px] h-[6px] rounded-full bg-ink" />
    </span>
  );
}
