import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthPayload, User } from "@/types/attendance";
import { demoUsers } from "@/lib/mock-data";

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

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (_state, action: PayloadAction<AuthPayload>) => ({ token: action.payload.token, user: action.payload.user, status: "authenticated" }),
    restoreToken: (_state, action: PayloadAction<string>) => ({ token: action.payload, user: null, status: "loading" }),
    setVerifiedUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.status = "authenticated";
    },
    clearSession: () => ({ token: null, user: null, status: "anonymous" }),
  },
});

export const AUTH_STORAGE_KEY = "punchpoint-session";
export const LAST_EMAIL_KEY = "punchpoint-last-email";
export const { setSession, restoreToken, setVerifiedUser, clearSession } = authSlice.actions;
export default authSlice.reducer;