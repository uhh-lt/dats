import { Box, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import eventBus from "../../../EventBus";
import { CodeRead, CodeUpdate } from "../../../api/openapi";
import CodeHooks from "../../../api/CodeHooks";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { HexColorPicker } from "react-colorful";
import ColorUtils from "../../../utils/ColorUtils";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import { SYSTEM_USER_ID } from "../../../utils/GlobalConstants";
import { AnnoActions } from "../annoSlice";
import { useAppDispatch } from "../../../plugins/ReduxHooks";

type CodeEditValues = {
  parentCodeId: number | undefined;
  name: string;
  color: string;
  description: string | undefined;
};

interface CodeEditDialogProps {
  codes: CodeRead[];
}

function CodeEditDialog({ codes }: CodeEditDialogProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CodeEditValues>();

  // local state
  const [code, setCode] = useState<CodeRead>();
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState("#000000");

  // redux
  const dispatch = useAppDispatch();

  // computed
  const parentCodes = useMemo(() => codes.filter((code) => code.user_id !== SYSTEM_USER_ID), [codes]);

  const resetForm = useCallback(
    (code: CodeRead | undefined) => {
      if (code) {
        const c = ColorUtils.rgbStringToHex(code.color) || code.color;
        reset({
          name: code.name,
          description: code.description,
          color: c,
          parentCodeId: code.parent_code_id || -1,
        });
        setColor(c);
      }
    },
    [reset]
  );

  // listen to event
  // create a (memoized) function that stays the same across re-renders
  const onOpenEditCode = useCallback(
    (event: CustomEventInit) => {
      setOpen(true);
      setCode(event.detail);
      resetForm(event.detail);
    },
    [resetForm]
  );

  useEffect(() => {
    eventBus.on("open-edit-code", onOpenEditCode);
    return () => {
      eventBus.remove("open-edit-code", onOpenEditCode);
    };
  }, [onOpenEditCode]);

  // mutations
  const updateCodeMutation = CodeHooks.useUpdateCode();
  const deleteCodeMutation = CodeHooks.useDeleteCode();

  // form handling
  const handleCodeUpdate: SubmitHandler<CodeEditValues> = (data) => {
    if (code) {
      // only allow updating of color for SYSTEM CODES
      let requestBody: CodeUpdate = {
        color: data.color,
      };

      if (code.user_id !== SYSTEM_USER_ID) {
        requestBody = {
          ...requestBody,
          name: data.name,
          description: data.description,
          parent_code_id: data.parentCodeId === -1 ? undefined : data.parentCodeId,
        };
      }

      updateCodeMutation.mutate(
        {
          requestBody,
          codeId: code.id,
        },
        {
          onSuccess: (data: CodeRead) => {
            // check if we updated the parent code
            if (data.parent_code_id !== code.parent_code_id) {
              // if we edited a code successfully, we want to show the code in the code explorer
              // this means, we might have to expand the parent codes, so the new code is visible
              const codesToExpand = [];
              let parentCodeId = data.parent_code_id;
              while (parentCodeId) {
                codesToExpand.push(parentCodeId);
                parentCodeId = codes.find((code) => code.id === parentCodeId)?.parent_code_id;
              }
              dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
            }

            setOpen(false); // close dialog
            SnackbarAPI.openSnackbar({
              text: `Updated code ${data.name}`,
              severity: "success",
            });
          },
        }
      );
    }
  };
  const handleError: SubmitErrorHandler<CodeEditValues> = (data) => console.error(data);
  const handleCodeDelete = () => {
    // disallow deleting of SYSTEM CODES
    if (code && code.user_id !== SYSTEM_USER_ID) {
      deleteCodeMutation.mutate(
        { codeId: code.id },
        {
          onSuccess: (data: CodeRead) => {
            setOpen(false); // close dialog
            SnackbarAPI.openSnackbar({
              text: `Deleted code ${data.name}`,
              severity: "success",
            });
          },
        }
      );
    } else {
      throw new Error("Invalid invocation of method handleCodeDelete! Only call when code.data is available!");
    }
  };

  let menuItems: React.ReactNode[];
  if (!code || code.user_id === SYSTEM_USER_ID) {
    menuItems = codes
      .filter((c) => c.id !== code?.id)
      .map((code) => (
        <MenuItem key={code.id} value={code.id}>
          {code.name}
        </MenuItem>
      ));
  } else {
    menuItems = parentCodes
      .filter((c) => c.id !== code?.id)
      .map((code) => (
        <MenuItem key={code.id} value={code.id}>
          {code.name}
        </MenuItem>
      ));
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleCodeUpdate, handleError)}>
        <DialogTitle>Edit code {code?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              key={code?.id}
              fullWidth
              select
              label="Parent Code"
              variant="filled"
              defaultValue={code?.parent_code_id || -1}
              {...register("parentCodeId")}
              error={Boolean(errors.parentCodeId)}
              helperText={<ErrorMessage errors={errors} name="parentCodeId" />}
              disabled={!code || code.user_id === SYSTEM_USER_ID}
            >
              <MenuItem key={-1} value={-1}>
                No parent
              </MenuItem>
              {menuItems}
            </TextField>
            <TextField
              label="Name"
              fullWidth
              variant="standard"
              {...register("name", { required: "Code name is required" })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
              disabled={!code || code.user_id === SYSTEM_USER_ID}
            />
            <Stack direction="row">
              <TextField
                label="Color"
                fullWidth
                variant="standard"
                {...register("color", { required: "Color is required" })}
                onChange={(e) => setColor(e.target.value)}
                error={Boolean(errors.color)}
                helperText={<ErrorMessage errors={errors} name="color" />}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ width: 48, height: 48, backgroundColor: color, ml: 1, flexShrink: 0 }} />
            </Stack>
            <HexColorPicker
              style={{ width: "100%" }}
              color={color}
              onChange={(newColor) => {
                setValue("color", newColor); // set value of text input
                setColor(newColor); // set value of color picker (and box)
              }}
            />
            <TextField
              multiline
              minRows={5}
              label="Description"
              fullWidth
              variant="standard"
              {...register("description")}
              error={Boolean(errors.description)}
              helperText={<ErrorMessage errors={errors} name="description" />}
              disabled={!code || code.user_id === SYSTEM_USER_ID}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <LoadingButton
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            loading={deleteCodeMutation.isLoading}
            loadingPosition="start"
            onClick={handleCodeDelete}
            sx={{ flexShrink: 0 }}
            disabled={!code || code.user_id === SYSTEM_USER_ID}
          >
            Delete Code
          </LoadingButton>
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            fullWidth
            type="submit"
            disabled={!code}
            loading={updateCodeMutation.isLoading}
            loadingPosition="start"
          >
            Update Code
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default CodeEditDialog;
