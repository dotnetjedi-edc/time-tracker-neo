import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const bypassAuthForE2E = import.meta.env.VITE_E2E_BYPASS_AUTH === "true";
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey && !bypassAuthForE2E) {
  throw new Error(
    "VITE_CLERK_PUBLISHABLE_KEY environment variable is required.",
  );
}

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  bypassAuthForE2E ? (
    app
  ) : (
    <ClerkProvider publishableKey={publishableKey!}>{app}</ClerkProvider>
  ),
);
