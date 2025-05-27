import { Box } from "@mui/material";

function SelectionInformation() {
  return (
    <Box>
      <Box sx={{ p: 2 }}>
        <h2>Selection Information</h2>
        <p>
          This section provides information about the currently selected items in the atlas. It will display details
          such as the number of selected items, their types, and any relevant metadata.
        </p>
      </Box>
    </Box>
  );
}

export default SelectionInformation;
