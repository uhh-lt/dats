import { createFileRoute } from "@tanstack/react-router";
import Register from "../../features/login/Register.tsx";

export const Route = createFileRoute("/_public/register")({
  component: Register,
});
