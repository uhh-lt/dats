import { UserHooks } from "../../../api/UserHooks.ts";
import { PublicUserRead } from "../../../api/openapi/models/PublicUserRead.ts";
import { UserRead } from "../../../api/openapi/models/UserRead.ts";

interface UserRendererProps {
  user: number | UserRead | PublicUserRead;
}

export function UserRenderer({ user }: UserRendererProps) {
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
    <span>
      {user.first_name} {user.last_name}
    </span>
  );
}
