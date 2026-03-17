import { DocumentSamplerView } from "@features/document-sampler";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/tools/document-sampler")({
  staticData: {
    tab: true,
    icon: Icon.DOCUMENT_SAMPLER,
    getTitle: () => "Document Sampler",
  },
  component: DocumentSamplerView,
});
