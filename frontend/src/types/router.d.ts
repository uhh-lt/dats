import "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    tab?: boolean;
    icon?: Icon;
    getTitle?: (loaderData?: unknown, params?: Record<string, unknown>) => string;
  }
}
