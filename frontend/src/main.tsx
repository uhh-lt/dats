import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import { AuthProvider } from "./core/auth/provider/AuthProvider";
import { useAuth } from "./core/auth/provider/useAuth";
import { theme } from "./plugins/mui/theme";
import { SentryProvider } from "./plugins/Sentry.tsx";
import { queryClient } from "./plugins/tanstack/queryClient";
import { router } from "./plugins/tanstack/router";
import { store } from "./store/store";
import "./styles/index.css";

const persistor = persistStore(store);
const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <>
    <Sentry.ErrorBoundary fallback={<p>An unexpected error has occurred. Please try again later.</p>}>
      <QueryClientProvider client={queryClient}>
        <SentryProvider>
          <Provider store={store}>
            <PersistGate persistor={persistor}>
              <AuthProvider>
                <ThemeProvider theme={theme}>
                  <App />
                </ThemeProvider>
              </AuthProvider>
            </PersistGate>
          </Provider>
          <ReactQueryDevtools initialIsOpen={false} />
        </SentryProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </>,
);

export function App() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}
