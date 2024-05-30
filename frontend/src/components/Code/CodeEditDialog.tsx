import { ErrorMessage } from "@hookform/error-message";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import CodeHooks from "../../api/CodeHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { CodeUpdate } from "../../api/openapi/models/CodeUpdate.ts";
import ConfirmationAPI from "../../features/ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../../features/SnackbarDialog/SnackbarAPI.ts";
import { CRUDDialogActions } from "../../features/dialogSlice.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ColorUtils from "../../utils/ColorUtils.ts";
import { SYSTEM_USER_ID } from "../../utils/GlobalConstants.ts";
import { AnnoActions } from "../../views/annotation/annoSlice.ts";
import CodeRenderer from "./CodeRenderer.tsx";

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
  const [color, setColor] = useState("#000000");

  // redux
  const open = useAppSelector((state) => state.dialog.isCodeEditDialogOpen);
  const code = useAppSelector((state) => state.dialog.code);
  const dispatch = useAppDispatch();

  // computed
  const parentCodes = useMemo(() => codes.filter((code) => code.user_id !== SYSTEM_USER_ID), [codes]);

  // initialize form when code changes
  useEffect(() => {
    if (code) {
      const c = ColorUtils.rgbStringToHex(code.color) || code.color;
      reset({
        name: code.name,
        description: code.description,
        color: c,
        parentCodeId: code.parent_id || -1,
      });
      setColor(c);
    }
  }, [code, reset]);

  // mutations
  const updateCodeMutation = CodeHooks.useUpdateCode();
  const deleteCodeMutation = CodeHooks.useDeleteCode();

  const handleClose = () => {
    dispatch(CRUDDialogActions.closeCodeEditDialog());
  };

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
          parent_id: data.parentCodeId,
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
            if (data.parent_id !== code.parent_id) {
              // if we edited a code successfully, we want to show the code in the code explorer
              // this means, we might have to expand the parent codes, so the new code is visible
              const codesToExpand = [];
              let parentCodeId = data.parent_id;
              while (parentCodeId) {
                const currentParentCodeId = parentCodeId;

                codesToExpand.push(parentCodeId);
                parentCodeId = codes.find((code) => code.id === currentParentCodeId)?.parent_id;
              }
              dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
            }

            handleClose();
            SnackbarAPI.openSnackbar({
              text: `Updated code ${data.name}`,
              severity: "success",
            });
          },
        },
      );
    }
  };
  const handleError: SubmitErrorHandler<CodeEditValues> = (data) => console.error(data);
  const handleCodeDelete = () => {
    // disallow deleting of SYSTEM CODES
    if (code && code.user_id !== SYSTEM_USER_ID) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the code "${code.name}"? This action cannot be undone!`,
        onAccept: () => {
          deleteCodeMutation.mutate(
            { codeId: code.id },
            {
              onSuccess: (data: CodeRead) => {
                handleClose();
                SnackbarAPI.openSnackbar({
                  text: `Deleted code ${data.name}`,
                  severity: "success",
                });
              },
            },
          );
        },
      });
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
          <CodeRenderer code={code} />
        </MenuItem>
      ));
  } else {
    menuItems = parentCodes
      .filter((c) => c.id !== code?.id)
      .map((code) => (
        <MenuItem key={code.id} value={code.id}>
          <CodeRenderer code={code} />
        </MenuItem>
      ));
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
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
              defaultValue={code?.parent_id || -1}
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
            loading={deleteCodeMutation.isPending}
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
            loading={updateCodeMutation.isPending}
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
