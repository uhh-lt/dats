import { createFileRoute } from "@tanstack/react-router";
import Classifier from "../../../../features/classifier/Classifier.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  component: Classifier,
});
