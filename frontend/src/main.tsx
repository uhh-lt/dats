import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import { AuthProvider } from "./features/auth/AuthProvider.tsx";
import { useAuth } from "./features/auth/useAuth.ts";
import "./index.css";
import { theme } from "./plugins/ReactMUI.ts";
import { queryClient } from "./plugins/ReactQueryClient.ts";
import { router } from "./plugins/router.ts";
import { store } from "./store/store.ts";

const persistor = persistStore(store);
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <>
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  </>,
);

export function App() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}
