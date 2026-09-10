import { UserHooks } from "@api/hooks/UserHooks";
import { FormPassword } from "@components/form-inputs";
import { useOpenSnackbar } from "@core/notification";
import { ErrorMessage } from "@hookform/error-message";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Stack,
  Typography,
} from "@mui/material";
import { SUPPORT_EMAIL } from "@utils/GlobalConstants";
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm, useWatch } from "react-hook-form";

type UpdatePasswordValues = {
  password: string;
  confirmPassword: string;
};

export function PasswordReset() {
  const updateUserMutation = UserHooks.useUpdate();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<UpdatePasswordValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({
    control,
    name: "password",
    defaultValue: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const handleShowPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowPassword(event.target.checked);
  };

  // snack bar
  const openSnackbar = useOpenSnackbar();

  const handleUpdate: SubmitHandler<UpdatePasswordValues> = (data) => {
    updateUserMutation.mutate(
      {
        requestBody: {
          password: data.password,
        },
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: `Hurray! Your password updated successfully.`,
            severity: "success",
          });
        },
        onError: () => {
          openSnackbar({
            text: `Sorry! Your password update failed. Please contact` + { SUPPORT_EMAIL },
            severity: "error",
          });
        },
      },
    );
  };

  const handleError: SubmitErrorHandler<UpdatePasswordValues> = (data) => console.error(data);

  return (
    <>
      <Typography variant="h5" sx={{ pb: 1 }}>
        Update Password
      </Typography>
      <Divider />
      <Box component="form" onSubmit={handleSubmit(handleUpdate, handleError)} sx={{ pt: 3, maxWidth: 480 }}>
        <Stack spacing={3}>
          <FormPassword
            name="password"
            control={control}
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
              error: Boolean(errors.password),
              helperText: <ErrorMessage errors={errors} name="password" />,
              slotProps: {
                inputLabel: { shrink: true },
              },
            }}
          />
          <FormPassword
            name="confirmPassword"
            control={control}
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
              error: Boolean(errors.confirmPassword),
              helperText: <ErrorMessage errors={errors} name="confirmPassword" />,
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
              Update
            </Button>
          </Stack>
        </Stack>
      </Box>
    </>
  );
}
