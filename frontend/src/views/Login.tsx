import React from "react";
import { Box, Button, Card, CardActions, CardContent, TextField, Typography } from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LockIcon from "@mui/icons-material/Lock";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "../api/openapi";
import { ErrorMessage } from '@hookform/error-message';

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();
  let navigate = useNavigate();
  let location = useLocation();
  const { login, isLoggedIn } = useAuth();

  // when we were redirected from <RequireAuth>, we know where the user left!
  // @ts-ignore
  let from = location.state?.from?.pathname || "/projects";

  // form handling
  const handleLogin = async (data: any) => {
    login(data.user, data.password)
      .then(() => {
        // Send them back to the page they tried to visit when they were redirected to the login page
        navigate(from, { replace: true });
      })
      .catch((e: ApiError) => {
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
      });
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
      {isLoggedIn ? (
        <>Hi! You are already logged in :)</>
      ) : (
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
                helperText={<ErrorMessage errors={errors} name='user' />}
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
                helperText={<ErrorMessage errors={errors} name='password' />}
              />
            </Box>
          </CardContent>
          <CardActions>
            <Button color="primary" component={Link} to="/register">
              Create Account
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" color="success" type="submit">
              Login
            </Button>
          </CardActions>
        </Card>
      )}
    </Box>
  );
}

export default Login;
