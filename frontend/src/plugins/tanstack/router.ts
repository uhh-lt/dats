import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../../routeTree.gen";

export const router = createRouter({
  routeTree,
  context: {
    // auth will be passed down from main.tsx / App component
    auth: undefined!,
    // queryClient will be passed down from main.tsx / App component
    queryClient: undefined!,
  },
  defaultPreload: "intent",
  // From: https://tanstack.com/router/latest/docs/framework/react/examples/basic-react-query-file-based
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
