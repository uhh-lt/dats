import { FormControl, FormHelperText, IconButton, Input, InputAdornment, InputLabel } from "@mui/material";
import { Add } from "@mui/icons-material";
import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { CodeRead } from "../../../api/openapi";
import CodeHooks from "../../../api/CodeHooks";
import { QueryKey } from "../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";

interface CodeSetCreationInputProps {
  projectId: number;
  userId: number;
  isMenuOpen: boolean;
}

function CodeSetCreationInput({ projectId, userId, isMenuOpen }: CodeSetCreationInputProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // reset form when the menu closes
  useEffect(() => {
    reset();
  }, [isMenuOpen, reset]);

  // mutations
  const queryClient = useQueryClient();
  const createCodeMutation = CodeHooks.useCreateCode({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data: CodeRead) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, projectId]);
      queryClient.invalidateQueries([QueryKey.USER_CODES, userId]);
      SnackbarAPI.openSnackbar({
        text: `Added Codeset ${data.name}`,
        severity: "success",
      });
      reset(); // reset form
    },
  });

  // form handling
  const handleCodeCreation = (data: any) => {
    createCodeMutation.mutate({
      requestBody: {
        name: data.name,
        description: "",
        color: "",
        project_id: projectId,
        user_id: userId,
        parent_code_id: undefined,
      },
    });
  };
  const handleError = (data: any) => console.error(data);

  return (
    <form onSubmit={handleSubmit(handleCodeCreation, handleError)} onKeyDown={(e) => e.stopPropagation()}>
      <FormControl sx={{ mx: 2, mb: 1 }} variant="standard">
        <InputLabel htmlFor="filled-adornment-password">New Codeset</InputLabel>
        <Input
          id="filled-adornment-password"
          type={"text"}
          size="small"
          {...register("name", { required: "Codeset name is required!" })}
          error={Boolean(errors?.name)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton aria-label="toggle password visibility" type="submit">
                <Add />
              </IconButton>
            </InputAdornment>
          }
        />
        <FormHelperText id="outlined-weight-helper-text" error={Boolean(errors?.name)}>
          <ErrorMessage errors={errors} name="name" />
        </FormHelperText>
      </FormControl>
    </form>
  );
}

export default CodeSetCreationInput;
