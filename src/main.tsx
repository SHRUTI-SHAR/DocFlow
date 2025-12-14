import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DocumentProcessingProvider } from "./contexts/DocumentProcessingContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <DocumentProcessingProvider>
    <App />
  </DocumentProcessingProvider>
);