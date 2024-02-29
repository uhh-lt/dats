import { Grid, Link, Typography } from "@mui/material";
import { SUPPORT_EMAIL } from "../../../utils/GlobalConstants.ts";

export default function Support() {
  return (
    <>
      <Typography variant={"h5"} gutterBottom sx={{ pb: 1 }}>
        {/* User {user.data.id} */}
        Support
      </Typography>
      <Grid container spacing={1} sx={{ borderTop: 1, borderColor: "divider" }}>
        <Grid item xs={12}>
          <Typography variant={"body1"} gutterBottom>
            For any queries or support, please write an e-mail to{" "}
            <Link href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</Link> from your registered e-mail address.
          </Typography>
        </Grid>
      </Grid>
    </>
  );
}
