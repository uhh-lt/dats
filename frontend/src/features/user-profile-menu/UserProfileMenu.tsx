import { Button, Card, CardActions, CardContent, Divider, IconButton, Popover, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Link } from "react-router-dom";
import Avatar from "@mui/material/Avatar";
import { UserRead } from "../../api/openapi";

interface UserProfileMenuProps {
  handleLogout: () => void;
  user: UserRead;
}

function UserProfileMenu({ handleLogout, user }: UserProfileMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <div>
      <IconButton onClick={handleClick} size="medium">
        <Avatar sx={{ bgcolor: "#2e7d32", border: "1px dashed white" }}>
          {user.first_name.charAt(0).toUpperCase()}
          {user.last_name.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Card sx={{ minWidth: 275 }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography align="center" variant="h2">
                <AccountCircleIcon fontSize="inherit" />
              </Typography>
              <Typography align="center" variant="h6">
                {user.first_name} {user.last_name}
              </Typography>
              <Typography align="center" variant="body1" color="slategrey">
                {user.email}
              </Typography>
              <Typography align="center" variant="body1">
                <Button variant="outlined" color="inherit" component={Link} to={"/user/" + user.id}>
                  View profile
                </Button>
              </Typography>
            </Stack>
          </CardContent>
          <Divider />
          <CardActions sx={{ justifyContent: "center" }}>
            <Button onClick={() => handleLogout()} variant="outlined" color="error">
              Logout
            </Button>
          </CardActions>
        </Card>
      </Popover>
    </div>
  );
}

export default UserProfileMenu;
