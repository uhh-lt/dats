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
import { useEffect, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import CodeHooks from "../../api/CodeHooks.ts";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { useOpenSnackbar } from "../../features/SnackbarDialog/useOpenSnackbar.ts";
import { CRUDDialogActions } from "../../features/dialogSlice.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { SYSTEM_USER_ID } from "../../utils/GlobalConstants.ts";
import { contrastiveColors } from "../../utils/colors.ts";
import { AnnoActions } from "../../views/annotation/annoSlice.ts";
import CodeRenderer from "./CodeRenderer.tsx";

export type CodeCreateSuccessHandler = ((code: CodeRead, isNewCode: boolean) => void) | undefined;

type CodeCreateValues = {
  parentCodeId: string | number;
  name: string;
  color: string;
  description: string;
};

function CodeCreateDialog() {
  // global state
  const { projectId } = useParams() as { projectId: string };
  const { user } = useAuth();

  // global server state (react query)
  const codes = ProjectHooks.useGetAllCodes(parseInt(projectId));

  // computed
  const parentCodes = useMemo(() => codes.data?.filter((code) => code.user_id !== SYSTEM_USER_ID) || [], [codes.data]);

  // local state
  const [color, setColor] = useState("#000000");

  // global client state (redux)
  const onSuccessHandler = useAppSelector((state) => state.dialog.codeCreateSuccessHandler);
  const isCodeCreateDialogOpen = useAppSelector((state) => state.dialog.isCodeCreateDialogOpen);
  const codeName = useAppSelector((state) => state.dialog.codeName);
  const parentCodeId = useAppSelector((state) => state.dialog.parentCodeId);
  const dispatch = useAppDispatch();

  // react form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    getValues,
  } = useForm<CodeCreateValues>({
    defaultValues: {
      parentCodeId: -1,
      name: "",
      color: "#000000",
      description: "",
    },
  });

  // mutations
  const createCodeMutation = CodeHooks.useCreateCode();

  // initialize form when code changes
  useEffect(() => {
    // reset
    const randomHexColor = rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]);
    const isParentCodeIdInParentCodes = parentCodes.find((c) => c.id === parentCodeId);
    reset({
      name: codeName || "",
      color: randomHexColor,
      parentCodeId: isParentCodeIdInParentCodes ? parentCodeId || -1 : -1,
    });
    setColor(randomHexColor);
  }, [codeName, parentCodeId, parentCodes, reset]);

  // ui event handlers
  const handleCloseCodeCreateDialog = () => {
    dispatch(CRUDDialogActions.closeCodeCreateDialog());
  };

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // react form handlers
  const handleSubmitCodeCreateDialog: SubmitHandler<CodeCreateValues> = (data) => {
    if (user) {
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
            user_id: user.id,
            parent_id: pcid,
          },
        },
        {
          onSuccess: (data) => {
            openSnackbar({
              text: `Added new Code ${data.name}!`,
              severity: "success",
            });

            // if we add a new code successfully, we want to show the code in the code explorer
            // this means, we have to expand the parent codes, so the new code is visible
            const codesToExpand = [];
            let parentCodeId = data.parent_id;
            while (parentCodeId) {
              const currentParentCodeId = parentCodeId;

              codesToExpand.push(parentCodeId);
              parentCodeId = codes.data?.find((code) => code.id === currentParentCodeId)?.parent_id;
            }
            dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
            if (onSuccessHandler) onSuccessHandler(data, true);
            handleCloseCodeCreateDialog();
          },
        },
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
              defaultValue={getValues("parentCodeId")}
              {...register("parentCodeId")}
              error={Boolean(errors.parentCodeId)}
              helperText={<ErrorMessage errors={errors} name="parentCodeId" />}
            >
              <MenuItem value={-1}>No parent</MenuItem>
              {parentCodes &&
                parentCodes.map((code) => (
                  <MenuItem key={code.id} value={code.id}>
                    <CodeRenderer code={code} />
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
            loading={createCodeMutation.isPending}
            loadingPosition="start"
          >
            Create Code
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default CodeCreateDialog;
