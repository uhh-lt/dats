import { createFileRoute } from "@tanstack/react-router";
import DocumentSampler from "../../../../../features/document-sampler/views/main/DocumentSamplerView";

export const Route = createFileRoute("/_auth/project/$projectId/tools/document-sampler")({
  component: DocumentSampler,
});
