import { useEffect } from "react";
import { useAppDispatch } from "@/app/hooks";
import {
  AUTH_STORAGE_KEY,
  clearSession,
  restoreToken,
  setVerifiedUser,
} from "@/features/auth/authSlice";
import { api } from "@/services/api";

export function SessionBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!savedSession) {
      dispatch(clearSession());
      return;
    }

    try {
      const parsed: unknown = JSON.parse(savedSession);
      const token =
        typeof parsed === "object" &&
        parsed !== null &&
        "token" in parsed &&
        typeof (parsed as { token: unknown }).token === "string"
          ? (parsed as { token: string }).token
          : null;

      if (!token) {
        dispatch(clearSession());
        return;
      }

      dispatch(restoreToken(token));
      const request = dispatch(api.endpoints.getMe.initiate(undefined, { subscribe: false }));

      void request
        .unwrap()
        .then((user) => {
          if (user) {
            dispatch(setVerifiedUser(user));
          } else {
            dispatch(clearSession());
          }
        })
        .catch(() => {
          dispatch(clearSession());
        });

      return () => {
        request.abort();
      };
    } catch {
      dispatch(clearSession());
      return;
    }
  }, [dispatch]);

  return null;
}
