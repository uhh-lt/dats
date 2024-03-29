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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import eventBus from "../../../EventBus";
import CodeHooks from "../../../api/CodeHooks";
import ProjectHooks from "../../../api/ProjectHooks";
import { CodeRead } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { SYSTEM_USER_ID } from "../../../utils/GlobalConstants";
import { AnnoActions } from "../../../views/annotation/annoSlice";
import { contrastiveColors } from "../../../views/annotation/colors";
import SnackbarAPI from "../../Snackbar/SnackbarAPI";

type CodeCreateSuccessHandler = ((code: CodeRead, isNewCode: boolean) => void) | undefined;

type CodeCreateDialogPayload = {
  name?: string;
  parentCodeId?: number;
  onSuccess?: CodeCreateSuccessHandler;
};

export const openCodeCreateDialog = (
  payload: CodeCreateDialogPayload = { name: undefined, parentCodeId: undefined },
) => {
  eventBus.dispatch("open-create-code", payload);
};

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

  // global state (redux)
  const codes = ProjectHooks.useGetAllCodes(parseInt(projectId));

  // computed
  const parentCodes = useMemo(() => codes.data?.filter((code) => code.user_id !== SYSTEM_USER_ID) || [], [codes.data]);

  // local state
  const onSuccessHandler = useRef<CodeCreateSuccessHandler>(undefined);
  const [isCodeCreateDialogOpen, setIsCodeCreateDialogOpen] = useState(false);
  const [color, setColor] = useState("#000000");

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

  // redux
  const dispatch = useAppDispatch();

  // mutations
  const createCodeMutation = CodeHooks.useCreateCode();

  // listen to event
  // create a (memoized) function that stays the same across re-renders
  const onOpenCreateCode = useCallback(
    (event: CustomEventInit<CodeCreateDialogPayload>) => {
      if (!event.detail) return;

      // reset
      const randomHexColor = rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]);
      const isParentCodeIdInParentCodes = parentCodes.find((c) => c.id === event.detail?.parentCodeId);
      reset({
        name: event.detail.name ? event.detail.name : "",
        color: randomHexColor,
        parentCodeId: isParentCodeIdInParentCodes ? event.detail.parentCodeId || -1 : -1,
      });
      onSuccessHandler.current = event.detail.onSuccess;
      setColor(randomHexColor);
      setIsCodeCreateDialogOpen(true);
    },
    [parentCodes, reset],
  );

  useEffect(() => {
    eventBus.on("open-create-code", onOpenCreateCode);
    return () => {
      eventBus.remove("open-create-code", onOpenCreateCode);
    };
  }, [onOpenCreateCode]);

  // methods
  const closeCodeCreateDialog = () => {
    setIsCodeCreateDialogOpen(false);
  };

  // ui event handlers
  const handleCloseCodeCreateDialog = () => {
    closeCodeCreateDialog();
  };

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
            parent_code_id: pcid,
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
              let currentParentCodeId = parentCodeId;

              codesToExpand.push(parentCodeId);
              parentCodeId = codes.data?.find((code) => code.id === currentParentCodeId)?.parent_code_id;
            }
            dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
            closeCodeCreateDialog();
            if (onSuccessHandler.current) onSuccessHandler.current(data, true);
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
            loading={createCodeMutation.isLoading}
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
