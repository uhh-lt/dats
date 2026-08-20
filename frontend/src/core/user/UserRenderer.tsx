import { UserHooks } from "@api/hooks/UserHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { PublicUserRead } from "@models/PublicUserRead";
import { UserRead } from "@models/UserRead";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";
import { UserAvatar } from "./UserAvatar";

export interface UserRendererSharedProps extends ExpandableRendererProps {
  renderAvatar?: boolean;
}

interface UserRendererProps extends UserRendererSharedProps {
  user: number | UserRead | PublicUserRead;
}

export const UserRenderer = memo(({ user, ...props }: UserRendererProps) => {
  if (typeof user === "number") {
    return <UserRendererWithoutData userId={user} {...props} />;
  } else {
    return <UserRendererWithData user={user} {...props} />;
  }
});

const UserRendererWithoutData = memo(({ userId, ...props }: { userId: number } & UserRendererSharedProps) => {
  const user = UserHooks.useGetUser(userId);

  if (user.isSuccess) {
    return <UserRendererWithData user={user.data} {...props} />;
  } else if (user.isError) {
    return <div>{user.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

const UserRendererWithData = memo(
  ({ user, renderAvatar, ...expandProps }: { user: PublicUserRead } & UserRendererSharedProps) => {
    const fullName = `${user.first_name} ${user.last_name}`.trim();

    return (
      <ExpandableRenderer {...expandProps} expandedContent={<UserContext user={user} />}>
        <Stack direction="row" alignItems="center" spacing={1} minWidth={0} maxWidth="100%" overflow="hidden">
          {renderAvatar && <UserAvatar user={user} sx={{ width: 24, height: 24, fontSize: 11 }} />}
          <Typography component="span" noWrap minWidth={0}>
            {fullName}
          </Typography>
        </Stack>
      </ExpandableRenderer>
    );
  },
);

function UserContext({ user }: { user: PublicUserRead }) {
  return <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{`User ID: ${user.id}`}</Typography>;
}
