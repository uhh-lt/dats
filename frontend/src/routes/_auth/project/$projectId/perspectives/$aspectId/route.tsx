import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/$aspectId")({
  params: {
    parse: ({ aspectId }) => ({
      aspectId: parseInt(aspectId),
    }),
  },
});
