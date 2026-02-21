import { createFileRoute } from "@tanstack/react-router";
import DocumentSampler from "../../../../../features/tools/DocumentSampler/DocumentSampler.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/tools/document-sampler")({
  component: DocumentSampler,
});
