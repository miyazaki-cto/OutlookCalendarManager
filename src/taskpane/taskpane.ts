import * as React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import App from "./components/App";

/* global document, Office */

const title = "Outlook Calendar Manager";

const rootElement = document.getElementById("container");
const root = createRoot(rootElement!);

/* Render application after Office initializes */
Office.onReady(() => {
  root.render(
    React.createElement(
      FluentProvider,
      { theme: webLightTheme },
      React.createElement(App, { title })
    )
  );
});