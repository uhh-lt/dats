import { Icon } from "@components/icons";
import type { Feature } from "@models/Feature";
import type { QueryClient } from "@tanstack/react-query";
import "@tanstack/react-router";

// The title of a tab. Dynamic titles read the entity from the query cache (the route loader has put it there).
interface GetTitleArgs {
  queryClient: QueryClient;
  params: Record<string, unknown>;
}

type GetTitleFn = {
  bivarianceHack(args: GetTitleArgs): string;
}["bivarianceHack"];

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    tab?: boolean;
    icon?: Icon;
    getTitle?: GetTitleFn;
    /**
     * The feature of a gated page and of the routes below it: the project layout shows a "not enabled" view instead of
     * them if it is disabled.
     */
    feature?: Feature;
  }
}
