import { UserHooks } from "@api/hooks/UserHooks";
import { FormEmail } from "@components/form-inputs";
import { useAuth } from "@core/auth";
import { useOpenSnackbar } from "@core/notification";
import { ErrorMessage } from "@hookform/error-message";
import { UserRead } from "@models/UserRead";
import { Button, Grid2, Stack, TextField, Typography } from "@mui/material";
import { EMAIL_REGEX, SUPPORT_EMAIL } from "@utils/GlobalConstants";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

type UpdateEmailValues = {
  newemail: string;
};

interface UpdateEmailProps {
  user: UserRead;
}

export function UpdateEmail({ user }: UpdateEmailProps) {
  const updateUserMutation = UserHooks.useUpdate();
  const { logout } = useAuth();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<UpdateEmailValues>({
    defaultValues: {
      newemail: "",
    },
  });

  // snack bar
  const openSnackbar = useOpenSnackbar();

  const handleUpdate: SubmitHandler<UpdateEmailValues> = (data) => {
    updateUserMutation.mutate(
      {
        requestBody: {
          email: data.newemail,
        },
      },
      {
        onSuccess: (data) => {
          openSnackbar({
            text: `Hurray! Your email was updated to ${data.email}. You need to log-in again.`,
            severity: "success",
          });
          logout();
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
        <Grid2 container spacing={1} sx={{ borderTop: 1, borderColor: "divider" }}>
          <Grid2 size={{ xs: 12 }}>
            <Typography variant={"body1"} gutterBottom>
              <b> Current e-mail</b>
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
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
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Typography variant={"body1"} gutterBottom>
              <b> New e-mail</b>
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <FormEmail
              name="newemail"
              control={control}
              rules={{
                required: "E-Mail is required",
                validate: (value) => {
                  return [EMAIL_REGEX].every((pattern) => pattern.test(value)) || "Please enter a valid email address!";
                },
              }}
              textFieldProps={{
                sx: { width: "60%" },
                variant: "outlined",
                size: "small",
                placeholder: "Please enter the new e-mail here...",
                error: Boolean(errors.newemail),
                helperText: <ErrorMessage errors={errors} name="newemail" />,
              }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button
                aria-label="Update Email"
                variant="contained"
                size="small"
                type="submit"
                loading={updateUserMutation.isPending}
              >
                Update
              </Button>
              <Typography>
                <b>Note:</b> You will be logged out after updating your email.
              </Typography>
            </Stack>
          </Grid2>
        </Grid2>
      </form>
    </>
  );
}
