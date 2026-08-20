import { UserHooks } from "@api/hooks/UserHooks";
import { PublicUserRead } from "@models/PublicUserRead";
import { UserRead } from "@models/UserRead";
import { Avatar, AvatarProps, Tooltip, TooltipProps } from "@mui/material";
import { memo } from "react";

interface UserAvatarProps extends AvatarProps {
  user: number | UserRead | PublicUserRead;
  tooltipPlacement?: TooltipProps["placement"];
}

export const UserAvatar = memo(({ user, tooltipPlacement = "top", ...props }: UserAvatarProps) => {
  if (typeof user === "number") {
    return <UserAvatarWithoutData userId={user} tooltipPlacement={tooltipPlacement} {...props} />;
  }

  return <UserAvatarWithData user={user} tooltipPlacement={tooltipPlacement} {...props} />;
});

const UserAvatarWithoutData = memo(
  ({ userId, tooltipPlacement, ...props }: { userId: number } & Omit<UserAvatarProps, "user">) => {
    const user = UserHooks.useGetUser(userId);

    if (user.data) {
      return <UserAvatarWithData user={user.data} tooltipPlacement={tooltipPlacement} {...props} />;
    }

    return <Avatar {...props}>?</Avatar>;
  },
);

const UserAvatarWithData = memo(
  ({ user, tooltipPlacement, ...props }: Omit<UserAvatarProps, "user"> & { user: PublicUserRead }) => {
    const fullName = `${user.first_name} ${user.last_name}`.trim();

    return (
      <Tooltip title={fullName} placement={tooltipPlacement} arrow>
        <Avatar {...props}>{getInitials(user)}</Avatar>
      </Tooltip>
    );
  },
);

const getInitials = (user: PublicUserRead) =>
  `${user.first_name.trim().charAt(0)}${user.last_name.trim().charAt(0)}`.toLocaleUpperCase();
