import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
  <DynamicContextProvider
    settings={{
      environmentId: 'c9234c47-8cab-4842-b90c-fb5ec0544df0',
      walletConnectors: [ EthereumWalletConnectors ],
initialAuthenticationMode: 'connect-only',
networkValidationMode: 'always',
    }}>
    <App />
    </DynamicContextProvider>
  </React.StrictMode>,
);
