import { UserAuthorizationHeaderData } from "../api/openapi/models/UserAuthorizationHeaderData";

export function handleOIDCLogin(updateAuthData: (authData: UserAuthorizationHeaderData) => void): void {
  const width = 600;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  // Open the OIDC login window
  const loginWindow = window.open(
    `/api/authentication/oidc/login?redirect_uri=${encodeURIComponent(
      window.location.origin + "/api/authentication/oidc/callback",
    )}`,
    "oidc_login",
    `width=${width},height=${height},left=${left},top=${top}`,
  );

  // Listen for the message from the popup window
  const messageHandler = (event: MessageEvent) => {
    if (event.data.token) {
      const authData = event.data.token as UserAuthorizationHeaderData;
      updateAuthData(authData);
      window.removeEventListener("message", messageHandler);
      if (loginWindow) {
        loginWindow.close();
      }
    }
  };

  window.addEventListener("message", messageHandler);
}
