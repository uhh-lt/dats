import { createFileRoute } from "@tanstack/react-router";
import Classifier from "../../../../features/classifier/views/main/ClassifierView";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  component: Classifier,
});
