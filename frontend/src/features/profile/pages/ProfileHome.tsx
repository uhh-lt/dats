import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Button, Grid2, MenuItem, Select, SelectChangeEvent, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { UserRead } from "../../../api/openapi/models/UserRead.ts";

interface ProfileHomeProps {
  user: UserRead;
}

export function ProfileHome({ user }: ProfileHomeProps) {
  const [pronouns, setPronouns] = useState(0);

  const handlePronounsChange = (event: SelectChangeEvent<number>) => {
    setPronouns(event.target.value as number);
  };

  return (
    <>
      <Typography variant={"h5"} gutterBottom sx={{ pb: 1 }}>
        Profile
      </Typography>

      <Grid2 container spacing={1} sx={{ borderTop: 1, borderColor: "divider" }}>
        <Grid2 container size={{ xs: 10 }}>
          <Grid2 size={{ xs: 12 }}>
            <Typography variant={"body1"} gutterBottom>
              <b>Name</b>
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <TextField
              value={user.first_name + " " + user.last_name}
              sx={{
                width: "70%",
                bgcolor: "divider",
                borderRadius: 1,
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "#000000",
                },
              }}
              disabled
              size="small"
            />
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <Typography variant={"body1"} gutterBottom>
              <b>Registered e-mail</b>
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <TextField
              value={user.email}
              sx={{
                width: "70%",
                bgcolor: "divider",
                borderRadius: 1,
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "#000000",
                },
              }}
              disabled
              size="small"
            />
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Typography variant={"body1"} gutterBottom>
              <b>Bio</b>
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            {/* Backend TODO */}
            <TextField
              multiline
              rows={3}
              placeholder={"Please tell us something about you..."}
              sx={{ width: "70%" }}
              size="small"
            />
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Typography variant={"body1"} gutterBottom>
              <b>Pronouns</b>
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            {/* Backend TODO */}
            <Select value={pronouns} sx={{ width: "70%" }} size="small" onChange={handlePronounsChange}>
              <MenuItem value={0}>Don't specify</MenuItem>
              <MenuItem value={1}>they/them</MenuItem>
              <MenuItem value={2}>she/her</MenuItem>
              <MenuItem value={3}>he/him</MenuItem>
              <MenuItem value={4}>Custom</MenuItem>
            </Select>
          </Grid2>
          {pronouns === 4 ? (
            <Grid2 size={{ xs: 12 }}>
              <TextField sx={{ width: "70%" }} size="small" placeholder="Please enter your pronouns here..." />
            </Grid2>
          ) : (
            <></>
          )}
          <Grid2 size={{ xs: 12 }}>
            <Button aria-label="Update Profile" variant="contained" disabled size="small">
              Save Profile
            </Button>
          </Grid2>
        </Grid2>
        <Grid2 container size={{ xs: 2 }}>
          <Grid2 size={{ xs: 12 }}>
            <AccountCircleIcon color="success" sx={{ width: 92, height: 92 }} />
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Button disabled>Edit Photo</Button>
          </Grid2>
        </Grid2>
      </Grid2>
    </>
  );
}
