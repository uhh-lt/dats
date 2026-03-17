import { ClassifierView } from "@features/classifier";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/classifier")({
  staticData: {
    tab: true,
    icon: Icon.CLASSIFIER,
    getTitle: () => "Classifier",
  },
  component: ClassifierView,
});
