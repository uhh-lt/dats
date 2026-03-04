import { ClassifierView } from "@features/classifier";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  component: ClassifierView,
});
