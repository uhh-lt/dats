import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  rgbToHex,
} from "@mui/material";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import CodeHooks from "../../../api/CodeHooks";
import ProjectHooks from "../../../api/ProjectHooks";
import { CodeRead } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { SYSTEM_USER_ID } from "../../../utils/GlobalConstants";
import { AnnoActions } from "../annoSlice";
import { contrastiveColors } from "../colors";

type CodeCreateValues = {
  parentCodeId: string | number;
  name: string;
  color: string;
  description: string;
};

interface CodeCreationDialogProps {
  onCreateSuccess?: (code: CodeRead, isNewCode: boolean) => void;
}

export interface CodeCreationDialogHandle {
  open: (name?: string) => void;
}

const SpanCreationDialog = forwardRef<CodeCreationDialogHandle, CodeCreationDialogProps>(({ onCreateSuccess }, ref) => {
  // global state
  const { projectId } = useParams() as { projectId: string };
  const { user } = useAuth();

  // global state (redux)
  const parentCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const codes = ProjectHooks.useGetAllCodes(parseInt(projectId));

  // computed
  const parentCodes = useMemo(() => codes.data?.filter((code) => code.user_id !== SYSTEM_USER_ID), [codes.data]);

  // local state
  const [isCodeCreateDialogOpen, setIsCodeCreateDialogOpen] = useState(false);
  const [color, setColor] = useState("#000000");

  // react form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CodeCreateValues>();

  // redux
  const dispatch = useAppDispatch();

  // mutations
  const createCodeMutation = CodeHooks.useCreateCode();

  // exposed methods (via forward ref)
  useImperativeHandle(ref, () => ({
    open: openCodeCreateDialog,
  }));

  // methods
  const openCodeCreateDialog = (name?: string) => {
    // reset
    const randomHexColor = rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]);
    reset();
    setValue("name", name ? name : "");
    setValue("color", randomHexColor);
    setColor(randomHexColor);
    setIsCodeCreateDialogOpen(true);
  };

  const closeCodeCreateDialog = () => {
    setIsCodeCreateDialogOpen(false);
  };

  // ui event handlers
  const handleCloseCodeCreateDialog = () => {
    closeCodeCreateDialog();
  };

  // react form handlers
  const handleSubmitCodeCreateDialog: SubmitHandler<CodeCreateValues> = (data) => {
    if (user.data) {
      let pcid: number | undefined = undefined;
      if (typeof data.parentCodeId === "string") {
        pcid = parseInt(data.parentCodeId);
      } else {
        pcid = data.parentCodeId;
      }
      createCodeMutation.mutate(
        {
          requestBody: {
            name: data.name,
            description: data.description,
            color: data.color,
            project_id: parseInt(projectId),
            user_id: user.data.id,
            parent_code_id: pcid === -1 ? undefined : pcid,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Added new Code ${data.name}!`,
              severity: "success",
            });

            // if we add a new code successfully, we want to show the code in the code explorer
            // this means, we have to expand the parent codes, so the new code is visible
            const codesToExpand = [];
            let parentCodeId = data.parent_code_id;
            while (parentCodeId) {
              codesToExpand.push(parentCodeId);
              parentCodeId = codes.data?.find((code) => code.id === parentCodeId)?.parent_code_id;
            }
            dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
            closeCodeCreateDialog();
            if (onCreateSuccess) onCreateSuccess(data, true);
          },
        }
      );
    }
  };

  const handleErrorCodeCreateDialog: SubmitErrorHandler<CodeCreateValues> = (data) => console.error(data);

  // rendering
  return (
    <Dialog open={isCodeCreateDialogOpen} onClose={handleCloseCodeCreateDialog} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleSubmitCodeCreateDialog, handleErrorCodeCreateDialog)}>
        <DialogTitle>Create a new code</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              fullWidth
              select
              label="Parent Code"
              variant="filled"
              defaultValue={
                parentCodes && parentCodes.findIndex((code) => code.id === parentCodeId) !== -1 ? parentCodeId : -1
              }
              {...register("parentCodeId")}
              error={Boolean(errors.parentCodeId)}
              helperText={<ErrorMessage errors={errors} name="parentCodeId" />}
            >
              <MenuItem value={-1}>No parent</MenuItem>
              {parentCodes &&
                parentCodes.map((code) => (
                  <MenuItem key={code.id} value={code.id}>
                    {code.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label="Name"
              fullWidth
              variant="standard"
              {...register("name", { required: "Name is required" })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
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
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleCloseCodeCreateDialog}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            fullWidth
            type="submit"
            loading={createCodeMutation.isLoading}
            loadingPosition="start"
          >
            Create Code
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
});

export default SpanCreationDialog;
