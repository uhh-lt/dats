import { ErrorMessage } from "@hookform/error-message";
import { DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MemoRead } from "../../api/openapi";
import { LoadingButton } from "@mui/lab";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import UserHooks from "../../api/UserHooks";

interface MemoFormProps {
  title: string;
  memo: MemoRead | undefined;
  handleCreateOrUpdateMemo: (data: any) => void;
  handleDeleteMemo: () => void;
  isUpdateLoading: boolean;
  isCreateLoading: boolean;
  isDeleteLoading: boolean;
}

export function MemoForm({
  title,
  memo,
  handleCreateOrUpdateMemo,
  handleDeleteMemo,
  isCreateLoading,
  isUpdateLoading,
  isDeleteLoading,
}: MemoFormProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const user = UserHooks.useGetUser(memo?.user_id);

  // initialize form when memo changes
  useEffect(() => {
    if (memo) {
      reset({
        title: memo.title,
        content: memo.content,
      });
    } else {
      reset();
    }
  }, [memo, reset]);

  // form handling
  const handleError = (data: any) => console.error(data);

  return (
    <React.Fragment>
      <form onSubmit={handleSubmit(handleCreateOrUpdateMemo, handleError)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            {memo && user.data && (
              <>
                <TextField
                  label="Author"
                  defaultValue={`${user.data.first_name} ${user.data.last_name}`}
                  fullWidth
                  variant="standard"
                  disabled
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    fullWidth
                    label="Created"
                    value={new Date(memo.created).toLocaleDateString("en-CA")}
                    type="date"
                    variant="standard"
                    InputLabelProps={{ shrink: true }}
                    disabled
                  />
                  <TextField
                    fullWidth
                    label="Updated"
                    value={new Date(memo.updated).toLocaleDateString("en-CA")}
                    type="date"
                    variant="standard"
                    InputLabelProps={{ shrink: true }}
                    disabled
                  />
                </Stack>
              </>
            )}
            <TextField
              label="Title"
              fullWidth
              variant="standard"
              {...register("title", { required: "Title is required" })}
              error={Boolean(errors.title)}
              helperText={<ErrorMessage errors={errors} name="title" />}
            />
            <TextField
              multiline
              minRows={5}
              label="Content"
              fullWidth
              variant="standard"
              {...register("content", { required: "Content is required" })}
              error={Boolean(errors.content)}
              helperText={<ErrorMessage errors={errors} name="content" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          {memo ? (
            <>
              <LoadingButton
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                loading={isDeleteLoading}
                loadingPosition="start"
                onClick={handleDeleteMemo}
                sx={{ flexShrink: 0 }}
              >
                Delete Memo
              </LoadingButton>
              <LoadingButton
                variant="contained"
                color="success"
                startIcon={<SaveIcon />}
                fullWidth
                type="submit"
                loading={isUpdateLoading}
                loadingPosition="start"
              >
                Update memo
              </LoadingButton>
            </>
          ) : (
            <LoadingButton
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              fullWidth
              type="submit"
              loading={isCreateLoading}
              loadingPosition="start"
            >
              Create memo
            </LoadingButton>
          )}
        </DialogActions>
      </form>
    </React.Fragment>
  );
}
