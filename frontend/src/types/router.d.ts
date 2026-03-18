import "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

type GetTitleFn = {
  bivarianceHack(loaderData?: unknown, params?: Record<string, unknown>): string;
}["bivarianceHack"];

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    tab?: boolean;
    icon?: Icon;
    getTitle?: GetTitleFn;
  }
}
