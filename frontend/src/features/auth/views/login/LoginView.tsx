import { ApiError } from "@api/core/ApiError";
import { GeneralHooks } from "@api/hooks/GeneralHooks";
import { AuthenticationService } from "@api/services/AuthenticationService";
import { DATSLogo } from "@components/DATSLogo";
import { FormPassword, FormText } from "@components/form-inputs";
import { handleOIDCLogin, useAuth } from "@core/auth";
import { ErrorMessage } from "@hookform/error-message";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LockIcon from "@mui/icons-material/Lock";
import LoginIcon from "@mui/icons-material/Login";
import { Box, Button, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

const routeApi = getRouteApi("/_public/login");

interface LoginFormValues {
  user: string;
  password: string;
}

export function LoginView() {
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
  const { redirect } = routeApi.useSearch();
  const navigate = useNavigate();
  const { updateAuthData } = useAuth();

  // get info about the instance, is OIDC enabled?
  const { data: instanceInfo } = useSuspenseQuery(GeneralHooks.instanceInfoQueryOptions());

  // login
  const { mutate: loginMutation, isPending: loginIsPending } = useMutation({
    mutationFn: AuthenticationService.login,
    retry: false,
    onSuccess(data) {
      updateAuthData(data);
      navigate({ to: redirect });
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

  // form handling
  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    loginMutation({ formData: { username: data.user, password: data.password } });
  };
  const handleError: SubmitErrorHandler<LoginFormValues> = (data) => console.error(data);

  return (
    <Stack
      gap={4}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <DATSLogo />
      <>
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
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  loading={loginIsPending}
                  loadingPosition="start"
                  startIcon={<LoginIcon />}
                >
                  Sign in
                </Button>
              </Box>
            </form>
            {instanceInfo.is_oidc_enabled && (
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
                  Sign in with {instanceInfo.oidc_provider_name}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        {!navigator.userAgent.includes("Chrome") && (
          <Card sx={{ width: "66%" }} variant="outlined">
            <CardContent>
              <Typography component="div" align="justify">
                Please use the Chrome browser for the best experience! We cannot guarantee that DATS works properly in
                other browsers.
              </Typography>
            </CardContent>
          </Card>
        )}
        {!instanceInfo.is_stable && (
          <Card sx={{ width: "66%", borderColor: "red" }} variant="outlined">
            <CardContent>
              <Typography component="div" align="justify">
                You are about to enter the Discourse Analysis Tool Suite Demo. Several projects are prepared, but you
                can also create new projects and import your own data. This server is wiped regulary.{" "}
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
      </>
    </Stack>
  );
}
