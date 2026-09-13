import { useEffect, useMemo, useState } from "react";
import type { OnboardingResponse } from "@swefton/shared/onboarding";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Warehouse,
} from "lucide-react";
import { AppHeader } from "../../../../components/layout/AppHeader/AppHeader";
import { tokenStorage } from "../../../../core/storage/tokenStorage";
import { authApi } from "../../../auth/api/authApi";
import { dashboardApi } from "../../api/dashboardApi";
import styles from "./UserDashboardPage.module.css";

function fullName(profile: OnboardingResponse["profile"]) {
  return (
    profile.displayName?.trim() ||
    `${profile.firstName} ${profile.lastName}`.trim()
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

interface AvatarProps {
  className: string;
  name: string;
  url: string | null;
  onImageError: () => void;
}

function Avatar({ className, name, url, onImageError }: AvatarProps) {
  return (
    <div className={className}>
      {url ? (
        <img src={url} alt={`${name}'s profile`} onError={onImageError} />
      ) : (
        initials(name)
      )}
    </div>
  );
}

export function UserDashboardPage() {
  const role = useMemo(() => tokenStorage.getRole(), []);
  const [dashboard, setDashboard] = useState<OnboardingResponse | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(role === "USER");

  useEffect(() => {
    if (role !== "USER") return;
    let active = true;

    void Promise.allSettled([
      dashboardApi.get(),
      dashboardApi.getProfileImage(),
    ])
      .then(([dashboardResult, imageResult]) => {
        if (!active) return;
        if (dashboardResult.status === "rejected") {
          window.location.replace("/onboarding/user");
          return;
        }
        if (!dashboardResult.value.onboardingCompleted) {
          window.location.replace("/onboarding/user");
          return;
        }
        setDashboard(dashboardResult.value);
        if (imageResult.status === "fulfilled") {
          setProfileImageUrl(imageResult.value?.url ?? null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  const signOut = async () => {
    try {
      await authApi.logout();
    } finally {
      tokenStorage.clear();
      window.location.assign("/");
    }
  };

  if (role !== "USER") {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <ShieldCheck aria-hidden="true" />
          <h1>Member dashboard only</h1>
          <p>
            This page requires the <strong>USER</strong> role in your
            access-token claims.
          </p>
          <a href="/">Return to sign in</a>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className={styles.statePage} aria-live="polite">
        <section className={styles.stateCard}>
          <LoaderCircle className={styles.spinner} aria-hidden="true" />
          <h1>Preparing your dashboard</h1>
          <p>Bringing your Swefton space into focus.</p>
        </section>
      </main>
    );
  }

  if (!dashboard) return null;

  const name = fullName(dashboard.profile);
  const location = [dashboard.address.city, dashboard.address.country]
    .filter(Boolean)
    .join(", ");
  const hideBrokenImage = () => setProfileImageUrl(null);

  return (
    <div className={styles.shell}>
      <AppHeader
        context="Member dashboard"
        currentPage="Overview"
        onSignOut={signOut}
      />

      <div className={styles.page}>
        <aside className={styles.sidebar}>
          <span className={styles.sidebarTitle}>Workspace</span>
          <nav className={styles.navigation} aria-label="Dashboard navigation">
            <button className={styles.activeNav} type="button">
              <LayoutDashboard aria-hidden="true" />
              <span>Overview</span>
            </button>
            <button type="button">
              <UserRound aria-hidden="true" />
              <span>Profile</span>
            </button>
            <button type="button">
              <CalendarDays aria-hidden="true" />
              <span>Bookings</span>
            </button>
            <button type="button">
              <MessageSquare aria-hidden="true" />
              <span>Messages</span>
            </button>
            <button type="button">
              <Settings aria-hidden="true" />
              <span>Settings</span>
            </button>
          </nav>

          <div className={styles.sidebarProfile}>
            <Avatar
              className={styles.miniAvatar}
              name={name}
              url={profileImageUrl}
              onImageError={hideBrokenImage}
            />
            <div>
              <strong>{name}</strong>
              <span>Member account</span>
            </div>
          </div>
        </aside>

        <main className={styles.content}>
          <header className={styles.welcome}>
            <div>
              <span className={styles.eyebrow}>Your fitness space</span>
              <h1>Welcome back, {dashboard.profile.firstName}.</h1>
              <p>{location || "Your next move starts here."}</p>
            </div>
            <div className={styles.roleBadge}>
              <ShieldCheck aria-hidden="true" />
              <span>Member</span>
            </div>
          </header>

          <section className={styles.heroCard}>
            <div className={styles.heroContent}>
              <span className={styles.heroLabel}>
                <Sparkles aria-hidden="true" /> Made for your momentum
              </span>
              <h2>Build a stronger version of you.</h2>
              <p>
                Find the right place and the right support for every stage of
                your fitness journey.
              </p>
            </div>
            <div className={styles.heroProfile}>
              <Avatar
                className={styles.heroAvatar}
                name={name}
                url={profileImageUrl}
                onImageError={hideBrokenImage}
              />
              <div>
                <span>Your profile</span>
                <strong>{name}</strong>
                <small>
                  <CheckCircle2 aria-hidden="true" /> Ready to go
                </small>
              </div>
            </div>
          </section>

          <section
            className={styles.discoverySection}
            aria-labelledby="discovery-title"
          >
            <div className={styles.discoveryHeading}>
              <div>
                <span className={styles.eyebrow}>Explore your options</span>
                <h2 id="discovery-title">What are you looking for?</h2>
              </div>
              <p>Start with a coach, a place to train, or both.</p>
            </div>
            <div className={styles.searchGrid}>
              <article className={styles.searchCard}>
                <div className={styles.cardIcon}>
                  <Dumbbell aria-hidden="true" />
                </div>
                <span className={styles.cardLabel}>Personal coaching</span>
                <h2>Find a trainer</h2>
                <p>
                  Explore professionals who match your pace, goals, and training
                  style.
                </p>
                <div className={styles.cardMeta}>
                  <span>
                    <Sparkles aria-hidden="true" /> Goal-based matches
                  </span>
                  <span>
                    <MapPin aria-hidden="true" /> Near you
                  </span>
                </div>
                <button type="button" className={styles.searchButton}>
                  <Search aria-hidden="true" /> <span>Search trainers</span>
                  <ArrowUpRight aria-hidden="true" />
                </button>
              </article>

              <article className={styles.searchCard}>
                <div className={styles.cardIcon}>
                  <Warehouse aria-hidden="true" />
                </div>
                <span className={styles.cardLabel}>Places near you</span>
                <h2>Find a gym</h2>
                <p>
                  Discover fitness spaces built around how and where you want to
                  train.
                </p>
                <div className={styles.cardMeta}>
                  <span>
                    <MapPin aria-hidden="true" /> Nearby locations
                  </span>
                  <span>
                    <Warehouse aria-hidden="true" /> Flexible spaces
                  </span>
                </div>
                <button type="button" className={styles.searchButton}>
                  <Search aria-hidden="true" /> <span>Search gyms</span>
                  <ArrowUpRight aria-hidden="true" />
                </button>
              </article>
            </div>
          </section>

          <section className={styles.profilePanel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.eyebrow}>Profile snapshot</span>
                <h2>Your details</h2>
              </div>
              <span className={styles.complete}>
                <CheckCircle2 aria-hidden="true" /> Onboarding complete
              </span>
            </div>
            <div className={styles.profileRow}>
              <Avatar
                className={styles.avatar}
                name={name}
                url={profileImageUrl}
                onImageError={hideBrokenImage}
              />
              <div className={styles.profileName}>
                <strong>{name}</strong>
                <span>Member</span>
              </div>
              <div className={styles.profileDetail}>
                <MapPin aria-hidden="true" />
                <div>
                  <span>Location</span>
                  <strong>{location || "Not set"}</strong>
                </div>
              </div>
              <div className={styles.profileDetail}>
                <Bell aria-hidden="true" />
                <div>
                  <span>Email updates</span>
                  <strong>
                    {dashboard.preferences.emailNotifications
                      ? "Enabled"
                      : "Disabled"}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
