import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { mainRouter, posRouter } from "./app/router";
import { currentWindowLabel, POS_WINDOW_LABEL } from "./lib/posWindow";
import { installProductionHardening } from "./lib/productionHardening";
import "./index.css";

if (import.meta.env.PROD) {
  installProductionHardening();
}

const router = currentWindowLabel() === POS_WINDOW_LABEL ? posRouter : mainRouter;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <div className="flex min-h-0 flex-1 flex-col">
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        expand
        toastOptions={{
          className: "rounded-xl border border-zinc-200 shadow-lg",
        }}
      />
    </div>
  </React.StrictMode>,
);
