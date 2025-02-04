import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import { AuthProvider } from "./auth/AuthProvider.tsx";
import "./index.css";
import { theme } from "./plugins/ReactMUI.ts";
import queryClient from "./plugins/ReactQueryClient.ts";
import router from "./router/routes.tsx";
import { store } from "./store/store.ts";

const persistor = persistStore(store);
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <AuthProvider>
            <ThemeProvider theme={theme}>
              <RouterProvider router={router} />
            </ThemeProvider>
          </AuthProvider>
        </PersistGate>
      </Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
