import { Icon } from "@components/icons";
import "@tanstack/react-router";

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
