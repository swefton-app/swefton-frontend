import type { UserRole } from "../auth/contracts";

export interface DashboardUser {
  id: number;
  email: string;
  role: UserRole;
  emailConfirmed: boolean;
  onboardingCompleted: boolean;
}

export interface DashboardProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  experience?: number;
  price?: number;
}

export interface DashboardPreferences {
  timezone: string;
  pushNotifications: boolean;
  emailNotifications: boolean;
}

export interface DashboardAddress {
  city: string;
  country: string;
}

export interface DashboardImage {
  id: number;
  type: string;
  url: string;
}

export interface DashboardDocument {
  id: number;
  type: string;
  fileName: string;
}

export interface UserDashboardResponse {
  user: DashboardUser;
  profile: DashboardProfile;
  preferences: DashboardPreferences;
  address: DashboardAddress;
  images: DashboardImage[];
  documents: DashboardDocument[];
}

export interface TrainerSummary {
  id: string;
  displayName: string;
  bio?: string;
  experience?: number;
  price?: number;
  city?: string;
  country?: string;
  avatarUrl?: string;
  specialties: string[];
}
