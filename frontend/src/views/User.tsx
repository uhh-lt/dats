import { useParams } from "react-router-dom";
import UserHooks from "../api/UserHooks";
import { Container, Typography } from "@mui/material";
import React from "react";

function User() {
  // router
  const { userId } = useParams() as { userId: string };

  // global server state (react query)
  const user = UserHooks.useGetUser(parseInt(userId));

  return (
    <Container maxWidth="md">
      {user.isSuccess ? (
        <>
          <Typography variant={"h4"} gutterBottom mt={3}>
            User {user.data.id}
          </Typography>
          <Typography variant={"body1"} gutterBottom>
            <b>Name:</b> {user.data.first_name} {user.data.last_name}
          </Typography>
          <Typography variant={"body1"} gutterBottom>
            <b>Mail:</b> {user.data.email}
          </Typography>
        </>
      ) : user.isError ? (
        <Typography variant={"body1"} gutterBottom mt={3}>
          Error: {user.error.message}
        </Typography>
      ) : (
        <Typography variant={"body1"} gutterBottom mt={3}>
          Loading...
        </Typography>
      )}
    </Container>
  );
}

export default User;
