import { CodeHooks } from "@api/hooks/CodeHooks";
import { CodeRead } from "@api/models/CodeRead";
import { CodeUpdate } from "@api/models/CodeUpdate";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormColorPicker, FormMenu, FormText, FormTextMultiline } from "@components/form-inputs";
import { useWithLevel } from "@components/tree-explorer";
import { useOpenConfirmationDialog } from "@core/notification";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useCloseDialog, useDialogState } from "@store/global/dialogBusSlice";
import { ColorUtils } from "@utils/colors/ColorUtils";
import { useCallback, useEffect, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { CodeRenderer } from "../CodeRenderer";

type CodeEditValues = {
  parentCodeId: number | undefined;
  name: string;
  color: string;
  description: string | undefined;
};

interface CodeEditDialogProps {
  onCodeUpdated?: (idsToExpand: number[]) => void;
  onCodeDeleted?: (codeId: number) => void;
}

export function CodeEditDialog({ onCodeUpdated, onCodeDeleted }: CodeEditDialogProps) {
  const { isOpen, data: dialogData } = useDialogState("codeEdit");
  const handleClose = useCloseDialog("codeEdit");

  // confirmation dialog
  const openConfirmationDialog = useOpenConfirmationDialog();

  // codes for selection as parent
  const codes = CodeHooks.useGetEnabledCodes();
  const parentCodes = useMemo(() => {
    if (!codes.data || !dialogData?.code) return [];

    if (dialogData.code.is_system) {
      return codes.data.filter((c) => c.id !== dialogData.code.id);
    } else {
      return codes.data.filter((c) => c.id !== dialogData.code.id && !c.is_system);
    }
  }, [dialogData, codes.data]);
  const codeTree = useWithLevel(parentCodes);

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
    if (isOpen && dialogData?.code) {
      reset({
        name: dialogData.code.name,
        description: dialogData.code.description,
        color: ColorUtils.rgbStringToHex(dialogData.code.color) || dialogData.code.color,
        parentCodeId: dialogData.code.parent_id || -1,
      });
    }
  }, [isOpen, reset, dialogData]);

  // form actions
  const { mutate: updateCodeMutation, isPending: isUpdateLoading } = CodeHooks.useUpdateCode();
  const handleCodeUpdate = useCallback<SubmitHandler<CodeEditValues>>(
    (updateData) => {
      if (dialogData?.code) {
        // only allow updating of color for SYSTEM CODES
        let requestBody: CodeUpdate = {
          color: updateData.color,
        };
        if (!dialogData.code.is_system) {
          requestBody = {
            ...requestBody,
            name: updateData.name,
            description: updateData.description,
            parent_id: updateData.parentCodeId === -1 ? null : updateData.parentCodeId,
          };
        }
        updateCodeMutation(
          {
            requestBody,
            codeId: dialogData.code.id,
          },
          {
            onSuccess: (data: CodeRead) => {
              // check if we updated the parent code
              if (data.parent_id !== dialogData.code.parent_id) {
                // if we edited a code successfully, we want to show the code in the code explorer
                // this means, we might have to expand the parent codes, so the new code is visible
                const codesToExpand = [];
                let parentCodeId = data.parent_id;
                while (parentCodeId) {
                  const currentParentCodeId = parentCodeId;
                  codesToExpand.push(parentCodeId);
                  parentCodeId = codes.data?.find((code) => code.id === currentParentCodeId)?.parent_id;
                }
                onCodeUpdated?.(codesToExpand);
              }
              handleClose();
            },
          },
        );
      }
    },
    [dialogData, updateCodeMutation, codes, handleClose, onCodeUpdated],
  );
  const { mutate: deleteCodeMutation, isPending: isDeleteLoading } = CodeHooks.useDeleteCode();
  const handleCodeDelete = useCallback(() => {
    // disallow deleting of SYSTEM CODES
    if (dialogData?.code && !dialogData.code.is_system) {
      openConfirmationDialog({
        type: "DELETE",
        text: `Do you really want to delete the code "${dialogData.code.name}"? This action cannot be undone!`,
        onAccept: () => {
          deleteCodeMutation(
            { codeId: dialogData.code.id },
            {
              onSuccess: () => {
                onCodeDeleted?.(dialogData.code.id);
                handleClose();
              },
            },
          );
        },
      });
    } else {
      throw new Error("Invalid invocation of method handleCodeDelete! Only call when code.data is available!");
    }
  }, [deleteCodeMutation, dialogData, handleClose, onCodeDeleted, openConfirmationDialog]);
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
        title={`Edit code ${dialogData?.code?.name}`}
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
              disabled: dialogData?.code?.is_system,
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
              disabled: dialogData?.code?.is_system,
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
            textFieldProps={{
              label: "Description",
              error: Boolean(errors.description),
              helperText: <ErrorMessage errors={errors} name="description" />,
              variant: "standard",
              disabled: dialogData?.code?.is_system,
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
          disabled={!dialogData?.code || dialogData.code.is_system}
        >
          Delete Code
        </LoadingButton>
        <LoadingButton
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          fullWidth
          type="submit"
          disabled={!dialogData?.code || dialogData.code.is_system}
          loading={isUpdateLoading}
          loadingPosition="start"
        >
          Update Code
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
