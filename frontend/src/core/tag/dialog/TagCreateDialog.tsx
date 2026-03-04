import { TagHooks } from "@api/hooks/TagHooks";
import { TagCreate } from "@api/models/TagCreate";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormColorPicker, FormMenu, FormText, FormTextMultiline } from "@components/form-inputs";
import { useWithLevel } from "@components/tree-explorer";
import { SearchActions } from "@features/search";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, MenuItem, Stack, rgbToHex } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { UIDialogActions } from "@store/global/dialogSlice";
import { contrastiveColors } from "@utils/colors/colors";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { TagRenderer } from "../TagRenderer";

export function TagCreateDialog({ projectId }: { projectId: number }) {
  const dispatch = useAppDispatch();

  // tags for selection as parent
  const tags = TagHooks.useGetAllTags();
  const tagsWithLevel = useWithLevel(tags.data || []);

  // open/close dialog
  const isTagCreateDialogOpen = useAppSelector((state) => state.dialog.isTagCreateDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(UIDialogActions.closeTagCreateDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<TagCreate>();

  // reset form when dialog opens
  const tagName = useAppSelector((state) => state.dialog.tagName);
  useEffect(() => {
    if (isTagCreateDialogOpen) {
      reset({
        parent_id: -1,
        name: tagName || "",
        color: rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]),
        description: "",
        project_id: projectId,
      });
    }
  }, [isTagCreateDialogOpen, reset, tagName, projectId]);

  // form actions
  const { mutate: createTagMutation, isPending } = TagHooks.useCreateTag();
  const handleTagCreation = useCallback<SubmitHandler<TagCreate>>(
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
  const handleError: SubmitErrorHandler<TagCreate> = (data) => console.error(data);

  return (
    <Dialog
      open={isTagCreateDialogOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleTagCreation, handleError)}
    >
      <DATSDialogHeader
        title="Create a new tag"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
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
        <LoadingButton
          variant="contained"
          color="success"
          type="submit"
          startIcon={<SaveIcon />}
          fullWidth
          loading={isPending}
          loadingPosition="start"
        >
          Create Tag
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
