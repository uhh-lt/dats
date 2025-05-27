import { Card, CardActionArea, CardActions, CardContent, Typography } from "@mui/material";
import { useState } from "react";
import AspectCreationDialog from "./AspectCreationDialog.tsx";

function CreateMapCard() {
  const [open, setOpen] = useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Card sx={{ width: 360, flexShrink: 0 }}>
        <CardActionArea onClick={handleOpen}>
          <CardContent sx={{ padding: "0px !important" }}>
            <Typography variant="body2" color="textPrimary" bgcolor={"lightgrey"} p={2} height={200}>
              CREATE NEW MAP
            </Typography>
          </CardContent>
          <CardActions>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              Create New Map
            </Typography>
          </CardActions>
        </CardActionArea>
      </Card>
      <AspectCreationDialog open={open} onClose={handleClose} />
    </>
  );
}

export default CreateMapCard;
