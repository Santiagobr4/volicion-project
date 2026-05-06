import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";

export default function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-paper text-ink">
      <ScrollToTop />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:text-paper focus:px-4 focus:py-2 focus:rounded-full focus:font-mono focus:text-[11px] focus:tracking-[0.10em] focus:uppercase focus:no-underline"
      >
        Saltar al contenido
      </a>
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
