import { ProfileView } from "@features/profile";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/me")({
  component: ProfileView,
});
