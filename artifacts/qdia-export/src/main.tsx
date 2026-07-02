import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initFirebase } from "./lib/firebase";
import { AppProviders } from "@/providers/AppProviders";

initFirebase().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <App />
  </AppProviders>,
);
