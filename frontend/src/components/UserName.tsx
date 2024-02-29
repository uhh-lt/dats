import UserHooks from "../api/UserHooks.ts";

interface UserNameProps {
  userId: number;
}

function UserName({ userId }: UserNameProps) {
  const user = UserHooks.useGetUser(userId);

  if (user.isSuccess) {
    return (
      <>
        {user.data.first_name} {user.data.last_name}
      </>
    );
  }

  if (user.isError) {
    return <>Error: {user.error.message}</>;
  }

  return <>Loading...</>;
}

export default UserName;
