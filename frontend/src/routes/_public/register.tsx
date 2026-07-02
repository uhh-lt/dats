import { RegisterView } from "@features/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/register")({
  component: RegisterView,
});
