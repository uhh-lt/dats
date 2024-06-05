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
} from "@mui/material";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import EditableTypography from "../../../components/EditableTypography.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { DocumentSamplerActions } from "./documentSamplerSlice.ts";

interface TagGroupCreatorProps {
  tags: DocumentTagRead[];
  aggregationGroups: Record<string, DocumentTagRead[]>;
  cardProps?: CardProps;
}

function TagGroupCreator({ tags, aggregationGroups, cardProps = {} }: TagGroupCreatorProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // local state
  const selectedTagIds = Object.values(aggregationGroups)
    .flat()
    .map((tag) => tag.id);
  const groupsAreEmpty = Object.keys(aggregationGroups).length === 0;

  cardProps["className"] = cardProps["className"] + " myFlexContainer";
  return (
    <Card {...cardProps}>
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title={"Document Aggregation"}
        subheader={`Specify groups of tags to aggregate documents.`}
      />
      <CardContent className="myFlexFillAllContainer">
        <Stack direction="row" spacing={1}>
          <Button
            onClick={() => {
              dispatch(DocumentSamplerActions.onAddNewGroup());
            }}
          >
            Add Group
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button disabled={groupsAreEmpty} onClick={() => dispatch(DocumentSamplerActions.onReset())}>
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
              onChange={(newValue) => {
                dispatch(DocumentSamplerActions.onGroupNameChange({ oldName: groupName, newName: newValue }));
              }}
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
              onChange={(_, newValue) => {
                dispatch(DocumentSamplerActions.onUpdateGroupTags({ groupName, tags: newValue }));
              }}
              options={tags}
              getOptionLabel={(option) => option.name}
              getOptionDisabled={(option) => selectedTagIds.includes(option.id)}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => <Chip label={option.name} {...getTagProps({ index })} />)
              }
              style={{ flexGrow: 2, width: "100%" }}
              sx={{ mr: 1 }}
              renderInput={(params) => <TextField {...params} placeholder={groupName} />}
            />
            <Tooltip title="Delete">
              <span>
                <IconButton
                  onClick={() => {
                    dispatch(DocumentSamplerActions.onDeleteGroup(groupName));
                  }}
                  sx={{ mr: 1.5 }}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

export default TagGroupCreator;
