import { DocumentSamplerView } from "@features/document-sampler";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/tools/document-sampler")({
  component: DocumentSamplerView,
});
