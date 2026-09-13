import {
  onboardingEndpoints,
  type ImageResponse,
  type OnboardingResponse,
} from "@swefton/shared/onboarding";
import { httpClient } from "../../../core/http/httpClient";

type OnboardingPayload = Partial<OnboardingResponse> & {
  onboarding_completed?: unknown;
};

function isOnboardingComplete(data: OnboardingPayload) {
  const value = data.onboardingCompleted ?? data.onboarding_completed;
  return value === true || value === 1 || value === "true" || value === "1";
}

export const dashboardApi = {
  async get() {
    const { data } = await httpClient.get<OnboardingPayload>(
      onboardingEndpoints.onboarding,
    );

    return {
      onboardingCompleted: isOnboardingComplete(data),
      profile: {
        firstName: data.profile?.firstName ?? "Swefton",
        lastName: data.profile?.lastName ?? "Member",
        displayName: data.profile?.displayName,
        dateOfBirth: data.profile?.dateOfBirth,
        gender: data.profile?.gender,
        bio: data.profile?.bio,
        experience: data.profile?.experience,
        price: data.profile?.price,
      },
      address: {
        addressLine: data.address?.addressLine ?? "",
        city: data.address?.city ?? "Location not set",
        state: data.address?.state,
        postalCode: data.address?.postalCode,
        country: data.address?.country ?? "",
        latitude: data.address?.latitude,
        longitude: data.address?.longitude,
      },
      preferences: {
        timezone:
          data.preferences?.timezone ??
          Intl.DateTimeFormat().resolvedOptions().timeZone ??
          "UTC",
        pushNotifications: data.preferences?.pushNotifications ?? false,
        emailNotifications: data.preferences?.emailNotifications ?? false,
        marketingNotifications:
          data.preferences?.marketingNotifications ?? false,
      },
    } satisfies OnboardingResponse;
  },

  async getProfileImage(): Promise<ImageResponse | null> {
    const { data } = await httpClient.get<ImageResponse[]>(
      onboardingEndpoints.images,
    );

    return data.find((image) => image.type === "PROFILE") ?? null;
  },
};
