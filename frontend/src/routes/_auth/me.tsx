import { createFileRoute } from "@tanstack/react-router";
import Profile from "../../features/profile/Profile.tsx";

export const Route = createFileRoute("/_auth/me")({
  component: Profile,
});
