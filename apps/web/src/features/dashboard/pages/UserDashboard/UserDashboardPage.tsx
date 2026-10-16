import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ImageResponse,
  OnboardingResponse,
  TrainerDocumentResponse,
} from "@swefton/shared/onboarding";
import {
  ArrowUpRight,
  Award,
  Bell,
  BadgeCheck,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Download,
  Eye,
  FileText,
  Images,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MapPinned,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { AppHeader } from "../../../../components/layout/AppHeader/AppHeader";
import { PasswordField } from "../../../../components/ui/PasswordField";
import { getApiErrorMessage } from "../../../../core/http/getApiErrorMessage";
import { tokenStorage } from "../../../../core/storage/tokenStorage";
import { authApi } from "../../../auth/api/authApi";
import { FacilityLocationPicker, type LocationFields } from "../../../location/components/FacilityLocationPicker/FacilityLocationPicker";
import { dashboardApi } from "../../api/dashboardApi";
import { AdminDashboard } from "../AdminDashboard";
import { GymDiscovery } from "./GymDiscovery";
import { TrainerDiscovery } from "./TrainerDiscovery";
import { TrainerPackagesPanel } from "./TrainerPackagesPanel";
import { MemberMemberships } from "./MemberMemberships";
import { SocialFeed } from "../../../feed/components/SocialFeed";
import styles from "./UserDashboardPage.module.css";

const MAX_PROFILE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

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

type MemberSection = "overview" | "gyms" | "trainers" | "memberships" | "settings";

function MemberNavigation({
  current,
  onNavigate,
}: {
  current: MemberSection;
  onNavigate: (section: MemberSection) => void;
}) {
  const item = (section: MemberSection, label: string, icon: React.ReactNode) => (
    <button
      className={current === section ? styles.activeNav : undefined}
      type="button"
      onClick={() => onNavigate(section)}
      aria-current={current === section ? "page" : undefined}
    >
      {icon}<span>{label}</span>
    </button>
  );

  return (
    <nav className={styles.navigation} aria-label="Member navigation">
      {item("overview", "Overview", <LayoutDashboard aria-hidden="true" />)}
      <span className={styles.navGroupLabel}>Discover</span>
      {item("gyms", "Gyms", <MapPinned aria-hidden="true" />)}
      {item("trainers", "Trainers", <Dumbbell aria-hidden="true" />)}
      {item("memberships", "Memberships", <BadgeCheck aria-hidden="true" />)}
      <span className={styles.navGroupLabel}>Account</span>
      {item("settings", "Settings", <Settings aria-hidden="true" />)}
    </nav>
  );
}

function AccountLocationEditor({
  address,
  onUpdated,
}: {
  address: OnboardingResponse["address"];
  onUpdated: (address: OnboardingResponse["address"]) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const saveLocation = async (location: LocationFields) => {
    if (location.latitude === undefined || location.longitude === undefined) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await dashboardApi.updateLocation({
        addressLine: location.addressLine,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      onUpdated(updated);
      setMessage("Location updated successfully.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "We could not update your location."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.accountLocationEditor}>
      <div>
        <span className={styles.eyebrow}>Saved location</span>
        <strong>{[address.addressLine, address.city, address.country].filter(Boolean).join(", ") || "No location saved"}</strong>
        <small>Search the map, place the pin, or use your device’s current location.</small>
      </div>
      <FacilityLocationPicker
        kind="home"
        tone="dark"
        value={address}
        onChange={(location) => void saveLocation(location)}
        disabled={saving}
      />
      {(saving || message || error) && (
        <p className={error ? styles.locationEditorError : styles.locationEditorMessage} role={error ? "alert" : "status"}>
          {saving && <LoaderCircle className={styles.spinner} aria-hidden="true" />}
          {error || (saving ? "Saving your location…" : message)}
        </p>
      )}
    </div>
  );
}

function LocationSettingsPage({
  accountType,
  address,
  onUpdated,
}: {
  accountType: "Member" | "Trainer";
  address: OnboardingResponse["address"];
  onUpdated: (address: OnboardingResponse["address"]) => void;
}) {
  const [openSection, setOpenSection] = useState<"location" | "password" | null>(null);
  const toggleSection = (section: "location" | "password") => {
    setOpenSection((current) => current === section ? null : section);
  };

  return (
    <>
      <header className={styles.welcome}>
        <div>
          <span className={styles.eyebrow}>{accountType} settings</span>
          <h1>Location settings</h1>
          <p>Control the saved location used for nearby gyms and your profile.</p>
        </div>
        <div className={styles.roleBadge}><Settings aria-hidden="true" /><span>Settings</span></div>
      </header>
      <section className={`${styles.profilePanel} ${styles.settingsAccordion}`}>
        <button
          className={styles.settingsAccordionHeader}
          type="button"
          aria-expanded={openSection === "location"}
          aria-controls="location-settings-content"
          onClick={() => toggleSection("location")}
        >
          <span className={styles.settingsAccordionIcon}><MapPinned aria-hidden="true" /></span>
          <span className={styles.settingsAccordionCopy}>
            <span className={styles.eyebrow}>Location</span>
            <strong>Edit your saved location</strong>
            <small>Update the location used for nearby gyms and your profile.</small>
          </span>
          <ChevronDown className={styles.settingsChevron} aria-hidden="true" />
        </button>
        <div id="location-settings-content" className={styles.settingsAccordionContent} data-open={openSection === "location"}>
          <div><AccountLocationEditor address={address} onUpdated={onUpdated} /></div>
        </div>
      </section>
      <PasswordSettings open={openSection === "password"} onToggle={() => toggleSection("password")} />
    </>
  );
}

function PasswordSettings({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "We could not change your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`${styles.profilePanel} ${styles.settingsAccordion}`}>
      <button
        className={styles.settingsAccordionHeader}
        type="button"
        aria-expanded={open}
        aria-controls="password-settings-content"
        onClick={onToggle}
      >
        <span className={styles.settingsAccordionIcon}><LockKeyhole aria-hidden="true" /></span>
        <span className={styles.settingsAccordionCopy}>
          <span className={styles.eyebrow}>Security</span>
          <strong>Change password</strong>
          <small>Keep your account protected with a secure password.</small>
        </span>
        <ChevronDown className={styles.settingsChevron} aria-hidden="true" />
      </button>
      <div id="password-settings-content" className={styles.settingsAccordionContent} data-open={open}>
        <div>
          <form className={styles.passwordForm} onSubmit={(event) => void submit(event)}>
            <p>Enter your current password, then choose a new password with at least 8 characters.</p>
            <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            <div className={styles.passwordGrid}>
              <PasswordField label="New password" name="newPassword" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </div>
            {(message || error) && <p className={error ? styles.locationEditorError : styles.locationEditorMessage} role={error ? "alert" : "status"}>{error || message}</p>}
            <button className={styles.passwordButton} type="submit" disabled={saving}>
              {saving ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              <span>{saving ? "Saving…" : "Update password"}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

interface RoleDashboardProps {
  dashboard: OnboardingResponse;
  profileImageUrl: string | null;
  images: ImageResponse[];
  onProfileImageError: () => void;
  onProfileImageChange: (files: FileList | null) => void;
  profileUploading: boolean;
  profileUploadMessage: string | null;
  onLocationUpdated: (address: OnboardingResponse["address"]) => void;
  onSignOut: () => void;
}

interface CameraDialogProps {
  busy: boolean;
  open: boolean;
  onCapture: (file: File) => Promise<boolean>;
  onClose: () => void;
}

function CameraDialog({ busy, open, onCapture, onClose }: CameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const stopCamera = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    if (!window.isSecureContext) {
      queueMicrotask(() => {
        if (active) {
          setCameraError(
            "Live camera access requires HTTPS or localhost. Open Swefton securely, or take/choose a photo below.",
          );
        }
      });
      return stopCamera;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => {
        if (active) {
          setCameraError(
            "Live camera access is not supported by this browser. Take or choose a photo below.",
          );
        }
      });
      return stopCamera;
    }

    const cameraErrorMessage = async (error: unknown) => {
      if (!(error instanceof DOMException)) {
        return "The camera could not start. Check your camera and try again.";
      }

      switch (error.name) {
        case "NotAllowedError":
        case "SecurityError":
          return "Camera permission is off. Enable it in your browser's site settings, then retry.";
        case "NotFoundError":
        case "DevicesNotFoundError":
          return "No camera was found on this device. Take or choose a photo below.";
        case "NotReadableError":
        case "TrackStartError": {
          const devices = await navigator.mediaDevices
            .enumerateDevices()
            .catch(() => []);
          if (!devices.some((device) => device.kind === "videoinput")) {
            return "Your browser is not detecting a camera. Enable or connect a webcam, then retry.";
          }
          return "Your camera is being used by another app. Close it there, then retry.";
        }
        case "OverconstrainedError":
        case "ConstraintNotSatisfiedError":
          return "This camera does not support the requested mode. Retry or choose a photo below.";
        default:
          return "The camera could not start. Check your browser camera settings and retry.";
      }
    };

    const startCamera = async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          });
        } catch (error) {
          if (
            error instanceof DOMException &&
            (error.name === "OverconstrainedError" ||
              error.name === "ConstraintNotSatisfiedError" ||
              error.name === "NotReadableError" ||
              error.name === "TrackStartError")
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          } else {
            throw error;
          }
        }

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {
            // The video element will retry through autoplay once metadata is ready.
          });
        }
      } catch (error) {
        const message = await cameraErrorMessage(error);
        if (active) setCameraError(message);
      }
    };

    // Deferring startup prevents React Strict Mode's development-only effect
    // replay from opening the same webcam twice at the same time.
    const startTimer = window.setTimeout(() => {
      void startCamera();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(startTimer);
      stopCamera();
    };
  }, [cameraAttempt, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setCameraError(null);
        setCameraReady(false);
        onClose();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose, open]);

  if (!open) return null;

  const closeCamera = () => {
    setCameraError(null);
    setCameraReady(false);
    onClose();
  };

  const retryCamera = () => {
    setCameraError(null);
    setCameraReady(false);
    setCameraAttempt((attempt) => attempt + 1);
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setCameraError("We could not capture that photo. Please try again.");
      return;
    }

    const saved = await onCapture(
      new File([blob], `moment-${Date.now()}.jpg`, { type: "image/jpeg" }),
    );
    if (saved) closeCamera();
  };

  return (
    <div className={styles.cameraBackdrop} role="presentation" onMouseDown={() => !busy && closeCamera()}>
      <section
        className={styles.cameraDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.cameraHeading}>
          <div>
            <span className={styles.eyebrow}>New gallery moment</span>
            <h2 id="camera-title">Take a photo</h2>
          </div>
          <button type="button" onClick={closeCamera} disabled={busy} aria-label="Close camera">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className={styles.cameraPreview}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onCanPlay={() => setCameraReady(true)}
          />
          {!cameraReady && !cameraError && (
            <div className={styles.cameraLoading}>
              <LoaderCircle className={styles.spinner} aria-hidden="true" />
              <span>Starting your camera…</span>
            </div>
          )}
          {cameraError && (
            <div className={styles.cameraLoading} role="status">
              <Camera aria-hidden="true" />
              <span>{cameraError}</span>
              {window.isSecureContext && (
                <button className={styles.cameraRetry} type="button" onClick={retryCamera}>
                  Retry camera
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.cameraActions}>
          <label className={styles.cameraFallbackButton}>
            <Images aria-hidden="true" />
            <span>Take or choose photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onCapture(file).then((saved) => saved && closeCamera());
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" onClick={() => void takePhoto()} disabled={!cameraReady || busy}>
            {busy ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : <Camera aria-hidden="true" />}
            {busy ? "Saving…" : "Take photo"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TrainerDashboard({
  dashboard,
  profileImageUrl,
  images,
  onProfileImageError,
  onProfileImageChange,
  profileUploading,
  profileUploadMessage,
  onLocationUpdated,
  onSignOut,
}: RoleDashboardProps) {
  const [gallery, setGallery] = useState(() =>
    images.filter((image) => image.type === "GALLERY"),
  );
  const [trainerSection, setTrainerSection] = useState<"overview" | "packages" | "settings">("overview");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [cv, setCv] = useState<TrainerDocumentResponse | null>(null);
  const [licence, setLicence] = useState<TrainerDocumentResponse | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [cvMessage, setCvMessage] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{
    document: TrainerDocumentResponse;
    url: string;
  } | null>(null);
  const name = fullName(dashboard.profile);
  const location = [dashboard.address.city, dashboard.address.country]
    .filter(Boolean)
    .join(", ");
  const galleryPreview = useMemo(
    () =>
      [...gallery]
        .sort(
          (left, right) =>
            Date.parse(right.createdAt) - Date.parse(left.createdAt),
        )
        .slice(0, 5),
    [gallery],
  );

  useEffect(() => {
    let active = true;
    void dashboardApi
      .getTrainerDocuments()
      .then((documents) => {
        if (!active) return;
        setCv(documents.find((document) => document.type === "CV") ?? null);
        setLicence(
          documents.find(
            (document) =>
              document.type === "LICENCE" || document.type === "LICENSE",
          ) ?? null,
        );
      })
      .catch(() => {
        if (active) setCvMessage("Your documents could not be loaded.");
      })
      .finally(() => {
        if (active) setCvLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!documentPreview) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDocumentPreview(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      URL.revokeObjectURL(documentPreview.url);
    };
  }, [documentPreview]);

  const previewDocument = async (document: TrainerDocumentResponse) => {
    setCvMessage(null);
    setPreviewingId(document.id);
    try {
      const blob = await dashboardApi.downloadTrainerDocument(document.id);
      const url = URL.createObjectURL(blob);
      setDocumentPreview({ document, url });
    } catch {
      setCvMessage(`We could not preview ${document.fileName}. Please try again.`);
    } finally {
      setPreviewingId(null);
    }
  };

  const downloadDocument = async (document: TrainerDocumentResponse) => {
    setCvMessage(null);
    setDownloadingId(document.id);
    try {
      const blob = await dashboardApi.downloadTrainerDocument(document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setCvMessage(`We could not download ${document.fileName}. Please try again.`);
    } finally {
      setDownloadingId(null);
    }
  };

  const uploadGallery = async (files: FileList | File[] | null) => {
    if (!files?.length) return false;
    const selected = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!selected.length) {
      setUploadMessage("Choose an image file to add to your gallery.");
      return false;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      const uploaded = await Promise.all(
        selected.map((file, index) =>
          dashboardApi.uploadImage(file, "GALLERY", gallery.length + index),
        ),
      );
      setGallery((current) => [...current, ...uploaded]);
      setUploadMessage(
        `${uploaded.length} ${uploaded.length === 1 ? "photo" : "photos"} added successfully.`,
      );
      return true;
    } catch {
      setUploadMessage("We could not upload that photo. Please try again.");
      return false;
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`${styles.shell} ${styles.trainerShell}`}>
      <AppHeader
        context="Trainer studio"
        currentPage={trainerSection === "settings" ? "Settings" : trainerSection === "packages" ? "Packages & sales" : "Overview"}
        onSignOut={onSignOut}
      />

      <div className={styles.page}>
        <aside className={styles.sidebar}>
          <span className={styles.sidebarTitle}>Your business</span>
          <nav className={styles.navigation} aria-label="Trainer navigation">
            <button className={trainerSection === "overview" ? styles.activeNav : undefined} type="button" onClick={() => setTrainerSection("overview")}>
              <LayoutDashboard aria-hidden="true" /> <span>Studio</span>
            </button>
            <button type="button">
              <CalendarDays aria-hidden="true" /> <span>Schedule</span>
            </button>
            <button type="button">
              <UsersRound aria-hidden="true" /> <span>Clients</span>
            </button>
            <button className={trainerSection === "packages" ? styles.activeNav : undefined} type="button" onClick={() => setTrainerSection("packages")}>
              <Dumbbell aria-hidden="true" /> <span>Packages & sales</span>
            </button>
            <button type="button">
              <Images aria-hidden="true" /> <span>Gallery</span>
            </button>
            <button type="button">
              <Megaphone aria-hidden="true" /> <span>Promotions</span>
            </button>
            <button type="button" onClick={() => window.location.assign('/trainer/cv-builder')}>
              <FileText aria-hidden="true" /> <span>CV Builder</span>
            </button>
            <button className={trainerSection === "settings" ? styles.activeNav : undefined} type="button" onClick={() => setTrainerSection("settings")}>
              <Settings aria-hidden="true" /> <span>Settings</span>
            </button>
          </nav>

          <div className={styles.sidebarProfile}>
            <Avatar
              className={styles.miniAvatar}
              name={name}
              url={profileImageUrl}
              onImageError={onProfileImageError}
            />
            <div>
              <strong>{name}</strong>
              <span>Trainer account</span>
            </div>
          </div>
        </aside>

        <main className={`${styles.content} ${styles.trainerContent}`}>
          {trainerSection === "settings" ? (
            <LocationSettingsPage accountType="Trainer" address={dashboard.address} onUpdated={onLocationUpdated} />
          ) : trainerSection === "packages" ? (
            <TrainerPackagesPanel />
          ) : (
          <>
          <header className={styles.trainerWelcome}>
            <div>
              <span className={styles.eyebrow}>Trainer command center</span>
              <h1>Make an impact, {dashboard.profile.firstName}.</h1>
              <p>
                Manage your presence, inspire new clients, and keep your week
                moving.
              </p>
            </div>
            <button
              className={styles.notificationButton}
              type="button"
              onClick={() => setHasUnread(false)}
              aria-label="Open notifications"
            >
              <Bell aria-hidden="true" />
              {hasUnread && <span aria-label="New notifications" />}
            </button>
          </header>

          <section className={styles.trainerHero}>
            <div className={styles.trainerIdentity}>
              <div className={styles.editableProfileImage}>
                <Avatar className={styles.trainerAvatar} name={name} url={profileImageUrl} onImageError={onProfileImageError} />
                <label className={styles.profileImageEdit} aria-label="Edit profile image">
                  {profileUploading ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={profileUploading} onChange={(event) => { onProfileImageChange(event.target.files); event.target.value = ""; }} />
                </label>
              </div>
              <div>
                <span className={styles.liveBadge}>
                  <span /> Profile live
                </span>
                <h2>{name}</h2>
                <p>
                  {dashboard.profile.bio ||
                    "Helping people build strength, confidence, and lasting habits."}
                </p>
                <small>
                  <MapPin aria-hidden="true" /> {location || "Remote coaching"}
                </small>
                <label className={styles.profilePhotoButton}>
                  {profileUploading ? (
                    <LoaderCircle className={styles.spinner} aria-hidden="true" />
                  ) : (
                    <Camera aria-hidden="true" />
                  )}
                  <span>{profileUploading ? "Saving photo…" : "Change profile photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={profileUploading}
                    onChange={(event) => {
                      onProfileImageChange(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                {profileUploadMessage && (
                  <small className={styles.profileUploadMessage} role="status">
                    {profileUploadMessage}
                  </small>
                )}
              </div>
            </div>
            <div className={styles.trainerStats}>
              <div>
                <strong>{dashboard.profile.experience ?? 0}</strong>
                <span>Years coaching</span>
              </div>
              <div>
                <strong>{gallery.length}</strong>
                <span>Gallery posts</span>
              </div>
              <div>
                <strong>
                  {dashboard.profile.price ? `€${dashboard.profile.price}` : "—"}
                </strong>
                <span>Session rate</span>
              </div>
            </div>
          </section>

          <SocialFeed mine showFilters={false} />

          <section className={styles.professionalDocuments} aria-labelledby="trainer-documents-title">
            <div className={styles.documentsHeading}>
              <div>
                <span className={styles.eyebrow}>Professional profile</span>
                <h2 id="trainer-documents-title">Your documents</h2>
              </div>
              {cvMessage && <small role="status">{cvMessage}</small>}
            </div>

            <div className={styles.documentsGrid}>
              <article className={styles.cvProfileCard}>
                <span className={styles.cvProfileIcon}><FileText aria-hidden="true" /></span>
                <div className={styles.cvProfileCopy}>
                  <span className={styles.documentType}>Trainer CV</span>
                  <h3>{cvLoading ? "Loading your CV…" : cv ? cv.fileName : "Add your trainer CV"}</h3>
                  <p>
                    {cv
                      ? `${(cv.size / 1024).toFixed(0)} KB · Added ${new Date(cv.uploadedAt).toLocaleDateString()}`
                      : "Create or upload a CV to complete your professional profile."}
                  </p>
                </div>
                <div className={styles.cvProfileActions}>
                  {cv ? (
                    <>
                      <button type="button" onClick={() => void previewDocument(cv)} disabled={previewingId === cv.id}>
                        {previewingId === cv.id ? <LoaderCircle className={styles.spinner} /> : <Eye aria-hidden="true" />}
                        Preview
                      </button>
                      <button type="button" onClick={() => void downloadDocument(cv)} disabled={downloadingId === cv.id}>
                        {downloadingId === cv.id ? <LoaderCircle className={styles.spinner} /> : <Download aria-hidden="true" />}
                        Download
                      </button>
                    </>
                  ) : !cvLoading ? (
                    <a href="/trainer/cv-builder"><Plus aria-hidden="true" /> Create CV</a>
                  ) : null}
                </div>
              </article>

              <article className={styles.cvProfileCard}>
                <span className={`${styles.cvProfileIcon} ${styles.licenceIcon}`}><Award aria-hidden="true" /></span>
                <div className={styles.cvProfileCopy}>
                  <span className={styles.documentType}>Professional licence</span>
                  <h3>{cvLoading ? "Loading your licence…" : licence ? licence.fileName : "No licence uploaded"}</h3>
                  <p>
                    {licence
                      ? `${(licence.size / 1024).toFixed(0)} KB · Added ${new Date(licence.uploadedAt).toLocaleDateString()}`
                      : "Your verification licence will appear here after upload."}
                  </p>
                </div>
                <div className={styles.cvProfileActions}>
                  {licence && (
                    <>
                      <button type="button" onClick={() => void previewDocument(licence)} disabled={previewingId === licence.id}>
                        {previewingId === licence.id ? <LoaderCircle className={styles.spinner} /> : <Eye aria-hidden="true" />}
                        Preview
                      </button>
                      <button type="button" onClick={() => void downloadDocument(licence)} disabled={downloadingId === licence.id}>
                        {downloadingId === licence.id ? <LoaderCircle className={styles.spinner} /> : <Download aria-hidden="true" />}
                        Download
                      </button>
                    </>
                  )}
                </div>
              </article>
            </div>
          </section>

          <div className={styles.trainerGrid}>
            <div className={styles.trainerMainColumn}>
              <section className={styles.galleryPanel}>
                <div className={styles.panelHeading}>
                  <div>
                    <span className={styles.eyebrow}>Show your work</span>
                    <h2>Training gallery</h2>
                  </div>
                  <label className={styles.uploadButton}>
                    {uploading ? (
                      <LoaderCircle className={styles.spinner} aria-hidden="true" />
                    ) : (
                      <Plus aria-hidden="true" />
                    )}
                    <span>{uploading ? "Uploading" : "Add photos"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading}
                      onChange={(event) => {
                        void uploadGallery(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {gallery.length ? (
                  <div className={styles.galleryGrid}>
                    {galleryPreview.map((image) => (
                      <figure key={image.id}>
                        <img
                          src={image.url}
                          alt={image.originalName || "Training session"}
                          loading="lazy"
                          decoding="async"
                        />
                      </figure>
                    ))}
                    <button
                      className={styles.galleryAddTile}
                      type="button"
                      disabled={uploading}
                      onClick={() => setCameraOpen(true)}
                    >
                      <Camera aria-hidden="true" />
                      <span>Add a moment</span>
                    </button>
                  </div>
                ) : (
                  <div className={styles.emptyGallery}>
                    <span className={styles.uploadIcon}>
                      <UploadCloud aria-hidden="true" />
                    </span>
                    <strong>Your best work deserves a spotlight</strong>
                    <span>
                      Add client-safe workouts, transformations, or coaching
                      moments to build trust.
                    </span>
                    <small>JPG, PNG or WEBP</small>
                    <div className={styles.emptyGalleryActions}>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => setCameraOpen(true)}
                      >
                        <Camera aria-hidden="true" />
                        <span>Add a moment</span>
                      </button>
                      <label>
                        <Images aria-hidden="true" />
                        <span>Choose photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploading}
                          onChange={(event) => {
                            void uploadGallery(event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
                {uploadMessage && (
                  <p className={styles.uploadMessage} role="status">
                    {uploadMessage}
                  </p>
                )}
              </section>

              <CameraDialog
                busy={uploading}
                open={cameraOpen}
                onCapture={(file) => uploadGallery([file])}
                onClose={() => setCameraOpen(false)}
              />

              <section className={styles.schedulePanel}>
                <div className={styles.panelHeading}>
                  <div>
                    <span className={styles.eyebrow}>Today</span>
                    <h2>Your schedule</h2>
                  </div>
                  <button type="button" className={styles.textButton}>
                    View calendar <ChevronRight aria-hidden="true" />
                  </button>
                </div>
                <div className={styles.emptySchedule}>
                  <span><CalendarDays aria-hidden="true" /></span>
                  <div>
                    <strong>Your calendar is clear</strong>
                    <p>New sessions and consultations will appear here.</p>
                  </div>
                  <button type="button">Set availability</button>
                </div>
              </section>
            </div>

            <aside className={styles.trainerRail}>
              <section className={styles.promotionCard}>
                <span className={styles.promotionIcon}>
                  <TrendingUp aria-hidden="true" />
                </span>
                <span className={styles.eyebrow}>Grow your reach</span>
                <h2>{promoted ? "Your boost is ready" : "Get discovered faster"}</h2>
                <p>
                  {promoted
                    ? "We’ll notify you when trainer promotion campaigns become available."
                    : "Put your profile in front of members looking for a coach like you."}
                </p>
                <button type="button" onClick={() => setPromoted(true)} disabled={promoted}>
                  <Megaphone aria-hidden="true" />
                  {promoted ? "Interest registered" : "Promote my profile"}
                </button>
              </section>

              <section className={styles.inboxPanel}>
                <div className={styles.railHeading}>
                  <div>
                    <span className={styles.eyebrow}>Inbox</span>
                    <h2>Notifications</h2>
                  </div>
                  <button type="button" aria-label="Notification options">
                    <MoreHorizontal aria-hidden="true" />
                  </button>
                </div>
                <article className={styles.notificationItem}>
                  <span><Sparkles aria-hidden="true" /></span>
                  <div>
                    <strong>Complete your public profile</strong>
                    <p>Add gallery photos to make a stronger first impression.</p>
                    <small>Just now</small>
                  </div>
                </article>
                <article className={styles.notificationItem}>
                  <span><CheckCircle2 aria-hidden="true" /></span>
                  <div>
                    <strong>Trainer profile is live</strong>
                    <p>Members can now discover your coaching profile.</p>
                    <small>Today</small>
                  </div>
                </article>
                <button className={styles.allNotifications} type="button">
                  See all notifications <ArrowUpRight aria-hidden="true" />
                </button>
              </section>
            </aside>
          </div>
          </>
          )}
        </main>
      </div>

      {documentPreview && (
        <div
          className={styles.documentPreviewBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-preview-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDocumentPreview(null);
          }}
        >
          <section className={styles.documentPreviewModal}>
            <header>
              <div>
                <span className={styles.eyebrow}>Document preview</span>
                <h2 id="document-preview-title">{documentPreview.document.fileName}</h2>
              </div>
              <button type="button" onClick={() => setDocumentPreview(null)} aria-label="Close document preview">
                <X aria-hidden="true" />
              </button>
            </header>

            <div className={styles.documentPreviewBody}>
              {documentPreview.document.contentType === "application/pdf" ? (
                <iframe src={documentPreview.url} title={`Preview of ${documentPreview.document.fileName}`} />
              ) : documentPreview.document.contentType.startsWith("image/") ? (
                <img src={documentPreview.url} alt={`Preview of ${documentPreview.document.fileName}`} />
              ) : (
                <div className={styles.unsupportedPreview}>
                  <FileText aria-hidden="true" />
                  <strong>Preview is not available for this file type</strong>
                  <p>Download the document to open it with an application on your device.</p>
                </div>
              )}
            </div>

            <footer>
              <a href={documentPreview.url} download={documentPreview.document.fileName}>
                <Download aria-hidden="true" /> Download
              </a>
              <button type="button" onClick={() => setDocumentPreview(null)}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export function UserDashboardPage() {
  const role = useMemo(() => tokenStorage.getRole(), []);
  const [dashboard, setDashboard] = useState<OnboardingResponse | null>(null);
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUploadMessage, setProfileUploadMessage] = useState<string | null>(null);
  const [memberSection, setMemberSection] = useState<MemberSection>("overview");
  const [loading, setLoading] = useState(
    role === "USER" || role === "TRAINER" || role === "STAFF",
  );

  useEffect(() => {
    if (role !== "USER" && role !== "TRAINER" && role !== "STAFF") return;
    let active = true;

    void Promise.allSettled([
      dashboardApi.get(),
      dashboardApi.getImages(),
    ])
      .then(([dashboardResult, imagesResult]) => {
        if (!active) return;
        if (dashboardResult.status === "rejected") {
          window.location.replace(
            role === "TRAINER" ? "/onboarding/trainer" : role === "STAFF" ? "/onboarding/staff" : "/onboarding/user",
          );
          return;
        }
        if (!dashboardResult.value.onboardingCompleted) {
          window.location.replace(
            role === "TRAINER" ? "/onboarding/trainer" : role === "STAFF" ? "/onboarding/staff" : "/onboarding/user",
          );
          return;
        }
        setDashboard(dashboardResult.value);
        if (imagesResult.status === "fulfilled") {
          setImages(imagesResult.value);
          setProfileImageUrl(
            imagesResult.value.find((image) => image.type === "PROFILE")?.url ??
              null,
          );
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

  const uploadProfileImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setProfileUploadMessage("Profile images must be 10 MB or smaller.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setProfileUploadMessage("Choose an image file for your profile.");
      return;
    }

    setProfileUploading(true);
    setProfileUploadMessage(null);
    try {
      const uploaded = await dashboardApi.uploadImage(file, "PROFILE", 0);
      setImages((current) => [
        uploaded,
        ...current.filter((image) => image.type !== "PROFILE"),
      ]);
      setProfileImageUrl(uploaded.url);
      setProfileUploadMessage("Profile photo saved.");
    } catch (requestError) {
      setProfileUploadMessage(
        getApiErrorMessage(requestError, "We could not save that photo. Please try again."),
      );
    } finally {
      setProfileUploading(false);
    }
  };

  if (role === "ADMIN") {
    return <AdminDashboard onSignOut={signOut} />;
  }

  if (role !== "USER" && role !== "TRAINER" && role !== "STAFF") {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <ShieldCheck aria-hidden="true" />
          <h1>Dashboard unavailable</h1>
          <p>
            This workspace is currently available to members, trainers, and
            administrators.
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
  const savedCoordinates = typeof dashboard.address.latitude === "number" && typeof dashboard.address.longitude === "number"
    ? { latitude: dashboard.address.latitude, longitude: dashboard.address.longitude }
    : undefined;

  if (role === "TRAINER") {
    return (
      <TrainerDashboard
        dashboard={dashboard}
        profileImageUrl={profileImageUrl}
        images={images}
        onProfileImageError={hideBrokenImage}
        onProfileImageChange={(files) => void uploadProfileImage(files)}
        profileUploading={profileUploading}
        profileUploadMessage={profileUploadMessage}
        onLocationUpdated={(address) => setDashboard((current) => current ? { ...current, address } : current)}
        onSignOut={signOut}
      />
    );
  }

  if (role === "USER" && memberSection === "settings") {
    return (
      <div className={styles.shell}>
        <AppHeader context="Member dashboard" currentPage="Settings" onSignOut={signOut} />
        <div className={styles.page}>
          <aside className={styles.sidebar}>
            <span className={styles.sidebarTitle}>Workspace</span>
            <MemberNavigation current="settings" onNavigate={setMemberSection} />
            <div className={styles.sidebarProfile}>
              <Avatar className={styles.miniAvatar} name={name} url={profileImageUrl} onImageError={hideBrokenImage} />
              <div><strong>{name}</strong><span>Member account</span></div>
            </div>
          </aside>
          <main className={styles.content}>
            <LocationSettingsPage
              accountType="Member"
              address={dashboard.address}
              onUpdated={(address) => setDashboard((current) => current ? { ...current, address } : current)}
            />
          </main>
        </div>
      </div>
    );
  }

  if (role === "USER" && memberSection === "gyms") {
    return (
      <div className={styles.shell}>
        <AppHeader context="Member dashboard" currentPage="Find gyms" onSignOut={signOut} />
        <div className={styles.page}>
          <aside className={styles.sidebar}>
            <span className={styles.sidebarTitle}>Workspace</span>
            <MemberNavigation current="gyms" onNavigate={setMemberSection} />
            <div className={styles.sidebarProfile}>
              <Avatar className={styles.miniAvatar} name={name} url={profileImageUrl} onImageError={hideBrokenImage} />
              <div><strong>{name}</strong><span>Member account</span></div>
            </div>
          </aside>
          <main className={styles.content}>
            <GymDiscovery memberName={name} savedCoordinates={savedCoordinates} onBack={() => setMemberSection("overview")} />
          </main>
        </div>
      </div>
    );
  }

  if (role === "USER" && memberSection === "trainers") {
    return (
      <div className={styles.shell}>
        <AppHeader context="Member dashboard" currentPage="Find trainers" onSignOut={signOut} />
        <div className={styles.page}>
          <aside className={styles.sidebar}>
            <span className={styles.sidebarTitle}>Workspace</span>
            <MemberNavigation current="trainers" onNavigate={setMemberSection} />
            <div className={styles.sidebarProfile}>
              <Avatar className={styles.miniAvatar} name={name} url={profileImageUrl} onImageError={hideBrokenImage} />
              <div><strong>{name}</strong><span>Member account</span></div>
            </div>
          </aside>
          <main className={styles.content}>
            <TrainerDiscovery memberName={name} onBack={() => setMemberSection("overview")} />
          </main>
        </div>
      </div>
    );
  }

  if (role === "USER" && memberSection === "memberships") {
    return (
      <div className={styles.shell}>
        <AppHeader context="Member dashboard" currentPage="My memberships" onSignOut={signOut} />
        <div className={styles.page}>
          <aside className={styles.sidebar}>
            <span className={styles.sidebarTitle}>Workspace</span>
            <MemberNavigation current="memberships" onNavigate={setMemberSection} />
            <div className={styles.sidebarProfile}>
              <Avatar className={styles.miniAvatar} name={name} url={profileImageUrl} onImageError={hideBrokenImage} />
              <div><strong>{name}</strong><span>Member account</span></div>
            </div>
          </aside>
          <main className={styles.content}>
            <MemberMemberships memberName={name} savedCoordinates={savedCoordinates} onFindGyms={() => setMemberSection("gyms")} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <AppHeader
        context={role === "STAFF" ? "Staff dashboard" : "Member dashboard"}
        currentPage="Overview"
        onSignOut={signOut}
      />

      <div className={styles.page}>
        <aside className={styles.sidebar}>
          <span className={styles.sidebarTitle}>Workspace</span>
          {role === "USER" ? (
            <MemberNavigation current="overview" onNavigate={setMemberSection} />
          ) : (
            <nav className={styles.navigation} aria-label="Dashboard navigation">
              <button className={styles.activeNav} type="button"><LayoutDashboard aria-hidden="true" /><span>Overview</span></button>
              <button type="button"><UserRound aria-hidden="true" /><span>Profile</span></button>
              <button type="button"><CalendarDays aria-hidden="true" /><span>Bookings</span></button>
              <button type="button"><MessageSquare aria-hidden="true" /><span>Messages</span></button>
              <button type="button"><Settings aria-hidden="true" /><span>Settings</span></button>
            </nav>
          )}

          <div className={styles.sidebarProfile}>
            <Avatar
              className={styles.miniAvatar}
              name={name}
              url={profileImageUrl}
              onImageError={hideBrokenImage}
            />
            <div>
              <strong>{name}</strong>
              <span>{role === "STAFF" ? "Staff account" : "Member account"}</span>
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
              <div className={styles.editableProfileImage}>
                <Avatar className={styles.heroAvatar} name={name} url={profileImageUrl} onImageError={hideBrokenImage} />
                <label className={styles.profileImageEdit} aria-label="Edit profile image">
                  {profileUploading ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={profileUploading} onChange={(event) => { void uploadProfileImage(event.target.files); event.target.value = ""; }} />
                </label>
              </div>
              <div>
                <span>Your profile</span>
                <strong>{name}</strong>
                <small>
                  <CheckCircle2 aria-hidden="true" /> Ready to go
                </small>
              </div>
            </div>
          </section>

          <SocialFeed />

          <section className={styles.profilePanel}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.eyebrow}>Profile snapshot</span>
                <h2>Your details</h2>
              </div>
              <div className={styles.profilePanelActions}>
                <label className={styles.profilePhotoButton}>
                  {profileUploading ? (
                    <LoaderCircle className={styles.spinner} aria-hidden="true" />
                  ) : (
                    <Camera aria-hidden="true" />
                  )}
                  <span>{profileUploading ? "Saving…" : "Change photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={profileUploading}
                    onChange={(event) => {
                      void uploadProfileImage(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                <span className={styles.complete}>
                  <CheckCircle2 aria-hidden="true" /> Onboarding complete
                </span>
              </div>
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
            {profileUploadMessage && (
              <p className={styles.profileUploadMessage} role="status">
                {profileUploadMessage}
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
