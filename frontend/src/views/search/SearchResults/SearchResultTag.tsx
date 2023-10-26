import DocumentTagChip from "../DocumentViewer/DocumentTagChip";
import { useAddTagFilter } from "../hooks/useAddTagFilter";

interface SearchResultTagProps {
  tagId: number;
}

function SearchResultTag({ tagId }: SearchResultTagProps) {
  const handleAddTagFilter = useAddTagFilter();

  return (
    <DocumentTagChip
      tagId={tagId}
      handleClick={(event, tag) => {
        event.stopPropagation();
        handleAddTagFilter(tag.id);
      }}
    />
  );
}

export default SearchResultTag;
