import { ErrorMessage } from "@hookform/error-message";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LockIcon from "@mui/icons-material/Lock";
import LoginIcon from "@mui/icons-material/Login";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";
import { Box, Button, Card, CardActions, CardContent, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/openapi/core/ApiError.ts";
import { AuthenticationService } from "../api/openapi/services/AuthenticationService.ts";
import { LoginStatus } from "../auth/LoginStatus.ts";
import { useAuth } from "../auth/useAuth.ts";
interface LoginFormValues {
  user: string;
  password: string;
}

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>();
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
        D-WISE Tool Suite
      </Typography>
      <Card sx={{ width: 450 }} raised component={"form"} onSubmit={handleSubmit(handleLogin, handleError)}>
        <CardContent>
          <Typography variant="h5" component="div" align="center">
            Welcome!
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
            <AccountCircle sx={{ color: "action.active", mr: 1 }} fontSize="medium" />
            <TextField
              variant="outlined"
              fullWidth
              placeholder="User"
              {...register("user", { required: "User is required" })}
              error={Boolean(errors.user)}
              helperText={<ErrorMessage errors={errors} name="user" />}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
            <LockIcon sx={{ color: "action.active", mr: 1 }} fontSize="medium" />
            <TextField
              variant="outlined"
              fullWidth
              placeholder="Password"
              type="password"
              {...register("password", { required: "Password is required" })}
              error={Boolean(errors.password)}
              helperText={<ErrorMessage errors={errors} name="password" />}
            />
          </Box>
        </CardContent>
        <CardActions>
          <Button color="primary" component={Link} to="/register">
            Create Account
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <LoadingButton
            variant="contained"
            color="success"
            type="submit"
            loading={loginStatus === LoginStatus.LOADING || loginIsPending}
            loadingPosition="start"
            startIcon={<LoginIcon />}
            sx={{ flexShrink: 0 }}
          >
            Login
          </LoadingButton>
        </CardActions>
      </Card>

      {!navigator.userAgent.includes("Chrome") && (
        <Card sx={{ width: "66%", mt: 4 }} variant="outlined" component={"div"}>
          <CardContent>
            <Typography component="div" align="justify">
              Please use the Chrome browser for the best experience! We cannot guarantee that the DWTS works properly in
              other browsers.
            </Typography>
          </CardContent>
        </Card>
      )}
      {import.meta.env.VITE_APP_STABILITY === "UNSTABLE" && (
        <Card sx={{ width: "66%", borderColor: "red", mt: 4 }} variant="outlined" component={"div"}>
          <CardContent>
            <Typography component="div" align="justify">
              You are about to enter the D-WISE Tool Suite Demo. Several projects are prepared, but you can also create
              new projects and import your own data. This server is wiped regulary.{" "}
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
