import { Outlet } from "react-router-dom";
import Footer from "./Footer";

export default function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col overflow-x-clip bg-linear-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 text-black dark:text-white transition">
      <main className="flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
