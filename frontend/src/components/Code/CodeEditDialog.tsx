import { ErrorMessage } from "@hookform/error-message";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import CodeHooks from "../../api/CodeHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { CodeUpdate } from "../../api/openapi/models/CodeUpdate.ts";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ColorUtils from "../../utils/ColorUtils.ts";
import { AnnoActions } from "../../views/annotation/annoSlice.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import FormColorPicker from "../FormInputs/FormColorPicker.tsx";
import FormMenu from "../FormInputs/FormMenu.tsx";
import FormText from "../FormInputs/FormText.tsx";
import FormTextMultiline from "../FormInputs/FormTextMultiline.tsx";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import { useWithLevel } from "../TreeExplorer/useWithLevel.ts";
import CodeRenderer from "./CodeRenderer.tsx";

type CodeEditValues = {
  parentCodeId: number | undefined;
  name: string;
  color: string;
  description: string | undefined;
};

function CodeEditDialog() {
  const dispatch = useAppDispatch();

  // the code to edit
  const code = useAppSelector((state) => state.dialog.code);

  // codes for selection as parent
  const codes = CodeHooks.useGetEnabledCodes();
  const parentCodes = useMemo(() => {
    if (!codes.data) return [];

    if (code?.is_system) {
      return codes.data.filter((c) => c.id !== code.id);
    } else {
      return codes.data.filter((c) => c.id !== code?.id && !c.is_system);
    }
  }, [code, codes.data]);
  const codeTree = useWithLevel(parentCodes);

  // open/close dialog
  const isOpen = useAppSelector((state) => state.dialog.isCodeEditDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeCodeEditDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<CodeEditValues>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen && code) {
      reset({
        name: code.name,
        description: code.description,
        color: ColorUtils.rgbStringToHex(code.color) || code.color,
        parentCodeId: code.parent_id || -1,
      });
    }
  }, [isOpen, reset, code]);

  // form actions
  const { mutate: updateCodeMutation, isPending: isUpdateLoading } = CodeHooks.useUpdateCode();
  const handleCodeUpdate = useCallback<SubmitHandler<CodeEditValues>>(
    (data) => {
      if (code) {
        // only allow updating of color for SYSTEM CODES
        let requestBody: CodeUpdate = {
          color: data.color,
        };
        if (!code.is_system) {
          requestBody = {
            ...requestBody,
            name: data.name,
            description: data.description,
            parent_id: data.parentCodeId === -1 ? null : data.parentCodeId,
          };
        }
        updateCodeMutation(
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
                  parentCodeId = codes.data?.find((code) => code.id === currentParentCodeId)?.parent_id;
                }
                dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
              }
              handleClose();
            },
          },
        );
      }
    },
    [code, updateCodeMutation, codes, dispatch, handleClose],
  );
  const { mutate: deleteCodeMutation, isPending: isDeleteLoading } = CodeHooks.useDeleteCode();
  const handleCodeDelete = useCallback(() => {
    // disallow deleting of SYSTEM CODES
    if (code && !code.is_system) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the code "${code.name}"? This action cannot be undone!`,
        onAccept: () => {
          deleteCodeMutation(
            { codeId: code.id },
            {
              onSuccess: () => {
                handleClose();
              },
            },
          );
        },
      });
    } else {
      throw new Error("Invalid invocation of method handleCodeDelete! Only call when code.data is available!");
    }
  }, [code, deleteCodeMutation, handleClose]);
  const handleError: SubmitErrorHandler<CodeEditValues> = (data) => console.error(data);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleCodeUpdate, handleError)}
    >
      <DATSDialogHeader
        title={`Edit code ${code?.name}`}
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={3}>
          <FormMenu
            name="parentCodeId"
            control={control}
            textFieldProps={{
              label: "Parent Code",
              error: Boolean(errors.parentCodeId),
              helperText: <ErrorMessage errors={errors} name="parentCodeId" />,
              variant: "filled",
              disabled: code?.is_system,
            }}
          >
            <MenuItem key={-1} value={-1}>
              No parent
            </MenuItem>
            {codeTree.map((cw) => (
              <MenuItem key={cw.data.id} value={cw.data.id} style={{ paddingLeft: cw.level * 10 + 6 }}>
                <CodeRenderer code={cw.data} />
              </MenuItem>
            ))}
          </FormMenu>
          <FormText
            name="name"
            control={control}
            rules={{ required: "Name is required" }}
            textFieldProps={{
              label: "Name",
              error: Boolean(errors.name),
              helperText: <ErrorMessage errors={errors} name="name" />,
              variant: "standard",
              disabled: code?.is_system,
            }}
          />
          <FormColorPicker
            name="color"
            control={control}
            rules={{ required: "Color is required" }}
            textFieldProps={{
              label: "Color",
              error: Boolean(errors.color),
              helperText: <ErrorMessage errors={errors} name="color" />,
              variant: "standard",
              fullWidth: true,
              slotProps: {
                inputLabel: { shrink: true },
              },
            }}
          />
          <FormTextMultiline
            name="description"
            control={control}
            rules={{ required: "Description is required" }}
            textFieldProps={{
              label: "Description",
              error: Boolean(errors.description),
              helperText: <ErrorMessage errors={errors} name="description" />,
              variant: "standard",
              disabled: code?.is_system,
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <LoadingButton
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          loading={isDeleteLoading}
          loadingPosition="start"
          onClick={handleCodeDelete}
          sx={{ flexShrink: 0 }}
          disabled={!code || code.is_system}
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
          loading={isUpdateLoading}
          loadingPosition="start"
        >
          Update Code
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default CodeEditDialog;
