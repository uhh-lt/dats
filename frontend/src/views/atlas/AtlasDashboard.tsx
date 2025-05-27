import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import MapCard from "./MapCard.tsx";

import { ChangeEvent, useState } from "react";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { useDebounce } from "../../utils/useDebounce.ts";
import CreateMapCard from "./CreateMapCard.tsx";

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

  return (
    <ContentContainerLayout>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">
          Atlas Dashboard
        </Typography>
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
          <CreateMapCard />
          {filteredAspects.map((aspect) => (
            <MapCard
              key={aspect.id}
              to={`./map-details/${aspect.id}`}
              title={aspect.name}
              color={"#77dd77"}
              description={""}
            />
          ))}
        </Box>
      </Stack>
    </ContentContainerLayout>
  );
}

export default AtlasDashboard;
