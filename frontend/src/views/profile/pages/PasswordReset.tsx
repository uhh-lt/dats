import { Grid, Link, Typography } from "@mui/material";
import { SUPPORT_EMAIL } from "../../../utils/GlobalConstants";

export default function PasswordReset() {
  return (
    <>
      <Typography variant={"h5"} gutterBottom sx={{ pb: 1 }}>
        Reset Password
      </Typography>

      <Grid container spacing={1} sx={{ borderTop: 1, borderColor: "divider" }}>
        <Grid item xs={12}>
          <Typography variant={"body1"} gutterBottom>
            To reset your password, please write an e-mail to{" "}
            <Link href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</Link> from your registered e-mail address.
          </Typography>
        </Grid>
      </Grid>
    </>
  );
}
