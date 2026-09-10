import { UserHooks } from "@api/hooks/UserHooks";
import { FormEmail } from "@components/form-inputs";
import { useAuth } from "@core/auth";
import { useOpenSnackbar } from "@core/notification";
import { ErrorMessage } from "@hookform/error-message";
import { UserRead } from "@models/UserRead";
import { Box, Button, Divider, Stack, TextField, Typography } from "@mui/material";
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
      <Typography variant="h5" sx={{ pb: 1 }}>
        Update Email
      </Typography>
      <Divider />
      <Box component="form" onSubmit={handleSubmit(handleUpdate, handleError)} sx={{ pt: 3, maxWidth: 480 }}>
        <Stack spacing={3}>
          <TextField
            label="Current e-mail"
            value={user.email}
            disabled
            fullWidth
            size="small"
            sx={{
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "#000000",
              },
            }}
          />
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
              label: "New e-mail",
              variant: "outlined",
              size: "small",
              fullWidth: true,
              placeholder: "Please enter the new e-mail here...",
              error: Boolean(errors.newemail),
              helperText: <ErrorMessage errors={errors} name="newemail" />,
              slotProps: {
                inputLabel: { shrink: true },
              },
            }}
          />
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button aria-label="Update Email" variant="contained" type="submit" loading={updateUserMutation.isPending}>
              Update
            </Button>
            <Typography variant="body2" color="text.secondary">
              <b>Note:</b> You will be logged out after updating your email.
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </>
  );
}
