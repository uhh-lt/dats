import { ErrorMessage } from "@hookform/error-message";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LockIcon from "@mui/icons-material/Lock";
import LoginIcon from "@mui/icons-material/Login";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";
import { Box, Button, Card, CardContent, Divider, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/openapi/core/ApiError.ts";
import { AuthenticationService } from "../api/openapi/services/AuthenticationService.ts";
import { handleOIDCLogin } from "../auth/HandleOIDCLogin.ts";
import { LoginStatus } from "../auth/LoginStatus.ts";
import { useAuth } from "../auth/useAuth.ts";
import FormPassword from "../components/FormInputs/FormPassword.tsx";
import FormText from "../components/FormInputs/FormText.tsx";

interface LoginFormValues {
  user: string;
  password: string;
}

function Login() {
  const {
    handleSubmit,
    formState: { errors },
    setError,
    control,
  } = useForm<LoginFormValues>({
    defaultValues: {
      user: "",
      password: "",
    },
  });
  const location = useLocation();
  const { updateAuthData, loginStatus } = useAuth();

  // login
  const { mutate: loginMutation, isPending: loginIsPending } = useMutation({
    mutationFn: AuthenticationService.login,
    retry: false,
    onSuccess(data) {
      updateAuthData(data);
    },
    onError(e: ApiError) {
      let msg = "Server is not available!";
      if (e.status === 403) {
        msg = "User and password do not match!";
      }
      setError("user", {
        message: msg,
      });
      setError("password", {
        message: msg,
      });
    },
  });

  // when we were redirected from <RequireAuth>, we know where the user left!
  const from = location.state?.from?.pathname || "/projects";

  // form handling
  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    loginMutation({ formData: { username: data.user, password: data.password } });
  };
  const handleError: SubmitErrorHandler<LoginFormValues> = (data) => console.error(data);

  if (loginStatus === LoginStatus.LOGGED_IN) {
    return <Navigate to={from} replace />;
  }

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
        Discourse Analysis Tool Suite
      </Typography>
      <Card sx={{ width: 450 }} raised>
        <CardContent>
          <Typography variant="h5" component="div" align="center">
            Welcome!
          </Typography>
          <form onSubmit={handleSubmit(handleLogin, handleError)}>
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <AccountCircle sx={{ color: "action.active", mr: 1 }} fontSize="medium" />
              <FormText
                name="user"
                control={control}
                rules={{
                  required: "User is required",
                }}
                textFieldProps={{
                  label: "User",
                  placeholder: "User",
                  variant: "outlined",
                  fullWidth: true,
                  error: Boolean(errors.user),
                  helperText: <ErrorMessage errors={errors} name="user" />,
                }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
              <LockIcon sx={{ color: "action.active", mr: 1 }} fontSize="medium" />
              <FormPassword
                name="password"
                control={control}
                rules={{
                  required: "Password is required",
                }}
                textFieldProps={{
                  label: "Password",
                  placeholder: "Password",
                  variant: "outlined",
                  fullWidth: true,
                  error: Boolean(errors.password),
                  helperText: <ErrorMessage errors={errors} name="password" />,
                }}
              />
            </Box>
            <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button color="primary" component={Link} to="/register">
                Create Account
              </Button>
              <LoadingButton
                variant="contained"
                color="primary"
                type="submit"
                loading={loginStatus === LoginStatus.LOADING || loginIsPending}
                loadingPosition="start"
                startIcon={<LoginIcon />}
              >
                Sign in
              </LoadingButton>
            </Box>
          </form>
          {import.meta.env.VITE_APP_SSO_PROVIDER !== "null" && (
            <>
              <Box sx={{ mt: 2 }}>
                <Divider>
                  <Typography variant="body2" color="textSecondary">
                    or sign in with SSO
                  </Typography>
                </Divider>
              </Box>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => handleOIDCLogin(updateAuthData)}
              >
                Sign in with {import.meta.env.VITE_APP_SSO_PROVIDER}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {!navigator.userAgent.includes("Chrome") && (
        <Card sx={{ width: "66%", mt: 4 }} variant="outlined">
          <CardContent>
            <Typography component="div" align="justify">
              Please use the Chrome browser for the best experience! We cannot guarantee that DATS works properly in
              other browsers.
            </Typography>
          </CardContent>
        </Card>
      )}
      {import.meta.env.VITE_APP_STABILITY === "UNSTABLE" && (
        <Card sx={{ width: "66%", borderColor: "red", mt: 4 }} variant="outlined">
          <CardContent>
            <Typography component="div" align="justify">
              You are about to enter the Discourse Analysis Tool Suite Demo. Several projects are prepared, but you can
              also create new projects and import your own data. This server is wiped regulary.{" "}
              <u style={{ backgroundColor: "yellow" }}>Do not store sensitive data!</u>
            </Typography>
            <Typography sx={{ mt: 1 }}>
              <b>User</b>: demo@example.org
              <br />
              <b>Password</b>: demo
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default Login;
