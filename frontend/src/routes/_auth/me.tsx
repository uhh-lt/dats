import { createFileRoute } from "@tanstack/react-router";
import Profile from "../../features/profile/views/ProfileView.tsx";

export const Route = createFileRoute("/_auth/me")({
  component: Profile,
});
