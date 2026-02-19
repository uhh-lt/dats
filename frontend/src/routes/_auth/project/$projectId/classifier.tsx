import { createFileRoute } from "@tanstack/react-router";
import Classifier from "../../../../views/classifier/Classifier.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  component: Classifier,
});
