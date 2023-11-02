import DescriptionIcon from "@mui/icons-material/Description";
import { Stack } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks";
import { Link } from "react-router-dom";

interface SdocBlockProps {
  sdocId: number;
}

function SdocBlock({ sdocId }: SdocBlockProps) {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.isSuccess) {
    return (
      <Link to={`../search/doc/${sdocId}`}>
        <Stack direction="row" alignItems="baseline" component="span" display="inline-flex">
          <DescriptionIcon sx={{ mr: 0.5, alignSelf: "center" }} />
          {sdoc.data.name}
        </Stack>
      </Link>
    );
  } else {
    return <span>Loading...</span>;
  }
}

export default SdocBlock;
