import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, rgbToHex } from "@mui/material";
import { useCallback, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import TagHooks from "../../api/TagHooks.ts";
import { DocumentTagCreate } from "../../api/openapi/models/DocumentTagCreate.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { contrastiveColors } from "../../utils/colors.ts";
import { SearchActions } from "../../views/search/DocumentSearch/searchSlice.ts";
import FormColorPicker from "../FormInputs/FormColorPicker.tsx";
import FormMenu from "../FormInputs/FormMenu.tsx";
import FormText from "../FormInputs/FormText.tsx";
import FormTextMultiline from "../FormInputs/FormTextMultiline.tsx";
import { DocumentTagReadWithLevel } from "../TreeExplorer/TagReadWithLevel.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import TagRenderer from "./TagRenderer.tsx";
import { useTagsWithLevel } from "./useTagsWithLevel.ts";

/**
 * A dialog that allows to create a DocumentTag.
 * This component listens to the 'open-tag' event.
 * It opens automatically and fills the form with the provided name.
 * @constructor
 */
function TagCreateDialog() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global state (redux)
  const tags = TagHooks.useGetAllTags();

  // Tags with level
  const tagsWithLevel = useTagsWithLevel(tags.data || []);

  // global client state (redux)
  const isTagCreateDialogOpen = useAppSelector((state) => state.dialog.isTagCreateDialogOpen);
  const tagName = useAppSelector((state) => state.dialog.tagName);
  const parentTagId = useAppSelector((state) => state.dialog.parentTagId);
  const dispatch = useAppDispatch();

  // computed
  const tag: DocumentTagCreate | undefined = useMemo(() => {
    return tagName
      ? {
          name: tagName,
          parent_id: parentTagId,
          project_id: projectId,
        }
      : undefined;
  }, [tagName, parentTagId, projectId]);

  // actions
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeTagCreateDialog());
  }, [dispatch]);

  // form actions
  const { mutate: createTagMutation, isPending } = TagHooks.useCreateTag();
  const handleTagCreation: SubmitHandler<DocumentTagCreate> = useCallback(
    (data) => {
      createTagMutation(
        {
          requestBody: {
            name: data.name,
            description: data.description || "",
            color: data.color,
            parent_id: data.parent_id === -1 ? null : data.parent_id,
            project_id: projectId,
          },
        },
        {
          onSuccess: (data) => {
            // if we add a new tag successfully, we want to show the tag in the tag explorer
            // this means, we have to expand the parent tags, so the new tag is visible
            const tagsToExpand = [];
            let parentTagId = data.parent_id;
            while (parentTagId) {
              const currentParentTagId = parentTagId;

              tagsToExpand.push(parentTagId);
              parentTagId = tags.data?.find((tag) => tag.id === currentParentTagId)?.parent_id;
            }
            dispatch(SearchActions.expandTags(tagsToExpand.map((id) => id.toString())));

            handleClose();
          },
        },
      );
    },
    [createTagMutation, dispatch, handleClose, projectId, tags.data],
  );
  const handleError: SubmitErrorHandler<DocumentTagCreate> = useCallback((data) => console.error(data), []);

  return (
    <TagCreateDialogContent
      key={`${tagName}-${parentTagId}`} // re-render dialog when tag changes
      tag={tag}
      tagsWithLevel={tagsWithLevel}
      isOpen={isTagCreateDialogOpen}
      handleClose={handleClose}
      handleTagCreation={handleTagCreation}
      isCreateLoading={isPending}
      handleError={handleError}
    />
  );
}

interface TagCreateDialogContentProps {
  isOpen: boolean;
  handleClose: () => void;
  handleTagCreation: SubmitHandler<DocumentTagCreate>;
  isCreateLoading: boolean;
  handleError: SubmitErrorHandler<DocumentTagCreate>;
  tag?: DocumentTagCreate;
  tagsWithLevel: DocumentTagReadWithLevel[];
}

function TagCreateDialogContent({
  tag,
  tagsWithLevel,
  isOpen,
  handleClose,
  handleTagCreation,
  isCreateLoading,
  handleError,
}: TagCreateDialogContentProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<DocumentTagCreate>({
    defaultValues: {
      parent_id: tag?.parent_id || -1,
      name: tag?.name || "",
      color: tag?.color || rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]),
      description: tag?.description || "",
      project_id: projectId,
    },
  });

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagCreation, handleError)}>
        <DialogTitle>New tag</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <FormMenu
              name="parent_id"
              rules={{
                required: "Selection is required",
              }}
              control={control}
              textFieldProps={{
                label: "Parent Tag",
                variant: "filled",
                fullWidth: true,
                error: Boolean(errors.parent_id),
                helperText: <ErrorMessage errors={errors} name="parent_id" />,
                slotProps: {
                  inputLabel: { shrink: true },
                },
              }}
            >
              <MenuItem value={-1}>No parent</MenuItem>
              {tagsWithLevel.map((tagWithLevel) => (
                <MenuItem
                  key={tagWithLevel.data.id}
                  value={tagWithLevel.data.id}
                  style={{ paddingLeft: tagWithLevel.level * 10 + 6 }}
                >
                  <TagRenderer tag={tagWithLevel.data} />
                </MenuItem>
              ))}
            </FormMenu>
            <FormText
              name="name"
              rules={{
                required: "Tag name is required",
              }}
              control={control}
              textFieldProps={{
                label: "Tag name",
                variant: "standard",
                fullWidth: true,
                error: Boolean(errors.name),
                helperText: <ErrorMessage errors={errors} name="name" />,
                slotProps: {
                  inputLabel: { shrink: true },
                },
                autoFocus: true,
              }}
            />
            <FormColorPicker
              name="color"
              rules={{
                required: "Color is required",
              }}
              control={control}
              textFieldProps={{
                label: "Color",
                variant: "standard",
                fullWidth: true,
                error: Boolean(errors.color),
                helperText: <ErrorMessage errors={errors} name="color" />,
                slotProps: {
                  inputLabel: { shrink: true },
                },
              }}
            />
            <FormTextMultiline
              name="description"
              control={control}
              rules={{
                required: "Description is required",
              }}
              textFieldProps={{
                label: "Description",
                variant: "standard",
                fullWidth: true,
                error: Boolean(errors.description),
                helperText: <ErrorMessage errors={errors} name="description" />,
                slotProps: {
                  inputLabel: { shrink: true },
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <LoadingButton
            variant="contained"
            type="submit"
            startIcon={<SaveIcon />}
            loading={isCreateLoading}
            loadingPosition="start"
          >
            Create
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TagCreateDialog;
