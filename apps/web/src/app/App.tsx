import { AuthPage } from "../features/auth/pages/AuthPage";
import { UserDashboardPage } from "../features/dashboard/pages/UserDashboard";
import { OnboardingPage } from "../features/onboarding/pages/OnboardingPage";

export default function App() {
  if (window.location.pathname.startsWith("/onboarding/")) {
    return <OnboardingPage />;
  }

  if (window.location.pathname === "/userDashboard") {
    return <UserDashboardPage />;
  }

  return <AuthPage />;
}
