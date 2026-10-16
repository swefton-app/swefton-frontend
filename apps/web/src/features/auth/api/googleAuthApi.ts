import {
  authEndpoints,
  type AuthResponse,
  type RoleCode,
} from "@swefton/shared/auth";
import type { OnboardingPrefill } from "@swefton/shared/onboarding";
import { config } from "../../../config";
import { normalizeAuthResponse } from "./authApi";

export async function authenticateWithGoogle(
  credential: string,
  role?: RoleCode,
): Promise<AuthResponse> {
  const response = await fetch(`${config.apiUrl}${authEndpoints.google}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, role }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Google authentication failed");
  }

  return normalizeAuthResponse((await response.json()) as AuthResponse);
}

export function getGoogleOnboardingPrefill(
  credential: string,
): OnboardingPrefill {
  try {
    const encodedPayload = credential.split(".")[1];
    if (!encodedPayload) return {};

    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "=",
    );
    const payload = JSON.parse(atob(paddedPayload)) as Record<string, unknown>;

    return {
      firstName:
        typeof payload.given_name === "string" ? payload.given_name : undefined,
      lastName:
        typeof payload.family_name === "string"
          ? payload.family_name
          : undefined,
      pictureUrl:
        typeof payload.picture === "string" ? payload.picture : undefined,
    };
  } catch {
    return {};
  }
}
