import { createFileRoute } from "@tanstack/react-router";
import Perspectives from "../../../../../features/perspectives/Perspectives.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/perspectives/")({
  component: Perspectives,
});
