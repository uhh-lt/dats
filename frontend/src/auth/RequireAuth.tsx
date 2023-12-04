import { Navigate, useLocation } from "react-router-dom";
import { LoginStatus, useAuth } from "./AuthProvider";

function RequireAuth({ children }: { children: JSX.Element }) {
  let auth = useAuth();
  let location = useLocation();

  if (auth.loginStatus !== LoginStatus.LOGGED_OUT) {
    return children;
  } else {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
}

export default RequireAuth;
