import { AuthPage } from "../features/auth/pages/AuthPage";
import { CvBuilderPage } from "../features/cv/pages/CvBuilderPage";
import { UserDashboardPage } from "../features/dashboard/pages/UserDashboard";
import { GymDashboardPage } from "../features/dashboard/pages/GymDashboard";
import { OnboardingPage } from "../features/onboarding/pages/OnboardingPage";
import { StaffSetupPage } from "../features/staff/pages/StaffSetupPage";

export default function App() {
  if (window.location.pathname === "/staff/setup") {
    return <StaffSetupPage />;
  }

  if (window.location.pathname.startsWith("/onboarding/")) {
    return <OnboardingPage />;
  }

  if (window.location.pathname === "/userDashboard") {
    return <UserDashboardPage />;
  }

  if (window.location.pathname === "/gymDashboard") {
    return <GymDashboardPage />;
  }

  if (window.location.pathname === "/trainer/cv-builder") {
    return <CvBuilderPage />;
  }

  return <AuthPage />;
}
