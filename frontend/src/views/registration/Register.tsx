import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI";
import UserHooks from "../../api/UserHooks";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import { EMAIL_REGEX } from "../../utils/GlobalConstants";

function Register() {
  let navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  // password
  const password = useRef();
  password.current = watch("password", "");
  const [showPassword, setShowPassword] = useState(false);
  const handleShowPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowPassword(event.target.checked);
  };

  // mail
  const mail = useRef();
  mail.current = watch("mail", "");

  // registration
  const registerUserMutation = UserHooks.useRegister();

  // form handling
  const handleRegistration = (data: any) => {
    registerUserMutation.mutate(
      {
        requestBody: {
          first_name: data.firstName,
          last_name: data.lastName,
          password: data.password,
          email: data.mail,
        },
      },
      {
        onSuccess: () => {
          SnackbarAPI.openSnackbar({
            text: "Registration success! Redirecting to login...",
            severity: "success",
          });
          setTimeout(() => {
            navigate("/login");
          }, 1000);
        },
      }
    );
  };
  const handleError = (data: any) => console.error(data);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexDirection: "column",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <Typography variant="h4" component="div" align="center">
        D-WISE Tool Suite
      </Typography>
      <Card sx={{ width: 450 }} raised>
        <form onSubmit={handleSubmit(handleRegistration, handleError)}>
          <CardContent>
            <Typography variant="h5" component="div" align="center">
              Create your D-WISE Account
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1, mb: 0.5 }}>
              <TextField
                variant="outlined"
                fullWidth
                label="First name"
                type="text"
                {...register("firstName", { required: "First name is required" })}
                error={Boolean(errors.firstName)}
                helperText={<ErrorMessage errors={errors} name="firstName" />}
              />
              <TextField
                variant="outlined"
                fullWidth
                label="Last name"
                type="text"
                {...register("lastName", { required: "Last name is required" })}
                error={Boolean(errors.lastName)}
                helperText={<ErrorMessage errors={errors} name="lastName" />}
              />
            </Stack>

            <TextField
              variant="outlined"
              fullWidth
              label="E-Mail"
              type="email"
              margin="dense"
              {...register("mail", {
                required: "E-Mail is required",
                validate: (value) => {
                  return [EMAIL_REGEX].every((pattern) => pattern.test(value)) || "Please enter a valid email address!";
                },
              })}
              error={Boolean(errors.mail)}
              helperText={<ErrorMessage errors={errors} name="mail" />}
            />
            <TextField
              variant="outlined"
              fullWidth
              label="E-Mail Confirm"
              type="email"
              margin="dense"
              {...register("confirmMail", {
                required: "E-Mail is required",
                validate: (value) => value === mail.current || "E-Mails do not match!",
              })}
              error={Boolean(errors.confirmMail)}
              helperText={<ErrorMessage errors={errors} name="confirmMail" />}
            />

            <Stack direction="row" spacing={2} sx={{ mt: 1, mb: 0.5 }}>
              <TextField
                variant="outlined"
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                {...register("password", {
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
                })}
                error={Boolean(errors.password)}
                helperText={<ErrorMessage errors={errors} name="password" />}
              />
              <TextField
                variant="outlined"
                label="Password Confirm"
                type={showPassword ? "text" : "password"}
                fullWidth
                {...register("confirmPassword", {
                  required: "Password is required",
                  validate: (value) => value === password.current || "Passwords do not match!",
                })}
                error={Boolean(errors.confirmPassword)}
                helperText={<ErrorMessage errors={errors} name="confirmPassword" />}
              />
            </Stack>
            <FormHelperText sx={{ ml: 1.8 }}>
              Use 8 or more characters with a mix of uppercase letters, lowercase letters, numbers & symbols
            </FormHelperText>
            <FormGroup sx={{ ml: 1 }}>
              <FormControlLabel
                control={<Checkbox value={showPassword} onChange={handleShowPasswordChange} />}
                label="Show Password"
              />
            </FormGroup>
          </CardContent>
          <CardActions>
            <Button color="primary" component={Link} to="/login">
              Back
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <LoadingButton
              variant="contained"
              color="success"
              type="submit"
              disabled={registerUserMutation.isSuccess}
              loading={registerUserMutation.isLoading}
              loadingPosition="start"
              startIcon={<AppRegistrationIcon />}
            >
              Register
            </LoadingButton>
          </CardActions>
        </form>
      </Card>
    </Box>
  );
}

export default Register;
