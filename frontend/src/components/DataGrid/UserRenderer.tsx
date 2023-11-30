import { Stack } from "@mui/material";
import UserHooks from "../../api/UserHooks";
import { PublicUserRead, UserRead } from "../../api/openapi";

interface UserRendererProps {
  user: number | UserRead | PublicUserRead;
}

function UserRenderer({ user }: UserRendererProps) {
  if (typeof user === "number") {
    return <UserRendererWithoutData userId={user} />;
  } else {
    return <UserRendererWithData user={user} />;
  }
}

function UserRendererWithoutData({ userId }: { userId: number }) {
  const user = UserHooks.useGetUser(userId);

  if (user.isSuccess) {
    return <UserRendererWithData user={user.data} />;
  } else if (user.isError) {
    return <div>{user.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function UserRendererWithData({ user }: { user: PublicUserRead }) {
  return (
    <Stack direction="row" alignItems="center">
      {user.first_name} {user.last_name}
    </Stack>
  );
}

export default UserRenderer;
