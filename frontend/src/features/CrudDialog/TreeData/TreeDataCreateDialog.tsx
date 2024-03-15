import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import eventBus from "../../../EventBus";
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
import { FieldErrors, SubmitHandler, useForm } from "react-hook-form";
import SnackbarAPI from "../../Snackbar/SnackbarAPI";
import { useParams } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import TagHooks from "../../../api/TagHooks";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import SaveIcon from "@mui/icons-material/Save";
import { CodeCreate, CodeRead, DocumentTagCreate } from "../../../api/openapi";
import { contrastiveColors } from "../../../views/annotation/colors";
import ProjectHooks from "../../../api/ProjectHooks";
import TagRenderer from "../../../components/DataGrid/TagRenderer";
import { KEYWORD_TAGS, SYSTEM_USER_ID } from "../../../utils/GlobalConstants";
import CodeHooks from "../../../api/CodeHooks";
import { useAuth } from "../../../auth/AuthProvider";
import { AnnoActions } from "../../../views/annotation/annoSlice";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";

type CodeCreateSuccessHandler = ((code: CodeRead, isNewCode: boolean) => void) | undefined;

type TreeDataCreateDialogPayload = {
  treeDataName?: string;
  parentId?: number;
  onSuccess?: CodeCreateSuccessHandler;
};

type CodeCreateValues = {
  parentCodeId: string | number;
  name: string;
  color: string;
  description: string;
};

interface TreeDataCreateDialogProps {
  dataType: string;
}

export const openTreeDataCreateDialog = (payload: TreeDataCreateDialogPayload) => {
  eventBus.dispatch("open-create-treedata", payload);
};

/**
 * A dialog that allows to create a TreeData element - Code or DocumenTag.
 * This component listens to the 'open-tag' event.
 * It opens automatically and fills the form with the provided name.
 * @constructor
 */
function TreeDataCreateDialog({ dataType }: TreeDataCreateDialogProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const { user } = useAuth();

  // global state (redux)
  const tags = ProjectHooks.useGetAllTags(projectId);
  const codes = ProjectHooks.useGetAllCodes(projectId);

  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    getValues,
  } = useForm<DocumentTagCreate | CodeCreateValues>({
    defaultValues: {
      parent_tag_id: -1,
      title: "",
      color: "#000000",
      description: "",
      project_id: projectId,
    },
  });

  // state
  const [isTreeDataCreateDialogOpen, setIsTreeDataCreateDialogOpen] = useState(false);
  const [color, setColor] = useState("#000000");

  // mutations
  const createTagMutation = TagHooks.useCreateTag();

  const createCodeMutation = CodeHooks.useCreateCode();
  // computed
  const parentCodes = useMemo(() => codes.data?.filter((code) => code.user_id !== SYSTEM_USER_ID) || [], [codes.data]);
  // local state
  const onSuccessHandler = useRef<CodeCreateSuccessHandler>(undefined);

  // redux
  const dispatch = useAppDispatch();

  // create a (memoized) function that stays the same across re-renders
  const onOpenCreateTreeData = useCallback(
    (data: CustomEventInit<TreeDataCreateDialogPayload>) => {
      console.log("Tree event launch", data);
      if (!data.detail) return;

      // reset
      const randomHexColor = rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]);
      const isParentCodeIdInParentCodes = parentCodes.find((c) => c.id === data.detail?.parentId);
      reset(
        dataType === KEYWORD_TAGS
          ? {
              title: data.detail.treeDataName ? data.detail.treeDataName : "",
              color: randomHexColor,
              parent_tag_id: data.detail.parentId ? data.detail.parentId : -1,
            }
          : {
              title: data.detail.treeDataName ? data.detail.treeDataName : "",
              color: randomHexColor,
              parentCodeId: isParentCodeIdInParentCodes ? data.detail.parentId || -1 : -1,
            },
      );

      onSuccessHandler.current = data.detail.onSuccess;

      setColor(randomHexColor);
      setIsTreeDataCreateDialogOpen(true);
    },
    [reset, dataType, parentCodes],
  );

  useEffect(() => {
    eventBus.on("open-create-treedata", onOpenCreateTreeData);
    return () => {
      eventBus.remove("open-create-treedata", onOpenCreateTreeData);
    };
  }, [onOpenCreateTreeData]);

  // actions
  const handleClose = () => {
    setIsTreeDataCreateDialogOpen(false);
  };

  // form actions
  const handleTreeDataCreation: SubmitHandler<DocumentTagCreate | CodeCreateValues> = (data) => {
    dataType === KEYWORD_TAGS ? (
      createTagMutation.mutate(
        {
          requestBody: {
            title: (data as DocumentTagCreate).title,
            description: data.description || "",
            color: data.color,
            parent_tag_id: (data as DocumentTagCreate).parent_tag_id,
            project_id: projectId,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Added tag ${data.title}`,
              severity: "success",
            });

            setIsTreeDataCreateDialogOpen(false); // close dialog
          },
        },
      )
    ) : user ? (
      createCodeMutation.mutate(
        {
          requestBody: {
            name: (data as CodeCreateValues).name,
            description: (data as CodeCreateValues).description,
            color: (data as CodeCreateValues).color,
            project_id: projectId,
            user_id: user.id,
            parent_code_id: (data as CodeCreateValues).parentCodeId as number,
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
            setIsTreeDataCreateDialogOpen(false); // close dialog
            if (onSuccessHandler.current) onSuccessHandler.current(data, true);
          },
        },
      )
    ) : (
      <></>
    );
  };

  const handleError = (data: any) => console.error(data);

  return (
    <Dialog open={isTreeDataCreateDialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTreeDataCreation, handleError)}>
        <DialogTitle>New tag</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              fullWidth
              select
              label={"Parent " + (dataType === KEYWORD_TAGS ? "Tag" : "Code")}
              variant="filled"
              defaultValue={getValues(dataType === KEYWORD_TAGS ? "parent_tag_id" : "parentCodeId")}
              {...register(dataType === KEYWORD_TAGS ? "parent_tag_id" : "parentCodeId")}
              error={
                dataType === KEYWORD_TAGS
                  ? Boolean((errors as FieldErrors<DocumentTagCreate>).parent_tag_id)
                  : Boolean((errors as FieldErrors<CodeCreateValues>).parentCodeId)
              }
              helperText={<ErrorMessage errors={errors} name={KEYWORD_TAGS ? "parent_tag_id" : "parentCodeId"} />}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value={-1}>No parent</MenuItem>
              {dataType === KEYWORD_TAGS
                ? tags.data?.map((tag) => (
                    <MenuItem key={tag.id} value={tag.id}>
                      <TagRenderer tag={tag} />
                    </MenuItem>
                  ))
                : parentCodes &&
                  parentCodes.map((code) => (
                    <MenuItem key={code.id} value={code.id}>
                      <CodeRenderer code={code} />
                    </MenuItem>
                  ))}
            </TextField>
            <TextField
              label={"Please enter a name for the new " + (dataType === KEYWORD_TAGS ? "Tag" : "Code")}
              autoFocus
              fullWidth
              variant="standard"
              {...register(dataType === KEYWORD_TAGS ? "title" : "name", {
                required: (dataType === KEYWORD_TAGS ? "Tag" : "Code") + "Name is required",
              })}
              error={Boolean(
                dataType === KEYWORD_TAGS
                  ? (errors as FieldErrors<DocumentTagCreate>)?.title
                  : (errors as FieldErrors<CodeCreate>)?.name,
              )}
              helperText={<ErrorMessage errors={errors} name="color" />}
              InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row">
              <TextField
                label={"Choose a color for the new " + (dataType === KEYWORD_TAGS ? "Tag" : "Code")}
                fullWidth
                variant="standard"
                {...register("color", { required: "Color is required" })}
                onChange={(e) => {
                  setColor(e.target.value);
                }}
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
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <LoadingButton
            variant="contained"
            type="submit"
            startIcon={<SaveIcon />}
            loading={createTagMutation.isLoading}
            loadingPosition="start"
          >
            Create
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TreeDataCreateDialog;
