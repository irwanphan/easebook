import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { mainRouter, posRouter } from "./app/router";
import { currentWindowLabel, POS_WINDOW_LABEL } from "./lib/posWindow";
import "./index.css";

const router = currentWindowLabel() === POS_WINDOW_LABEL ? posRouter : mainRouter;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <div className="flex min-h-0 flex-1 flex-col">
      <RouterProvider router={router} />
    </div>
  </React.StrictMode>,
);
