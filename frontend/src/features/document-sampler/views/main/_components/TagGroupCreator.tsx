import { EditableTypography } from "@components/EditableTypography";
import { TagRead } from "@models/TagRead";
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
  Divider,
  IconButton,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  UseAutocompleteProps,
} from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { memo, useCallback, useState } from "react";
import { DocumentSamplerActions } from "../../../store/documentSamplerSlice";

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

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleOpenInfo = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const infoOpen = Boolean(anchorEl);

  return (
    <Card {...cardProps} className={`myFlexContainer ${cardProps.className}`}>
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <>
            <IconButton aria-label="info" onClick={handleOpenInfo}>
              <InfoIcon />
            </IconButton>
            <Popover
              open={infoOpen}
              anchorEl={anchorEl}
              onClose={handleCloseInfo}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              slotProps={{
                paper: {
                  sx: { p: 3, maxWidth: 380 },
                },
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                How Document Sampler Works
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Extract representative, balanced samples of documents based on cross-cutting tag categories.
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  1. What is a Group?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Each group represents a category/variable (e.g., <em>Sentiment</em> or <em>Gender</em>). Adding tags
                  to a group defines the possible values for that category.
                </Typography>

                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  2. Mutually Exclusive Criteria
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  A document is only considered if it has <strong>exactly one tag</strong> from each group (e.g. exactly
                  one Sentiment tag AND exactly one Gender tag).
                </Typography>

                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  3. Group Combinations
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Qualifying documents are grouped into unique cross-category combinations (e.g.,{" "}
                  <em>Positive & Male</em>, <em>Negative & Female</em>).
                </Typography>

                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  4. Balanced Sampling
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Samples are drawn evenly across all combinations to ensure fair representation and prevent any single
                  category from dominating your analysis.
                </Typography>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Example Scenario:
                </Typography>
                <Box sx={{ pl: 1 }}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    • Groups & Tags:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2, mb: 1 }}>
                    - Group 0 (Sentiment): [Positive, Negative]
                    <br />- Group 1 (Gender): [Male, Female]
                  </Typography>

                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    • Sample Documents:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2, mb: 1 }}>
                    - Doc A [Positive, Male] (Included)
                    <br />- Doc B [Positive, Female] (Included)
                    <br />- Doc C [Negative, Male] (Included)
                    <br />- Doc D [Negative, Female] (Included)
                    <br />- Doc E [Positive] (Excluded - missing Gender tag)
                    <br />- Doc F [Positive, Negative, Male] (Excluded - multiple Sentiment tags)
                  </Typography>

                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    • Output (with fixed sample size n=1):
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    Draws 1 document from each combination: [Doc A, Doc B, Doc C, Doc D].
                  </Typography>
                </Box>
              </Box>
            </Popover>
          </>
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
