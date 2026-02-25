import { createFileRoute } from "@tanstack/react-router";
import Register from "../../features/auth/views/register/RegisterView";

export const Route = createFileRoute("/_public/register")({
  component: Register,
});
