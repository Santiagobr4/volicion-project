import { Outlet } from "react-router-dom";
import Footer from "./Footer";

export default function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-paper text-ink">
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
