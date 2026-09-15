import {
  onboardingEndpoints,
  type ImageResponse,
  type ImageType,
  type OnboardingResponse,
  type TrainerDocumentResponse,
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
    const data = await this.getImages();

    return data.find((image) => image.type === "PROFILE") ?? null;
  },

  async getImages(): Promise<ImageResponse[]> {
    const { data } = await httpClient.get<ImageResponse[]>(
      onboardingEndpoints.images,
    );
    return data;
  },

  async uploadImage(file: File, type: ImageType, position: number) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "image",
      new Blob([JSON.stringify({ type, position })], {
        type: "application/json",
      }),
    );

    const { data } = await httpClient.post<ImageResponse>(
      onboardingEndpoints.images,
      formData,
    );
    return data;
  },

  async getTrainerDocuments(): Promise<TrainerDocumentResponse[]> {
    const { data } = await httpClient.get<TrainerDocumentResponse[]>(
      onboardingEndpoints.trainerDocuments,
    );
    return data;
  },

  async downloadTrainerDocument(documentId: number): Promise<Blob> {
    const { data } = await httpClient.get<Blob>(
      `${onboardingEndpoints.trainerDocuments}/${documentId}/download`,
      { responseType: "blob" },
    );
    return data;
  },
};
