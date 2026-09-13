import { useState } from "react";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
} from "@swefton/shared/auth";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { onboardingPrefillStorage } from "../../../core/storage/onboardingPrefillStorage";
import { tokenStorage } from "../../../core/storage/tokenStorage";
import { authApi } from "../api/authApi";
import { getPostAuthRoute } from "../utils/getPostAuthRoute";

export type AuthView = "login" | "register" | "verify" | "authenticated";

export function useAuthFlow() {
  const [view, setView] = useState<AuthView>(() =>
    tokenStorage.getAccessToken() ? "authenticated" : "login",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [pendingRegistration, setPendingRegistration] =
    useState<LoginRequest | null>(null);

  const selectView = (nextView: AuthView) => {
    setError("");
    setNotice("");
    setView(nextView);
  };

  const completeAuthentication = (
    response: AuthResponse,
    persistent = true,
  ) => {
    tokenStorage.save(response, persistent);
    const claimedRole = tokenStorage.getRole();
    window.location.assign(
      getPostAuthRoute({ ...response, role: claimedRole ?? response.role }),
    );
  };

  const completeLogin = (response: AuthResponse, persistent = true) => {
    tokenStorage.save(response, persistent);
    onboardingPrefillStorage.clear();
    window.location.assign("/userDashboard");
  };

  const completeRegistration = (response: AuthResponse, persistent = true) => {
    tokenStorage.save(response, persistent);
    const claimedRole = tokenStorage.getRole();
    window.location.assign(
      getPostAuthRoute({
        ...response,
        onboardingCompleted: false,
        role: claimedRole ?? response.role,
      }),
    );
  };

  const login = async (payload: LoginRequest, keepSignedIn: boolean) => {
    setPending(true);
    setError("");
    try {
      const response = await authApi.login(payload);
      completeLogin(response, keepSignedIn);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Invalid email or password."));
    } finally {
      setPending(false);
    }
  };

  const register = async (payload: RegisterRequest) => {
    setPending(true);
    setError("");
    try {
      const account = await authApi.register(payload);
      setPendingRegistration({
        email: payload.email,
        password: payload.password,
      });
      setVerificationEmail(account.email);
      setNotice(`We sent a six-digit code to ${account.email}`);
      setView("verify");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "We could not create your account."),
      );
    } finally {
      setPending(false);
    }
  };

  const verifyEmail = async (payload: VerifyEmailRequest) => {
    setPending(true);
    setError("");
    try {
      await authApi.verifyEmail(payload);

      if (pendingRegistration) {
        try {
          const response = await authApi.login(pendingRegistration);
          setPendingRegistration(null);
          onboardingPrefillStorage.clear();
          completeRegistration(response);
          return;
        } catch (loginError) {
          setError(
            getApiErrorMessage(
              loginError,
              "Your email is verified, but automatic sign-in failed. Please sign in.",
            ),
          );
        }
      }

      setNotice("Email verified. You can now sign in to your account.");
      setView("login");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "That code is invalid or expired."),
      );
    } finally {
      setPending(false);
    }
  };

  const resendCode = async () => {
    setPending(true);
    setError("");
    try {
      await authApi.resendVerificationCode(verificationEmail);
      setNotice("A new verification code is on its way.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "We could not resend the code."),
      );
    } finally {
      setPending(false);
    }
  };

  const logout = async () => {
    setPending(true);
    try {
      await authApi.logout();
    } catch {
      // Local browser credentials must be cleared even when the API is offline.
    } finally {
      tokenStorage.clear();
      onboardingPrefillStorage.clear();
      setPending(false);
      setView("login");
      setNotice("You have been signed out safely.");
    }
  };

  return {
    error,
    completeAuthentication,
    completeLogin,
    completeRegistration,
    login,
    logout,
    notice,
    pending,
    register,
    resendCode,
    selectView,
    verificationEmail,
    verifyEmail,
    view,
  };
}
