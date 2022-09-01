import { Button, Card, CardActions, CardContent, Divider, IconButton, Popover, Stack, Typography } from "@mui/material";
import React from "react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useAuth } from "../../auth/AuthProvider";
import { Link } from "react-router-dom";

interface UserProfileMenuProps {
  handleLogout: () => void;
}

function UserProfileMenu({ handleLogout }: UserProfileMenuProps) {
  const { user } = useAuth();

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

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
      <IconButton onClick={handleClick} color="inherit" size="large">
        <AccountCircleIcon fontSize="inherit" />
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
          {user.data && (
            <CardContent>
              <Stack spacing={1}>
                <Typography align="center" variant="h2">
                  <AccountCircleIcon fontSize="inherit" />
                </Typography>
                <Typography align="center" variant="h6">
                  {user.data.first_name} {user.data.last_name}
                </Typography>
                <Typography align="center" variant="body1" color="slategrey">
                  {user.data.email}
                </Typography>
                <Typography align="center" variant="body1">
                  <Button variant="outlined" color="inherit" component={Link} to={"/user/" + user.data.id}>
                    View profile
                  </Button>
                </Typography>
              </Stack>
            </CardContent>
          )}
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
