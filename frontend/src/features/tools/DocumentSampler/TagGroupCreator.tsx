import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardProps,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  UseAutocompleteProps,
} from "@mui/material";
import { memo, useCallback } from "react";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { EditableTypography } from "../../../components/EditableTypography.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { DocumentSamplerActions } from "./documentSamplerSlice.ts";

interface TagGroupCreatorProps {
  tags: TagRead[];
  aggregationGroups: Record<string, TagRead[]>;
  cardProps?: CardProps;
}

export const TagGroupCreator = memo(({ tags, aggregationGroups, cardProps = {} }: TagGroupCreatorProps) => {
  const dispatch = useAppDispatch();

  const selectedTagIds = Object.values(aggregationGroups)
    .flat()
    .map((tag) => tag.id);
  const groupsAreEmpty = Object.keys(aggregationGroups).length === 0;

  // Memoize callbacks
  const handleAddGroup = useCallback(() => {
    dispatch(DocumentSamplerActions.onAddNewGroup());
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch(DocumentSamplerActions.onReset());
  }, [dispatch]);

  const handleGroupNameChange = useCallback(
    (oldName: string) => (newName: string) => {
      dispatch(DocumentSamplerActions.onGroupNameChange({ oldName, newName }));
    },
    [dispatch],
  );

  const handleUpdateGroupTags = useCallback(
    (groupName: string): UseAutocompleteProps<TagRead, true, false, false>["onChange"] =>
      (_, newValue: TagRead[]) => {
        dispatch(DocumentSamplerActions.onUpdateGroupTags({ groupName, tags: newValue }));
      },
    [dispatch],
  );

  const handleDeleteGroup = useCallback(
    (groupName: string) => () => {
      dispatch(DocumentSamplerActions.onDeleteGroup(groupName));
    },
    [dispatch],
  );

  return (
    <Card {...cardProps} className={`myFlexContainer ${cardProps.className}`}>
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title="Document Aggregation"
        subheader="Specify groups of tags to aggregate documents."
      />
      <CardContent className="myFlexFillAllContainer">
        <Stack direction="row" spacing={1}>
          <Button onClick={handleAddGroup}>Add Group</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button disabled={groupsAreEmpty} onClick={handleReset}>
            Reset
          </Button>
        </Stack>
        {Object.entries(aggregationGroups).map(([groupName, groupTags]) => (
          <Box
            key={groupName}
            sx={{ mb: 1 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <EditableTypography
              value={groupName}
              onChange={handleGroupNameChange(groupName)}
              variant="h6"
              whiteColor={false}
              stackProps={{
                width: "50%",
                flexGrow: 1,
              }}
            />
            <Autocomplete
              multiple
              value={groupTags}
              onChange={handleUpdateGroupTags(groupName)}
              options={tags}
              getOptionLabel={(option) => option.name}
              getOptionDisabled={(option) => selectedTagIds.includes(option.id)}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => <Chip {...getTagProps({ index })} key={index} label={option.name} />)
              }
              style={{ flexGrow: 2, width: "100%" }}
              sx={{ mr: 1 }}
              renderInput={(params) => <TextField {...params} placeholder={groupName} />}
            />
            <Tooltip title="Delete">
              <span>
                <IconButton onClick={handleDeleteGroup(groupName)} sx={{ mr: 1.5 }}>
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
});
