import { ContentContainerLayout } from "@components/content-layouts";
import { useDebounce } from "@hooks/useDebounce";
import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { ChangeEvent, useState } from "react";
import { PerspectiveCard } from "./_components/PerspectiveCard";
import { PerspectiveCreationDialog } from "./_components/PerspectiveCreationDialog";

const routeApi = getRouteApi("/_auth/project/$projectId/perspectives/");

export function PerspectivesDashboardView() {
  const { aspectsByProjectOptions } = routeApi.useRouteContext();
  const { data: aspects } = useSuspenseQuery({
    ...aspectsByProjectOptions,
    select: (data) => Object.values(data),
  });

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
  const filteredAspects = aspects.filter((data) => {
    return data.name.includes(debouncedFilterQuery);
  });

  return (
    <>
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
            <PerspectiveCreationDialog />
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
            {filteredAspects.map((aspect) => (
              <PerspectiveCard key={aspect.id} title={aspect.name} aspect={aspect} />
            ))}
          </Box>
        </Stack>
      </ContentContainerLayout>
    </>
  );
}
