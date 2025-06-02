import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import MapCard from "./MapCard.tsx";

import { ChangeEvent, useState } from "react";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { useDebounce } from "../../utils/useDebounce.ts";
import MapCreationDialog from "./AspectCreationDialog.tsx";

function AtlasDashboard() {
  const aspects = TopicModellingHooks.useGetAllAspectsList();

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
  const [open, setOpen] = useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <MapCreationDialog open={open} onClose={handleClose} />
      <ContentContainerLayout>
        <Stack spacing={2} pb={2}>
          <Stack spacing={2} direction={"row"} alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" component="h1" color="primary.dark">
                Atlas Dashboard
              </Typography>
              <Typography pt={1} color="textSecondary">
                Create your custom document visualization!
              </Typography>
            </Box>
            <Button
              onClick={handleOpen}
              variant="contained"
              color="primary"
              sx={{ width: 174 }}
              endIcon={getIconComponent(Icon.CREATE)}
            >
              Create Map
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
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="creationDate">Creation Date</MenuItem>
              <MenuItem value="size">Size (Datapoints)</MenuItem>
            </TextField>
          </Stack>
          <Box display="flex" gap={2} paddingY={0} flexWrap="wrap">
            {filteredAspects.map((aspect) => (
              <MapCard key={aspect.id} to={`./map-details/${aspect.id}`} title={aspect.name} aspect={aspect} />
            ))}
          </Box>
        </Stack>
      </ContentContainerLayout>
    </>
  );
}

export default AtlasDashboard;
