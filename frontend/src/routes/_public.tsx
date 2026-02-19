import { Stack } from "@mui/material";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public")({
  component: PublicRouteLayout,
});

function PublicRouteLayout() {
  return (
    <>
      <Stack
        direction="row"
        p={3}
        gap={3}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <img src="/logo1.png" alt="Logo 1" height={68}></img>
        <img src="/logo2.png" alt="Logo 2" height={68}></img>
      </Stack>
      <Outlet />
    </>
  );
}
