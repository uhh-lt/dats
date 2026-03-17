import { DocumentSearchView } from "@features/search";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/search")({
  validateSearch: (search) => {
    const asf = search?.addSpanAnnotationFilter;
    return {
      searchQuery: typeof search?.searchQuery === "string" ? search.searchQuery : "",
      addSpanAnnotationFilter:
        asf !== null &&
        typeof asf === "object" &&
        typeof (asf as Record<string, unknown>).codeId === "number" &&
        typeof (asf as Record<string, unknown>).spanText === "string"
          ? (asf as { codeId: number; spanText: string })
          : undefined,
    };
  },
  component: DocumentSearchView,
});
