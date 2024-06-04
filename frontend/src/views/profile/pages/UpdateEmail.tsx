import { ErrorMessage } from "@hookform/error-message";
import { Button, Grid, TextField, Typography } from "@mui/material";
import { useRef } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import UserHooks from "../../../api/UserHooks.ts";
import { UserRead } from "../../../api/openapi/models/UserRead.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { EMAIL_REGEX, SUPPORT_EMAIL } from "../../../utils/GlobalConstants.ts";
type UpdateEmailValues = {
  newemail: string;
};

interface UpdateEmailProps {
  user: UserRead;
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

  // snack bar
  const openSnackbar = useOpenSnackbar();

  const handleUpdate: SubmitHandler<UpdateEmailValues> = (data) => {
    updateUserMutation.mutate(
      {
        userId: user.id,
        requestBody: {
          email: data.newemail,
        },
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: `Hurray! Your email updated successfully.`,
            severity: "success",
          });
        },
        onError: () => {
          openSnackbar({
            text: `Sorry! Your email update failed. Please contact` + { SUPPORT_EMAIL },
            severity: "error",
          });
        },
      },
    );
  };

  const handleError: SubmitErrorHandler<UpdateEmailValues> = (data) => console.error(data);

  return (
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
              value={user.email}
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
  );
}
