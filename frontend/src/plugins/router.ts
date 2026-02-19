import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";

export const router = createRouter({
  routeTree,
  context: {
    // auth will be passed down from App component
    auth: undefined!,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
