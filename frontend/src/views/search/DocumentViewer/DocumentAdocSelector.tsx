import { AppBar, AppBarProps, FormControl, MenuItem, Select, SelectChangeEvent, Stack, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { AnnotationDocumentRead } from "../../../api/openapi/models/AnnotationDocumentRead.ts";
import UserName from "../../../components/UserName.tsx";

interface DocumentAdocSelectorProps {
  annotationDocuments: AnnotationDocumentRead[];
  selectedAdoc: AnnotationDocumentRead;
  handleSelectAnnotationDocument: (adoc: AnnotationDocumentRead) => void;
}

export function DocumentAdocSelector({
  annotationDocuments,
  selectedAdoc,
  handleSelectAnnotationDocument,
  ...props
}: DocumentAdocSelectorProps & AppBarProps) {
  const id2Adoc = useMemo(() => {
    return annotationDocuments.reduce(
      (acc, adoc) => {
        acc[adoc.id] = adoc;
        return acc;
      },
      {} as Record<number, AnnotationDocumentRead>,
    );
  }, [annotationDocuments]);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number>) => {
    handleSelectAnnotationDocument(id2Adoc[event.target.value as number]);
  };

  // render
  return (
    <AppBar
      position="relative"
      variant="outlined"
      elevation={0}
      sx={{
        backgroundColor: (theme) => theme.palette.grey[100],
        color: (theme) => theme.palette.text.primary,
        borderTop: 0,
        ...props.sx,
      }}
      {...props}
    >
      <Toolbar variant="dense">
        <FormControl size="small" fullWidth>
          <Stack direction="row" sx={{ width: "100%", alignItems: "center" }}>
            <Typography variant="body1" color="inherit" component="div" className="overflow-ellipsis" flexShrink={0}>
              Annotations
            </Typography>
            <Select
              sx={{ ml: 1, backgroundColor: "white" }}
              fullWidth
              value={selectedAdoc.id}
              onChange={handleChange}
              renderValue={(selected) => <UserName userId={id2Adoc[selected].user_id} />}
            >
              {annotationDocuments.map((adoc) => (
                <MenuItem key={adoc.id} value={adoc.id}>
                  <UserName userId={adoc.user_id} />
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </FormControl>
      </Toolbar>
    </AppBar>
  );
}
