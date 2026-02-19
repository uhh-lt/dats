import { createFileRoute } from "@tanstack/react-router";
import Register from "../../views/login/Register.tsx";

export const Route = createFileRoute("/_public/register")({
  component: Register,
});
