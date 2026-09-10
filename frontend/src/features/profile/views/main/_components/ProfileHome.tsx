import { UserHooks } from "@api/hooks/UserHooks";
import { FormEmail, FormPassword, FormText } from "@components/form-inputs";
import { useAuth } from "@core/auth";
import { useOpenSnackbar } from "@core/notification";
import { UserAvatar } from "@core/user";
import { ErrorMessage } from "@hookform/error-message";
import { UserRead } from "@models/UserRead";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid2,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { EMAIL_REGEX, SUPPORT_EMAIL } from "@utils/GlobalConstants";
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm, useWatch } from "react-hook-form";

type UpdateProfileValues = {
  firstName: string;
  lastName: string;
};

type UpdateEmailValues = {
  newemail: string;
};

type UpdatePasswordValues = {
  password: string;
  confirmPassword: string;
};

interface ProfileHomeProps {
  user: UserRead;
}

export function ProfileHome({ user }: ProfileHomeProps) {
  const updateUserMutation = UserHooks.useUpdate();
  const { logout } = useAuth();
  const openSnackbar = useOpenSnackbar();

  // --- Profile form ---
  const profileForm = useForm<UpdateProfileValues>({
    defaultValues: {
      firstName: user.first_name,
      lastName: user.last_name,
    },
  });

  const handleUpdateProfile: SubmitHandler<UpdateProfileValues> = (data) => {
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

  const handleProfileError: SubmitErrorHandler<UpdateProfileValues> = (data) => console.error(data);

  // --- Email form ---
  const emailForm = useForm<UpdateEmailValues>({
    defaultValues: {
      newemail: "",
    },
  });

  const handleUpdateEmail: SubmitHandler<UpdateEmailValues> = (data) => {
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
            text: `Sorry! Your email update failed. Please contact ${SUPPORT_EMAIL}`,
            severity: "error",
          });
        },
      },
    );
  };

  const handleEmailError: SubmitErrorHandler<UpdateEmailValues> = (data) => console.error(data);

  // --- Password form ---
  const passwordForm = useForm<UpdatePasswordValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({
    control: passwordForm.control,
    name: "password",
    defaultValue: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const handleShowPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowPassword(event.target.checked);
  };

  const handleUpdatePassword: SubmitHandler<UpdatePasswordValues> = (data) => {
    updateUserMutation.mutate(
      {
        requestBody: {
          password: data.password,
        },
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: "Hurray! Your password updated successfully.",
            severity: "success",
          });
        },
        onError: () => {
          openSnackbar({
            text: `Sorry! Your password update failed. Please contact ${SUPPORT_EMAIL}`,
            severity: "error",
          });
        },
      },
    );
  };

  const handlePasswordError: SubmitErrorHandler<UpdatePasswordValues> = (data) => console.error(data);

  return (
    <>
      <Typography variant="h5" sx={{ pb: 1 }}>
        Profile
      </Typography>
      <Divider />
      <Box sx={{ pt: 3 }}>
        <Grid2 container spacing={3}>
          <Grid2 size={{ xs: 12, md: 8 }}>
            {/* Name Section */}
            <Typography variant="h6" sx={{ pb: 1 }}>
              Name
            </Typography>
            <Box component="form" onSubmit={profileForm.handleSubmit(handleUpdateProfile, handleProfileError)}>
              <Stack spacing={3}>
                <FormText
                  name="firstName"
                  control={profileForm.control}
                  rules={{
                    required: "First name is required",
                  }}
                  textFieldProps={{
                    label: "First name",
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    error: Boolean(profileForm.formState.errors.firstName),
                    helperText: <ErrorMessage errors={profileForm.formState.errors} name="firstName" />,
                    slotProps: {
                      inputLabel: { shrink: true },
                    },
                  }}
                />
                <FormText
                  name="lastName"
                  control={profileForm.control}
                  rules={{
                    required: "Last name is required",
                  }}
                  textFieldProps={{
                    label: "Last name",
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    error: Boolean(profileForm.formState.errors.lastName),
                    helperText: <ErrorMessage errors={profileForm.formState.errors} name="lastName" />,
                    slotProps: {
                      inputLabel: { shrink: true },
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

            <Divider sx={{ my: 4 }} />

            {/* Email Section */}
            <Typography variant="h6" sx={{ pb: 1 }}>
              Email
            </Typography>
            <Box component="form" onSubmit={emailForm.handleSubmit(handleUpdateEmail, handleEmailError)}>
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
                  control={emailForm.control}
                  rules={{
                    required: "E-Mail is required",
                    validate: (value) => {
                      return (
                        [EMAIL_REGEX].every((pattern) => pattern.test(value)) || "Please enter a valid email address!"
                      );
                    },
                  }}
                  textFieldProps={{
                    label: "New e-mail",
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    placeholder: "Please enter the new e-mail here...",
                    error: Boolean(emailForm.formState.errors.newemail),
                    helperText: <ErrorMessage errors={emailForm.formState.errors} name="newemail" />,
                    slotProps: {
                      inputLabel: { shrink: true },
                    },
                  }}
                />
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Button
                    aria-label="Update Email"
                    variant="contained"
                    type="submit"
                    loading={updateUserMutation.isPending}
                  >
                    Update Email
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    <b>Note:</b> You will be logged out after updating your email.
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Password Section */}
            <Typography variant="h6" sx={{ pb: 1 }}>
              Password
            </Typography>
            <Box component="form" onSubmit={passwordForm.handleSubmit(handleUpdatePassword, handlePasswordError)}>
              <Stack spacing={3}>
                <FormPassword
                  name="password"
                  control={passwordForm.control}
                  showPassword={showPassword}
                  rules={{
                    required: "Password is required",
                    validate: (value) => {
                      return (
                        [
                          /[a-z]/, // lowercase
                          /[A-Z]/, // uppercase
                          /[0-9]/, // number
                          /[^a-zA-Z0-9]/, // special character
                        ].every((pattern) => pattern.test(value)) ||
                        "Password must contain at least one lowercase letter, uppercase letter, number and special character!"
                      );
                    },
                    minLength: {
                      value: 8,
                      message: "Password too short! (minimum 8 characters)",
                    },
                  }}
                  textFieldProps={{
                    label: "New password",
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    placeholder: "Please enter the new password here...",
                    error: Boolean(passwordForm.formState.errors.password),
                    helperText: <ErrorMessage errors={passwordForm.formState.errors} name="password" />,
                    slotProps: {
                      inputLabel: { shrink: true },
                    },
                  }}
                />
                <FormPassword
                  name="confirmPassword"
                  control={passwordForm.control}
                  showPassword={showPassword}
                  rules={{
                    required: "Password is required",
                    validate: (value) => value === password || "Passwords do not match!",
                  }}
                  textFieldProps={{
                    label: "Confirm new password",
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    placeholder: "Please confirm the new password here...",
                    error: Boolean(passwordForm.formState.errors.confirmPassword),
                    helperText: <ErrorMessage errors={passwordForm.formState.errors} name="confirmPassword" />,
                    slotProps: {
                      inputLabel: { shrink: true },
                    },
                  }}
                />
                <Box>
                  <FormHelperText>
                    Use 8 or more characters with a mix of uppercase letters, lowercase letters, numbers & symbols
                  </FormHelperText>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={showPassword} onChange={handleShowPasswordChange} />}
                      label="Show Password"
                    />
                  </FormGroup>
                </Box>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Button
                    aria-label="Update Password"
                    variant="contained"
                    type="submit"
                    loading={updateUserMutation.isPending}
                  >
                    Update Password
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
