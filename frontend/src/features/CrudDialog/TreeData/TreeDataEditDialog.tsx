import { Box, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import SnackbarAPI from "../../Snackbar/SnackbarAPI";
import { FieldErrors, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import eventBus from "../../../EventBus";
import TagHooks from "../../../api/TagHooks";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { HexColorPicker } from "react-colorful";
import ColorUtils from "../../../utils/ColorUtils";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmationAPI from "../../ConfirmationDialog/ConfirmationAPI";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead";
import TagRenderer from "../../../components/DataGrid/TagRenderer";
import { CodeRead, CodeUpdate, DocumentTagUpdate } from "../../../api/openapi";
import CodeHooks from "../../../api/CodeHooks";
import { KEYWORD_CODES, KEYWORD_TAGS, SYSTEM_USER_ID } from "../../../utils/GlobalConstants";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { AnnoActions } from "../../../views/annotation/annoSlice";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";

type TreeDataEditDialogPayload = {
  dataId?: number;
  data?: DocumentTagRead | CodeRead;
};
export const openTreeDataEditDialog = (payload: TreeDataEditDialogPayload) => {
  eventBus.dispatch("open-edit-treedata", payload);
};

interface TreeDataEditDialogProps {
  treeData: (DocumentTagRead | CodeRead)[];
  dataType: string;
}
type CodeEditValues = {
  name: string | undefined;
  color: string | undefined;
  description: string | undefined;
  parentCodeId: number | undefined;
};
/**
 * A dialog that allows to update a DocumentTag.
 * This component listens to the 'open-edit-tag' event.
 * It opens automatically and loads the corresponding DocumentTag.
 * @constructor
 */
function TreeDataEditDialog({ treeData, dataType }: TreeDataEditDialogProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<DocumentTagUpdate | CodeEditValues>();

  // local state
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState("#000000");

  const [tag, setTag] = useState({ id: -1, title: "", parent_tag_id: -1, description: "", color: "" });
  const [code, setCode] = useState({ id: -1, name: "", parent_code_id: -1, description: "", color: "" });
  const dataLeaf = dataType === KEYWORD_TAGS ? tag : code;

  // redux
  const dispatch = useAppDispatch();
  const codes = treeData as CodeRead[];

  // computed
  const parentCodes = useMemo(() => codes.filter((code) => code.user_id !== SYSTEM_USER_ID), [codes]);

  const resetForm = useCallback(
    (dataLeaf: CodeRead | DocumentTagRead | undefined) => {
      if (dataLeaf) {
        const c = ColorUtils.rgbStringToHex(dataLeaf.color) || dataLeaf.color;
        reset(
          dataType === KEYWORD_TAGS
            ? {
                title: (dataLeaf as DocumentTagRead).title,
                description: dataLeaf.description,
                color: dataLeaf.color,
                parent_tag_id: (dataLeaf as DocumentTagRead).parent_tag_id || -1,
              }
            : {
                name: (dataLeaf as CodeRead).name,
                description: dataLeaf.description,
                color: c,
                parentCodeId:
                  dataType === KEYWORD_TAGS
                    ? ((dataLeaf as DocumentTagRead).parent_tag_id as number | undefined) || -1
                    : (dataLeaf as CodeRead).parent_code_id || -1,
              },
        );
        setColor(c);
      }
    },
    [reset, dataType],
  );

  // listen to event
  // create a (memoized) function that stays the same across re-renders
  const onOpenEditData = useCallback(
    (event: CustomEventInit) => {
      setOpen(true);
      dataType === KEYWORD_TAGS ? setTag(event.detail.data) : setCode(event.detail.data);
      resetForm(event.detail.data);
    },
    [resetForm, dataType],
  );

  useEffect(() => {
    eventBus.on("open-edit-treedata", onOpenEditData);
    return () => {
      eventBus.remove("open-edit-treedata", onOpenEditData);
    };
  }, [onOpenEditData]);

  // mutations
  const updateTagMutation = TagHooks.useUpdateTag();
  const deleteTagMutation = TagHooks.useDeleteTag();

  const updateCodeMutation = CodeHooks.useUpdateCode();
  const deleteCodeMutation = CodeHooks.useDeleteCode();

  // form handling
  const handleTreeDataUpdate: SubmitHandler<DocumentTagUpdate | CodeEditValues> = (data) => {
    if (dataLeaf) {
      if (dataType === KEYWORD_TAGS) {
        updateTagMutation.mutate(
          {
            requestBody: {
              title: (data as DocumentTagRead).title,
              description: data.description,
              color: data.color,
              parent_tag_id: (data as DocumentTagRead).parent_tag_id,
            },
            tagId: dataLeaf.id,
          },
          {
            onSuccess: (data) => {
              setOpen(false); // close dialog
              SnackbarAPI.openSnackbar({
                text: `Updated tag with id ${data.id}`,
                severity: "success",
              });
            },
          },
        );
      } else if (dataType === KEYWORD_CODES) {
        // only allow updating of color for SYSTEM CODES
        const code = dataLeaf as CodeRead;
        let requestBody: CodeUpdate = {
          color: data.color,
        };

        if (code.user_id !== SYSTEM_USER_ID) {
          requestBody = {
            ...requestBody,
            name: (data as CodeEditValues).name,
            description: data.description,
            parent_code_id: (data as CodeEditValues).parentCodeId,
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
              if (data.parent_code_id !== code.parent_code_id) {
                // if we edited a code successfully, we want to show the code in the code explorer
                // this means, we might have to expand the parent codes, so the new code is visible
                const codesToExpand = [];
                let parentCodeId = data.parent_code_id;
                while (parentCodeId) {
                  let currentParentCodeId = parentCodeId;

                  codesToExpand.push(parentCodeId);
                  parentCodeId = codes.find((code) => code.id === currentParentCodeId)?.parent_code_id;
                }
                dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
              }

              setOpen(false); // close dialog
              SnackbarAPI.openSnackbar({
                text: `Updated code ${data.name}`,
                severity: "success",
              });
            },
          },
        );
      }
    } else {
      throw new Error("Invalid invocation of method handleTagUpdate! Only call when dataLeaf.data is available!");
    }
  };
  const handleError: SubmitErrorHandler<DocumentTagUpdate | CodeEditValues> = (data) => console.error(data);
  const handleDelete = () => {
    if (dataLeaf) {
      if (dataType === KEYWORD_TAGS) {
        ConfirmationAPI.openConfirmationDialog({
          text: `Do you really want to delete the tag "${
            (dataLeaf as DocumentTagRead).title
          }"? This action cannot be undone!`,
          onAccept: () => {
            deleteTagMutation.mutate(
              { tagId: dataLeaf.id },
              {
                onSuccess: (data) => {
                  setOpen(false); // close dialog
                  SnackbarAPI.openSnackbar({
                    text: `Deleted tag with id ${dataLeaf.id}`,
                    severity: "success",
                  });
                },
              },
            );
          },
        });
      } else if (dataType === KEYWORD_CODES) {
        // disallow deleting of SYSTEM CODES
        const code = dataLeaf as CodeRead;
        if (code && code.user_id !== SYSTEM_USER_ID) {
          ConfirmationAPI.openConfirmationDialog({
            text: `Do you really want to delete the code "${code.name}"? This action cannot be undone!`,
            onAccept: () => {
              deleteCodeMutation.mutate(
                { codeId: code.id },
                {
                  onSuccess: (data: CodeRead) => {
                    setOpen(false); // close dialog
                    SnackbarAPI.openSnackbar({
                      text: `Deleted code ${data.name}`,
                      severity: "success",
                    });
                  },
                },
              );
            },
          });
        }
      }
    } else {
      throw new Error("Invalid invocation of method handleDelete! Only call when tag.data is available!");
    }
  };

  let menuItems: React.ReactNode[];
  if (dataType === KEYWORD_CODES) {
    if (!dataLeaf || (dataLeaf && (dataLeaf as CodeRead).user_id === SYSTEM_USER_ID)) {
      menuItems = treeData
        .filter((t) => t.id !== dataLeaf?.id)
        .map((t) => (
          <MenuItem key={t.id} value={t.id}>
            <CodeRenderer code={t as CodeRead} />
          </MenuItem>
        ));
    } else {
      menuItems = parentCodes
        .filter((t) => t.id !== dataLeaf?.id)
        .map((t) => (
          <MenuItem key={t.id} value={t.id}>
            <CodeRenderer code={t as CodeRead} />
          </MenuItem>
        ));
    }
  } else {
    menuItems = treeData
      .filter((t) => t.id !== dataLeaf?.id)
      .map((t) => (
        <MenuItem key={t.id} value={t.id}>
          <TagRenderer tag={t as DocumentTagRead} />
        </MenuItem>
      ));
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTreeDataUpdate, handleError)}>
        {/* {dataLeaf.isLoading && <DialogTitle>Loading {dataType === KEYWORD_TAGS ? "tag" : "code"}...</DialogTitle>}
        {dataLeaf.isError && <DialogTitle>Error: {dataLeaf.error.message}</DialogTitle>}
        {dataLeaf.isSuccess && ( */}
        <DialogTitle>
          Edit {dataType === KEYWORD_TAGS ? "tag" : "code"}{" "}
          {KEYWORD_TAGS ? (dataLeaf as DocumentTagRead).title : (dataLeaf as CodeRead).name}
        </DialogTitle>
        {/* )} */}
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              key={dataLeaf?.id}
              fullWidth
              select
              label="Parent Code"
              variant="filled"
              defaultValue={
                dataType === KEYWORD_TAGS
                  ? (dataLeaf as DocumentTagRead)?.parent_tag_id || -1
                  : (dataLeaf as CodeRead)?.parent_code_id || -1
              }
              {...register(dataType === KEYWORD_TAGS ? "parent_tag_id" : "parentCodeId")}
              error={Boolean(
                dataType === KEYWORD_TAGS
                  ? (errors as DocumentTagUpdate)?.parent_tag_id
                  : (errors as CodeEditValues)?.parentCodeId,
              )}
              helperText={<ErrorMessage errors={errors} name="parent_id" />}
              InputLabelProps={{ shrink: true }}
              disabled={
                dataType === KEYWORD_TAGS
                  ? !dataLeaf
                  : !dataLeaf || (dataLeaf && (dataLeaf as CodeRead).user_id === SYSTEM_USER_ID)
              }
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
              {...register(dataType === KEYWORD_TAGS ? "title" : "name", { required: "Name is required" })}
              error={Boolean(
                dataType === KEYWORD_TAGS ? (errors as DocumentTagUpdate)?.title : (errors as CodeEditValues)?.name,
              )}
              helperText={
                <>
                  {dataType === KEYWORD_TAGS ? (
                    (errors as FieldErrors<DocumentTagUpdate>)?.title ? (
                      (errors as FieldErrors<DocumentTagUpdate>)?.title?.message
                    ) : (
                      ""
                    )
                  ) : (
                    <ErrorMessage errors={errors} name="name" />
                  )}
                </>
              }
              disabled={
                dataType === KEYWORD_TAGS
                  ? !dataLeaf
                  : !dataLeaf || (dataLeaf && (dataLeaf as CodeRead).user_id === SYSTEM_USER_ID)
              }
              InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row">
              <TextField
                label="Color"
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
              {...register("description", { required: "Description is required" })}
              error={Boolean(errors.description)}
              helperText={<ErrorMessage errors={errors} name="description" />}
              disabled={
                dataType === KEYWORD_TAGS
                  ? !dataLeaf
                  : !dataLeaf || (dataLeaf && (dataLeaf as CodeRead).user_id === SYSTEM_USER_ID)
              }
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <LoadingButton
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={
              dataType === KEYWORD_TAGS
                ? !dataLeaf
                : !dataLeaf || (dataLeaf && (dataLeaf as CodeRead).user_id === SYSTEM_USER_ID)
            }
            loading={deleteTagMutation.isLoading}
            loadingPosition="start"
            onClick={handleDelete}
            sx={{ flexShrink: 0 }}
          >
            Delete {dataType === KEYWORD_TAGS ? "tag" : "code"}
          </LoadingButton>
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            fullWidth
            type="submit"
            disabled={dataType === KEYWORD_TAGS ? !dataLeaf : !dataLeaf}
            loading={updateTagMutation.isLoading}
            loadingPosition="start"
          >
            Update {dataType === KEYWORD_TAGS ? "tag" : "code"}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TreeDataEditDialog;
