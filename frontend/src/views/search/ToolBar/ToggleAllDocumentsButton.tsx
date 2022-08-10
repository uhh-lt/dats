import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import { ChangeEvent } from "react";

interface ToggleAllDocumentsButtonProps {
  numSelectedDocuments: number;
  numTotalDocuments: number;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function ToggleAllDocumentsButton({
  numSelectedDocuments,
  numTotalDocuments,
  handleChange,
}: ToggleAllDocumentsButtonProps) {
  return (
    <>
      <Checkbox
        color="primary"
        indeterminate={numSelectedDocuments > 0 && numSelectedDocuments < numTotalDocuments}
        checked={numTotalDocuments > 0 && numSelectedDocuments === numTotalDocuments}
        onChange={handleChange}
        inputProps={{
          "aria-label": "select all desserts",
        }}
      />
      {numSelectedDocuments > 0 && (
        <Typography color="inherit" variant="subtitle1" component="div">
          {numSelectedDocuments} selected
        </Typography>
      )}
    </>
  );
}

export default ToggleAllDocumentsButton;
