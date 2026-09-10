import { UserHooks } from "@api/hooks/UserHooks";
import { FormText } from "@components/form-inputs";
import { useOpenSnackbar } from "@core/notification";
import { UserAvatar } from "@core/user";
import { ErrorMessage } from "@hookform/error-message";
import { UserRead } from "@models/UserRead";
import { Box, Button, Divider, Grid2, Stack, TextField, Typography } from "@mui/material";
import { SUPPORT_EMAIL } from "@utils/GlobalConstants";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

type UpdateProfileValues = {
  firstName: string;
  lastName: string;
};

interface ProfileHomeProps {
  user: UserRead;
}

export function ProfileHome({ user }: ProfileHomeProps) {
  const updateUserMutation = UserHooks.useUpdate();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<UpdateProfileValues>({
    defaultValues: {
      firstName: user.first_name,
      lastName: user.last_name,
    },
  });

  // snack bar
  const openSnackbar = useOpenSnackbar();

  const handleUpdate: SubmitHandler<UpdateProfileValues> = (data) => {
    updateUserMutation.mutate(
      {
        requestBody: {
          first_name: data.firstName,
          last_name: data.lastName,
        },
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: "Your profile was updated successfully.",
            severity: "success",
          });
        },
        onError: () => {
          openSnackbar({
            text: `Sorry! Your profile update failed. Please contact ${SUPPORT_EMAIL}`,
            severity: "error",
          });
        },
      },
    );
  };

  const handleError: SubmitErrorHandler<UpdateProfileValues> = (data) => console.error(data);

  return (
    <>
      <Typography variant="h5" sx={{ pb: 1 }}>
        Profile
      </Typography>
      <Divider />
      <Box sx={{ pt: 3 }}>
        <Grid2 container spacing={3}>
          <Grid2 size={{ xs: 12, md: 8 }}>
            <Box component="form" onSubmit={handleSubmit(handleUpdate, handleError)}>
              <Stack spacing={3}>
                <FormText
                  name="firstName"
                  control={control}
                  rules={{
                    required: "First name is required",
                  }}
                  textFieldProps={{
                    label: "First name",
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    error: Boolean(errors.firstName),
                    helperText: <ErrorMessage errors={errors} name="firstName" />,
                    slotProps: {
                      inputLabel: { shrink: true },
                    },
                  }}
                />
                <FormText
                  name="lastName"
                  control={control}
                  rules={{
                    required: "Last name is required",
                  }}
                  textFieldProps={{
                    label: "Last name",
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    error: Boolean(errors.lastName),
                    helperText: <ErrorMessage errors={errors} name="lastName" />,
                    slotProps: {
                      inputLabel: { shrink: true },
                    },
                  }}
                />
                <TextField
                  label="Registered e-mail"
                  value={user.email}
                  fullWidth
                  disabled
                  size="small"
                  sx={{
                    "& .MuiInputBase-input.Mui-disabled": {
                      WebkitTextFillColor: "#000000",
                    },
                  }}
                />
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Button
                    aria-label="Update Profile"
                    variant="contained"
                    type="submit"
                    loading={updateUserMutation.isPending}
                  >
                    Update Profile
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <Stack alignItems="center" spacing={2} sx={{ pt: 2 }}>
              <UserAvatar user={user} sx={{ width: 120, height: 120, fontSize: 48 }} />
            </Stack>
          </Grid2>
        </Grid2>
      </Box>
    </>
  );
}
