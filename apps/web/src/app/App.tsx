import { AuthPage } from "../features/auth/pages/AuthPage";
import { CvBuilderPage } from "../features/cv/pages/CvBuilderPage";
import { UserDashboardPage } from "../features/dashboard/pages/UserDashboard";
import { OnboardingPage } from "../features/onboarding/pages/OnboardingPage";

export default function App() {
  if (window.location.pathname.startsWith("/onboarding/")) {
    return <OnboardingPage />;
  }

  if (window.location.pathname === "/userDashboard") {
    return <UserDashboardPage />;
  }

  if (window.location.pathname === "/trainer/cv-builder") {
    return <CvBuilderPage />;
  }

  return <AuthPage />;
}
