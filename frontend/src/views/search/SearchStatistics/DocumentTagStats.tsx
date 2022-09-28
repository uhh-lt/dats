import { Button, ButtonProps, Stack } from "@mui/material";
import React from "react";
import TagHooks from "../../../api/TagHooks";
import SearchHooks from "../../../api/SearchHooks";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { useParams } from "react-router-dom";

interface DocumentTagStatsProps {
  handleClick: (tagId: number) => void;
}

function DocumentTagStats({ handleClick }: DocumentTagStatsProps) {
  // router
  const projectId = parseInt((useParams() as {projectId: string;}).projectId);

  // redux (global client state)
  const filters = useAppSelector((state) => state.search.filters);

  // query (global server state)
  const tagStats = SearchHooks.useSearchTagStats(projectId, filters);

  // computed
  const maxValue = tagStats.data && tagStats.data.length > 0 ? tagStats.data[0].count : 0;

  return (
    <>
      {tagStats.isLoading && <div>Loading!</div>}
      {tagStats.isError && (
        <div>
          <>Error: {tagStats.error}</>
        </div>
      )}
      {tagStats.isSuccess && (
        <Stack sx={{ whiteSpace: "nowrap" }} spacing={0.5}>
          {tagStats.data.map((tagStat) => (
            <DocumentTagStatButtonContent
              key={tagStat.tag.id}
              sx={{ width: `${(tagStat.count / maxValue) * 100}%`, justifyContent: "left" }}
              variant="outlined"
              onClick={() => handleClick(tagStat.tag.id)}
              tagId={tagStat.tag.id}
              count={tagStat.count}
            />
          ))}
        </Stack>
      )}
    </>
  );
}

export default DocumentTagStats;

function DocumentTagStatButtonContent({ tagId, count, ...props }: { tagId: number; count: number } & ButtonProps) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <Button {...props} disabled={!tag.isSuccess}>
      {tag.isLoading && <>Loading...: {count}</>}
      {tag.isError && <>{tag.error.message} </>}
      {tag.isSuccess && (
        <>
          {tag.data.title}: {count}
        </>
      )}
    </Button>
  );
}
