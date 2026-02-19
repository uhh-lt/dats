import { Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { ChangeEvent, useState } from "react";
import PerspectivesHooks from "../../api/PerspectivesHooks.ts";
import { useDialog } from "../../hooks/useDialog.ts";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { useDebounce } from "../../utils/useDebounce.ts";
import PerspectiveCard from "./PerspectiveCard.tsx";
import PerspectiveCreationDialog from "./PerspectiveCreationDialog.tsx";

function Perspectives() {
  const aspects = PerspectivesHooks.useGetAllAspectsList();

  // filter query state
  const [filterQuery, setFilterQuery] = useState("");
  const handleFilterQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilterQuery(event.target.value);
  };
  const debouncedFilterQuery = useDebounce(filterQuery, 500);

  // sort by state
  const [sortBy, setSortBy] = useState("name"); // Default sort by name
  const handleSortByChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSortBy(event.target.value);
  };

  // filtered data
  const filteredAspects =
    aspects.data?.filter((data) => {
      return data.name.includes(debouncedFilterQuery);
    }) || [];

  // creation dialog
  const creationDialog = useDialog();

  return (
    <>
      <PerspectiveCreationDialog open={creationDialog.isOpen} onClose={creationDialog.close} />
      <ContentContainerLayout>
        <Stack spacing={2} pb={2}>
          <Stack spacing={2} direction={"row"} alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" component="h1" color="primary.dark">
                Perspectives Dashboard
              </Typography>
              <Typography pt={1} color="textSecondary">
                Create your custom document visualization!
              </Typography>
            </Box>
            <Button
              onClick={creationDialog.open}
              variant="contained"
              color="primary"
              endIcon={getIconComponent(Icon.CREATE)}
            >
              Create Perspective
            </Button>
          </Stack>
          <Stack direction={"row"} spacing={2} alignItems="center">
            <TextField
              type="text"
              value={filterQuery}
              onChange={handleFilterQueryChange}
              placeholder="Search by name ..."
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                backgroundColor: "white",
                boxShadow: "0px 1px 3px rgba(0,0,0,0.1)",
                borderRadius: "4px",
              }}
            />
            <TextField
              select
              label="Sort by"
              value={sortBy}
              onChange={handleSortByChange}
              size="small"
              variant="outlined"
              sx={{
                width: 200,
                backgroundColor: "white",
                boxShadow: "0px 1px 3px rgba(0,0,0,0.1)",
                borderRadius: "4px",
              }}
              disabled
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="creationDate">Creation Date</MenuItem>
              <MenuItem value="size">Size (Datapoints)</MenuItem>
            </TextField>
          </Stack>
          <Box display="flex" gap={2} paddingY={0} flexWrap="wrap">
            {aspects.isLoading ? (
              <Box
                sx={{
                  pt: 4,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <CircularProgress color="primary" />
              </Box>
            ) : aspects.isError ? (
              <Typography color="error">Error loading aspects</Typography>
            ) : (
              <>
                {filteredAspects.map((aspect) => (
                  <PerspectiveCard
                    key={aspect.id}
                    to={`./dashboard/${aspect.id}`}
                    title={aspect.name}
                    aspect={aspect}
                  />
                ))}
              </>
            )}
          </Box>
        </Stack>
      </ContentContainerLayout>
    </>
  );
}

export default Perspectives;
