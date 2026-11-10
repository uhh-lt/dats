import { Icon } from "@components/icons";
import { DuplicateFinderView } from "@features/duplicate-finder";
import { Feature } from "@models/Feature";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/tools/duplicate-finder")({
  staticData: {
    tab: true,
    icon: Icon.DUPLICATE_FINDER,
    getTitle: () => "Duplicate Finder",
    feature: Feature.DUPLICATE_FINDER,
  },
  component: DuplicateFinderView,
});
