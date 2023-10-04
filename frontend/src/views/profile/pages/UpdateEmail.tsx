import { UseQueryResult } from "@tanstack/react-query";
import { UserRead } from "../../../api/openapi";
import { Button, Grid, TextField, Typography } from "@mui/material";
import UserHooks from "../../../api/UserHooks";
import { useRef } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { ErrorMessage } from "@hookform/error-message";
import { EMAIL_REGEX, SUPPORT_EMAIL } from "../../../utils/GlobalConstants";
type UpdateEmailValues = {
  newemail: string;
};

interface UpdateEmailProps {
  user: UseQueryResult<UserRead, Error>;
}

export default function UpdateEmail({ user }: UpdateEmailProps) {
  const updateUserMutation = UserHooks.useUpdate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<UpdateEmailValues>();

  //newemail
  const newemail = useRef("");
  newemail.current = watch("newemail", "");

  const handleUpdate: SubmitHandler<UpdateEmailValues> = (data) => {
    user.data
      ? updateUserMutation.mutate(
          {
            userId: user.data.id,
            requestBody: {
              email: data.newemail,
            },
          },
          {
            onSuccess: () => {
              SnackbarAPI.openSnackbar({
                text: `Hurray! Your email updated successfully.`,
                severity: "success",
              });
            },
            onError: () => {
              SnackbarAPI.openSnackbar({
                text: `Sorry! Your email update failed. Please contact` + { SUPPORT_EMAIL },
                severity: "error",
              });
            },
          }
        )
      : console.log("User not found");
  };

  const handleError: SubmitErrorHandler<UpdateEmailValues> = (data) => console.error(data);

  return user.data ? (
    <>
      <Typography variant={"h5"} gutterBottom sx={{ pb: 1 }}>
        Update Email
      </Typography>
      <form onSubmit={handleSubmit(handleUpdate, handleError)}>
        <Grid container spacing={1} sx={{ borderTop: 1, borderColor: "divider" }}>
          <Grid item xs={12}>
            <Typography variant={"body1"} gutterBottom>
              <b> Current e-mail</b>
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              value={user.data.email}
              disabled
              sx={{
                width: "60%",
                bgcolor: "divider",
                borderRadius: 1,
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "#000000",
                },
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant={"body1"} gutterBottom>
              <b> New e-mail</b>
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              variant="outlined"
              sx={{ width: "60%" }}
              size="small"
              placeholder="Please enter the new e-mail here..."
              type="email"
              {...register("newemail", {
                required: "E-Mail is required",
                validate: (value) => {
                  return [EMAIL_REGEX].every((pattern) => pattern.test(value)) || "Please enter a valid email address!";
                },
              })}
              error={Boolean(errors.newemail)}
              helperText={<ErrorMessage errors={errors} name="newemail" />}
            />
          </Grid>
          <Grid item xs={12}>
            <Button aria-label="Update Email" variant="contained" size="small" type="submit">
              Update
            </Button>
          </Grid>
        </Grid>
      </form>
    </>
  ) : (
    <></>
  );
}
