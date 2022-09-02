import TagHooks from "../../../api/TagHooks";

interface SearchResultTagProps {
  tagId: number;
}

function SearchResultTag({ tagId }: SearchResultTagProps) {
  // global server state (react query)
  const tag = TagHooks.useGetTag(tagId);

  return (
    <>
      {tag.isSuccess ? (
        <span className={"myTag"} style={{ color: tag.data.description, borderColor: tag.data.description }}>
          {tag.data.title}
        </span>
      ) : null}
    </>
  );
}

export default SearchResultTag;
