import type { AuthView } from "../../hooks/useAuthFlow";
import logoMark from "../../../../assets/swefton-mark.png";
import { AuthenticatedView } from "../../components/AuthenticatedView";
import { AuthTabs } from "../../components/AuthTabs";
import { BrandPanel } from "../../components/BrandPanel";
import { LoginForm } from "../../components/LoginForm";
import { RegisterForm } from "../../components/RegisterForm";
import { VerifyEmailForm } from "../../components/VerifyEmailForm";
import { useAuthFlow } from "../../hooks/useAuthFlow";
import styles from "./AuthPage.module.css";

const viewClassNames: Record<AuthView, string> = {
  login: styles.loginView,
  register: styles.registerView,
  verify: styles.verifyView,
  authenticated: styles.authenticatedView,
};

export function AuthPage() {
  const auth = useAuthFlow();
  const isVerificationOpen = auth.view === "verify";
  const visibleView = isVerificationOpen ? "login" : auth.view;
  const showTabs = visibleView === "login" || visibleView === "register";

  return (
    <main className={styles.authPage}>
      <BrandPanel />
      <section
        className={`${styles.authPanel} ${
          isVerificationOpen ? styles.authPanelObscured : ""
        }`}
        aria-hidden={isVerificationOpen || undefined}
        inert={isVerificationOpen}
      >
        <header className={styles.mobileBrand}>
          <img src={logoMark} alt="" />
          <span>
            swef<strong>ton</strong>
          </span>
        </header>
        <div className={styles.authPanelInner}>
          {showTabs && (
            <AuthTabs activeView={visibleView} onChange={auth.selectView} />
          )}
          <div
            key={visibleView}
            id={showTabs ? `${visibleView}-panel` : undefined}
            className={`${styles.authView} ${viewClassNames[visibleView]}`}
            role={showTabs ? "tabpanel" : undefined}
            aria-labelledby={showTabs ? `${visibleView}-tab` : undefined}
          >
            {visibleView === "login" && (
              <LoginForm
                error={isVerificationOpen ? "" : auth.error}
                notice={isVerificationOpen ? "" : auth.notice}
                pending={auth.pending}
                onGoogleAuthenticated={auth.completeLogin}
                onSubmit={auth.login}
              />
            )}
            {visibleView === "register" && (
              <RegisterForm
                error={auth.error}
                notice={auth.notice}
                pending={auth.pending}
                onGoogleAuthenticated={auth.completeRegistration}
                onSubmit={auth.register}
              />
            )}
            {visibleView === "authenticated" && (
              <AuthenticatedView
                pending={auth.pending}
                onLogout={auth.logout}
              />
            )}
          </div>
        </div>
        <footer className={styles.authFooter}>
          © {new Date().getFullYear()} Swefton · Built for better
        </footer>
      </section>

      {isVerificationOpen && (
        <VerifyEmailForm
          email={auth.verificationEmail}
          error={auth.error}
          notice={auth.notice}
          pending={auth.pending}
          onBack={() => auth.selectView("login")}
          onResend={auth.resendCode}
          onSubmit={auth.verifyEmail}
        />
      )}
    </main>
  );
}
