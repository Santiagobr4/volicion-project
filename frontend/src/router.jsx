import { createBrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import AppLayout from "./components/AppLayout";
import BrowserStoragePage from "./pages/legal/BrowserStoragePage";
import DataPolicyPage from "./pages/legal/DataPolicyPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UsageTermsPage from "./pages/legal/UsageTermsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <App /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "terms", element: <UsageTermsPage /> },
      { path: "privacy", element: <DataPolicyPage /> },
      { path: "cookies", element: <BrowserStoragePage /> },
    ],
  },
]);
