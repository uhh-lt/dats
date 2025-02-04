import { Grid2, Link, Typography } from "@mui/material";
import { SUPPORT_EMAIL } from "../../../utils/GlobalConstants.ts";

export default function PasswordReset() {
  return (
    <>
      <Typography variant={"h5"} gutterBottom sx={{ pb: 1 }}>
        Reset Password
      </Typography>

      <Grid2 container spacing={1} sx={{ borderTop: 1, borderColor: "divider" }}>
        <Grid2 size={{ xs: 12 }}>
          <Typography variant={"body1"} gutterBottom>
            To reset your password, please write an e-mail to{" "}
            <Link href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</Link> from your registered e-mail address.
          </Typography>
        </Grid2>
      </Grid2>
    </>
  );
}
