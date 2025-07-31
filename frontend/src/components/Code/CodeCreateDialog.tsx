import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, MenuItem, Stack, rgbToHex } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import CodeHooks from "../../api/CodeHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { contrastiveColors } from "../../utils/colors.ts";
import { AnnoActions } from "../../views/annotation/annoSlice.ts";
import FormColorPicker from "../FormInputs/FormColorPicker.tsx";
import FormMenu from "../FormInputs/FormMenu.tsx";
import FormText from "../FormInputs/FormText.tsx";
import FormTextMultiline from "../FormInputs/FormTextMultiline.tsx";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import { useWithLevel } from "../TreeExplorer/useWithLevel.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import CodeRenderer from "./CodeRenderer.tsx";

export type CodeCreateSuccessHandler = ((code: CodeRead, isNewCode: boolean) => void) | undefined;

type CodeCreateValues = {
  parentCodeId: string | number;
  name: string;
  color: string;
  description: string;
};

function CodeCreateDialog() {
  const dispatch = useAppDispatch();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // codes for selection as parent
  const codes = CodeHooks.useGetEnabledCodes();
  const parentCodes = useMemo(() => codes.data?.filter((code) => !code.is_system) || [], [codes.data]);
  const codeTree = useWithLevel(parentCodes);

  // open/close dialog
  const isCodeCreateDialogOpen = useAppSelector((state) => state.dialog.isCodeCreateDialogOpen);
  const handleCloseCodeCreateDialog = useCallback(() => {
    dispatch(CRUDDialogActions.closeCodeCreateDialog());
  }, [dispatch]);

  // maximize feature
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<CodeCreateValues>();

  // reset form when dialog opens
  const codeName = useAppSelector((state) => state.dialog.codeName);
  const parentCodeId = useAppSelector((state) => state.dialog.parentCodeId);
  useEffect(() => {
    if (isCodeCreateDialogOpen) {
      reset({
        parentCodeId: parentCodeId || -1,
        name: codeName || "",
        color: rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]),
        description: "",
      });
    }
  }, [isCodeCreateDialogOpen, reset, codeName, parentCodeId]);

  // form actions
  const { mutate: createCodeMutation, isPending } = CodeHooks.useCreateCode();
  const onSuccessHandler = useAppSelector((state) => state.dialog.codeCreateSuccessHandler);
  const handleSubmitCodeCreateDialog = useCallback<SubmitHandler<CodeCreateValues>>(
    (data) => {
      let pcid: number | undefined = undefined;
      if (typeof data.parentCodeId === "string") {
        pcid = parseInt(data.parentCodeId);
      } else {
        pcid = data.parentCodeId;
      }
      createCodeMutation(
        {
          requestBody: {
            name: data.name,
            description: data.description,
            color: data.color,
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
            dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
            if (onSuccessHandler) onSuccessHandler(data, true);
            handleCloseCodeCreateDialog();
          },
        },
      );
    },
    [createCodeMutation, dispatch, handleCloseCodeCreateDialog, onSuccessHandler, parentCodes, projectId],
  );
  const handleErrorCodeCreateDialog: SubmitErrorHandler<CodeCreateValues> = (data) => console.error(data);

  return (
    <Dialog
      open={isCodeCreateDialogOpen}
      onClose={handleCloseCodeCreateDialog}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleSubmitCodeCreateDialog, handleErrorCodeCreateDialog)}
    >
      <DATSDialogHeader
        title="Create a new code"
        onClose={handleCloseCodeCreateDialog}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
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
            rules={{ required: "Description is required" }}
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
        <LoadingButton
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          fullWidth
          type="submit"
          loading={isPending}
          loadingPosition="start"
        >
          Create Code
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default CodeCreateDialog;
