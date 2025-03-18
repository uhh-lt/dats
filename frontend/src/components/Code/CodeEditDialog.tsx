import { ErrorMessage } from "@hookform/error-message";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack } from "@mui/material";
import { useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import CodeHooks from "../../api/CodeHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { CodeUpdate } from "../../api/openapi/models/CodeUpdate.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ColorUtils from "../../utils/ColorUtils.ts";
import { AnnoActions } from "../../views/annotation/annoSlice.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import FormColorPicker from "../FormInputs/FormColorPicker.tsx";
import FormMenu from "../FormInputs/FormMenu.tsx";
import FormText from "../FormInputs/FormText.tsx";
import FormTextMultiline from "../FormInputs/FormTextMultiline.tsx";
import CodeRenderer from "./CodeRenderer.tsx";
import { useCodesWithLevel } from "./useCodesWithLevel.ts";

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
  // redux
  const open = useAppSelector((state) => state.dialog.isCodeEditDialogOpen);
  const code = useAppSelector((state) => state.dialog.code);
  const dispatch = useAppDispatch();

  // mutations
  const updateCodeMutation = CodeHooks.useUpdateCode();
  const deleteCodeMutation = CodeHooks.useDeleteCode();

  // form handling
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeCodeEditDialog());
  };
  const handleCodeUpdate: SubmitHandler<CodeEditValues> = (data) => {
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
          },
        },
      );
    }
  };
  const handleError: SubmitErrorHandler<CodeEditValues> = (data) => console.error(data);
  const handleCodeDelete = () => {
    // disallow deleting of SYSTEM CODES
    if (code && !code.is_system) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the code "${code.name}"? This action cannot be undone!`,
        onAccept: () => {
          deleteCodeMutation.mutate(
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
  };

  return (
    <>
      {code && (
        <CodeEditDialogContent
          key={code.id} // rerender component if code id changes
          code={code}
          codes={codes}
          isOpen={open}
          handleClose={handleClose}
          handleCodeUpdate={handleCodeUpdate}
          isUpdateLoading={updateCodeMutation.isPending}
          handleCodeDelete={handleCodeDelete}
          isDeleteLoading={deleteCodeMutation.isPending}
          handleError={handleError}
        />
      )}
    </>
  );
}

interface CodeEditDialogContentProps {
  isOpen: boolean;
  handleClose: () => void;
  handleCodeUpdate: SubmitHandler<CodeEditValues>;
  isUpdateLoading: boolean;
  handleError: SubmitErrorHandler<CodeEditValues>;
  handleCodeDelete: () => void;
  isDeleteLoading: boolean;
  code: CodeRead;
  codes: CodeRead[];
}

function CodeEditDialogContent({
  code,
  codes,
  isOpen,
  handleClose,
  handleCodeUpdate,
  isUpdateLoading,
  handleCodeDelete,
  isDeleteLoading,
  handleError,
}: CodeEditDialogContentProps) {
  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<CodeEditValues>({
    defaultValues: {
      name: code.name,
      description: code.description,
      color: ColorUtils.rgbStringToHex(code.color) || code.color,
      parentCodeId: code.parent_id || -1,
    },
  });

  const parentCodes = useMemo(() => codes.filter((c) => !c.is_system && c.id !== code.id), [codes, code.id]);
  const codeTree = useCodesWithLevel(parentCodes);

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleCodeUpdate, handleError)}>
        <DialogTitle>Edit code {code?.name}</DialogTitle>
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
                disabled: code.is_system,
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
                disabled: code.is_system,
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
                disabled: code.is_system,
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
      </form>
    </Dialog>
  );
}

export default CodeEditDialog;
