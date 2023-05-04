import { Button } from "@mui/material";
import TagHooks from "../../../api/TagHooks";
import { useAddTagFilter } from "../hooks/useAddTagFilter";

interface SearchResultTagProps {
  tagId: number;
}

function SearchResultTag({ tagId }: SearchResultTagProps) {
  // global server state (react query)
  const tag = TagHooks.useGetTag(tagId);

  const handleAddTagFilter = useAddTagFilter();

  return (
    <>
      {tag.isSuccess ? (
        <Button
          variant="outlined"
          style={{ color: tag.data.color, borderColor: tag.data.color, padding: 0 }}
          onClick={() => handleAddTagFilter(tag.data.id)}
        >
          {tag.data.title}
        </Button>
      ) : null}
    </>
  );
}

export default SearchResultTag;
