import { ErrorMessage } from "@hookform/error-message";
import { DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { MemoRead } from "../../api/openapi";
import { LoadingButton } from "@mui/lab";

interface MemoFormProps {
  title: string;
  memo: MemoRead | undefined;
  handleCreateOrUpdateMemo: (data: any) => void;
  isUpdateLoading: boolean;
  isCreateLoading: boolean;
}

export function MemoForm({ title, memo, handleCreateOrUpdateMemo, isCreateLoading, isUpdateLoading }: MemoFormProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

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
            {memo && (
              <>
                <TextField label="Author" defaultValue={memo.user_id} fullWidth variant="standard" disabled />
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
            <LoadingButton
              variant="contained"
              color="success"
              fullWidth
              type="submit"
              loading={isUpdateLoading}
              loadingPosition="start"
            >
              Update memo
            </LoadingButton>
          ) : (
            <LoadingButton
              variant="contained"
              color="success"
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
