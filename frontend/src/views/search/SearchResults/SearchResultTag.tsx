interface SearchResultTagProps {
  label: string;
  color: string;
}

function SearchResultTag({ label, color }: SearchResultTagProps) {
  return (
    <span className={"myTag"} style={{ color: color, borderColor: color }}>
      {label}
    </span>
  );
}

export default SearchResultTag;
