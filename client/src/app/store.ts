import { configureStore, type Middleware } from "@reduxjs/toolkit";
import authReducer, {
  AUTH_STORAGE_KEY,
  clearSession,
  setSession,
  setVerifiedUser,
} from "@/features/auth/authSlice";
import { api } from "@/services/api";

const authPersistenceMiddleware: Middleware = (middlewareApi) => (next) => (action) => {
  const result = next(action);
  if (typeof window !== "undefined") {
    if (setSession.match(action) || setVerifiedUser.match(action) || clearSession.match(action)) {
      const state = middlewareApi.getState() as {
        auth: { token: string | null; user: unknown; status: string };
      };
      const { token, user, status } = state.auth;
      if (status === "authenticated" && token && user) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }
  return result;
};

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware, authPersistenceMiddleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
