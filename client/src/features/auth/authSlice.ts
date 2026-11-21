import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthPayload, User } from "@/types/attendance";

export interface AuthState {
  token: string | null;
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
}

const initialState: AuthState = {
  token: null,
  user: null,
  status: "loading",
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<AuthPayload>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.status = "authenticated";
    },
    restoreToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.user = null;
      state.status = "loading";
    },
    setVerifiedUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.status = "authenticated";
    },
    clearSession: (state) => {
      state.token = null;
      state.user = null;
      state.status = "anonymous";
    },
  },
});

export const AUTH_STORAGE_KEY = "punchpoint-session";
export const LAST_EMAIL_KEY = "punchpoint-last-email";
export const { setSession, restoreToken, setVerifiedUser, clearSession } = authSlice.actions;
export default authSlice.reducer;
