import { ErrorMessage } from "@hookform/error-message";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { DialogActions, DialogContent, DialogTitle, Stack, TextField, Tooltip } from "@mui/material";
import React from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import UserHooks from "../../../api/UserHooks.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { dateToLocaleYYYYMMDDString } from "../../../utils/DateUtils.ts";
import FormText from "../../FormInputs/FormText.tsx";
import FormTextMultiline from "../../FormInputs/FormTextMultiline.tsx";

export interface MemoFormValues {
  title: string;
  content: string;
}

interface MemoFormProps {
  title: string;
  memo: MemoRead | undefined;
  handleCreateOrUpdateMemo: SubmitHandler<MemoFormValues>;
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
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<MemoFormValues>({
    defaultValues: {
      title: memo?.title || "",
      content: memo?.content || "",
    },
  });

  const user = UserHooks.useGetUser(memo?.user_id);

  // form handling
  const handleError: SubmitErrorHandler<MemoFormValues> = (data) => console.error(data);

  return (
    <React.Fragment>
      <form onSubmit={handleSubmit(handleCreateOrUpdateMemo, handleError)}>
        <Tooltip title={title} placement="top">
          <DialogTitle style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </DialogTitle>
        </Tooltip>
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
                    value={dateToLocaleYYYYMMDDString(memo.created)}
                    type="date"
                    variant="standard"
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                    disabled
                  />
                  <TextField
                    fullWidth
                    label="Updated"
                    value={dateToLocaleYYYYMMDDString(memo.updated)}
                    type="date"
                    variant="standard"
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                    disabled
                  />
                </Stack>
              </>
            )}
            <FormText
              name="title"
              control={control}
              rules={{ required: "Title is required" }}
              textFieldProps={{
                label: "Title",
                error: Boolean(errors.title),
                helperText: <ErrorMessage errors={errors} name="title" />,
                variant: "standard",
                slotProps: {
                  inputLabel: { shrink: true },
                },
              }}
            />
            <FormTextMultiline
              name="content"
              control={control}
              rules={{ required: "Content is required" }}
              textFieldProps={{
                label: "Content",
                error: Boolean(errors.content),
                helperText: <ErrorMessage errors={errors} name="content" />,
                variant: "standard",
                slotProps: {
                  inputLabel: { shrink: true },
                },
              }}
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
