import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormColorPicker, FormMenu, FormText, FormTextMultiline } from "@components/form-inputs";
import { useWithLevel } from "@components/tree-explorer";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, MenuItem, Stack, rgbToHex } from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { contrastiveColors } from "@utils/colors/colors";
import { useCallback, useEffect, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { CodeHooks } from "../api/codeHooks";
import { CodeRenderer } from "../renderer";

type CodeCreateValues = {
  parentCodeId: string | number;
  name: string;
  color: string;
  description: string;
};

interface CodeCreateDialogProps {
  projectId: number;
  onCodesCreated?: (idsToExpand: number[]) => void;
}

export function CodeCreateDialog({ projectId, onCodesCreated }: CodeCreateDialogProps) {
  const { isOpen, data: dialogData, close: handleClose, onSuccess } = useDialogBus("codeCreate");

  // codes for selection as parent
  const codes = CodeHooks.useGetEnabledCodes();
  const parentCodes = useMemo(() => codes.data?.filter((code) => !code.is_system) || [], [codes.data]);
  const codeTree = useWithLevel(parentCodes);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<CodeCreateValues>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset({
        parentCodeId: dialogData?.parentCodeId ?? -1,
        name: dialogData?.codeName || "",
        color: rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]),
        description: "",
      });
    }
  }, [dialogData, isOpen, reset]);

  // form actions
  const { mutate: createCodeMutation, isPending } = CodeHooks.useCreateCode();
  const handleCodeCreation = useCallback<SubmitHandler<CodeCreateValues>>(
    (createData) => {
      let pcid: number | undefined = undefined;
      if (typeof createData.parentCodeId === "string") {
        pcid = parseInt(createData.parentCodeId);
      } else {
        pcid = createData.parentCodeId;
      }
      createCodeMutation(
        {
          requestBody: {
            name: createData.name,
            description: createData.description,
            color: createData.color,
            project_id: projectId,
            parent_id: pcid === -1 ? null : pcid,
            is_system: false,
          },
        },
        {
          onSuccess: (data) => {
            // if we add a new code successfully, we want to show the code in the code explorer
            // this means, we have to expand the parent codes, so the new code is visible
            const codesToExpand = [];
            let parentCodeId = data.parent_id;
            while (parentCodeId) {
              const currentParentCodeId = parentCodeId;
              codesToExpand.push(parentCodeId);
              parentCodeId = parentCodes.find((code) => code.id === currentParentCodeId)?.parent_id;
            }
            onCodesCreated?.(codesToExpand);
            onSuccess(data, true);
            handleClose();
          },
        },
      );
    },
    [createCodeMutation, handleClose, onCodesCreated, onSuccess, parentCodes, projectId],
  );
  const handleError: SubmitErrorHandler<CodeCreateValues> = (data) => console.error(data);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleCodeCreation, handleError)}
    >
      <DATSDialogHeader
        title="Create a new code"
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
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          fullWidth
          type="submit"
          loading={isPending}
          loadingPosition="start"
        >
          Create Code
        </Button>
      </DialogActions>
    </Dialog>
  );
}
