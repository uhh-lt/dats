import { createAction } from "@reduxjs/toolkit";

export const AuthActions = {
  userChanged: createAction<number>("auth/userChanged"),
};
