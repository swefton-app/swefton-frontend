import type {
  AuthApi,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
} from "@swefton/shared/auth";
import { authEndpoints } from "@swefton/shared/auth";
import { httpClient } from "../../../core/http/httpClient";

type AuthResponsePayload = AuthResponse & {
  onboarding_completed?: unknown;
  onboardingComplete?: unknown;
  onboarding_complete?: unknown;
  user?: {
    onboardingCompleted?: unknown;
    onboardingComplete?: unknown;
    onboarding_completed?: unknown;
    onboarding_complete?: unknown;
  };
  data?: AuthResponsePayload;
};

export function normalizeAuthResponse(
  payload: AuthResponsePayload,
): AuthResponse {
  const response = payload.data ?? payload;
  const onboardingValue: unknown =
    response.onboardingCompleted ??
    response.onboardingComplete ??
    response.onboarding_completed ??
    response.onboarding_complete ??
    response.user?.onboardingCompleted ??
    response.user?.onboardingComplete ??
    response.user?.onboarding_completed ??
    response.user?.onboarding_complete;

  return {
    ...response,
    onboardingCompleted:
      onboardingValue === true ||
      onboardingValue === 1 ||
      onboardingValue === "true" ||
      onboardingValue === "1",
  };
}

export const authApi: AuthApi = {
  async login(payload: LoginRequest) {
    const { data } = await httpClient.post<AuthResponsePayload>(
      authEndpoints.login,
      payload,
    );
    return normalizeAuthResponse(data);
  },

  async register(payload: RegisterRequest) {
    const { data } = await httpClient.post<RegisterResponse>(
      authEndpoints.register,
      payload,
    );
    return data;
  },

  async verifyEmail(payload: VerifyEmailRequest) {
    await httpClient.post(authEndpoints.verifyEmail, payload);
  },

  async resendVerificationCode(email: string) {
    await httpClient.post(authEndpoints.resendVerificationCode, { email });
  },

  async logout() {
    await httpClient.post(authEndpoints.logout);
  },
};
