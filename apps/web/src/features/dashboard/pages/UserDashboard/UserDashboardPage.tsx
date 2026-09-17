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
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Download,
  Eye,
  FileText,
  Images,
  Inbox,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  UserRound,
  UsersRound,
  Warehouse,
  X,
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

interface RoleDashboardProps {
  dashboard: OnboardingResponse;
  profileImageUrl: string | null;
  images: ImageResponse[];
  onProfileImageError: () => void;
  onProfileImageChange: (files: FileList | null) => void;
  profileUploading: boolean;
  profileUploadMessage: string | null;
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
            return "Windows is not detecting a camera. Enable or connect a webcam, then retry.";
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
  onSignOut,
}: RoleDashboardProps) {
  const [gallery, setGallery] = useState(() =>
    images.filter((image) => image.type === "GALLERY"),
  );
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
        currentPage="Overview"
        onSignOut={onSignOut}
      />

      <div className={styles.page}>
        <aside className={styles.sidebar}>
          <span className={styles.sidebarTitle}>Your business</span>
          <nav className={styles.navigation} aria-label="Trainer navigation">
            <button className={styles.activeNav} type="button">
              <LayoutDashboard aria-hidden="true" /> <span>Studio</span>
            </button>
            <button type="button">
              <CalendarDays aria-hidden="true" /> <span>Schedule</span>
            </button>
            <button type="button">
              <UsersRound aria-hidden="true" /> <span>Clients</span>
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
            <button type="button">
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
              <Avatar
                className={styles.trainerAvatar}
                name={name}
                url={profileImageUrl}
                onImageError={onProfileImageError}
              />
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
                    {gallery.map((image) => (
                      <figure key={image.id}>
                        <img src={image.url} alt={image.originalName || "Training session"} />
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
                  <label className={styles.emptyGallery}>
                    <span className={styles.uploadIcon}>
                      <UploadCloud aria-hidden="true" />
                    </span>
                    <strong>Your best work deserves a spotlight</strong>
                    <span>
                      Add client-safe workouts, transformations, or coaching
                      moments to build trust.
                    </span>
                    <small>JPG, PNG or WEBP</small>
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

function AdminDashboard({ onSignOut }: { onSignOut: () => void }) {
  const cards = [
    { icon: UsersRound, value: "—", label: "Active members", detail: "Platform community" },
    { icon: ShieldCheck, value: "—", label: "Trainer reviews", detail: "Verification queue" },
    { icon: Warehouse, value: "—", label: "Facilities", detail: "Active businesses" },
    { icon: Inbox, value: "—", label: "Open reports", detail: "Needs attention" },
  ];

  return (
    <div className={`${styles.shell} ${styles.adminShell}`}>
      <AppHeader context="Admin console" currentPage="Overview" onSignOut={onSignOut} />
      <main className={`${styles.content} ${styles.adminContent}`}>
        <header className={styles.trainerWelcome}>
          <div>
            <span className={styles.eyebrow}>Platform operations</span>
            <h1>Welcome to Swefton control.</h1>
            <p>Monitor the community, review professionals, and keep the platform healthy.</p>
          </div>
          <span className={styles.roleBadge}><ShieldCheck aria-hidden="true" /> Administrator</span>
        </header>
        <section className={styles.adminGrid}>
          {cards.map(({ icon: Icon, value, label, detail }) => (
            <article key={label}>
              <span><Icon aria-hidden="true" /></span>
              <strong>{value}</strong>
              <h2>{label}</h2>
              <p>{detail}</p>
            </article>
          ))}
        </section>
        <section className={styles.adminPanel}>
          <span><ShieldCheck aria-hidden="true" /></span>
          <div>
            <span className={styles.eyebrow}>Everything in one place</span>
            <h2>Administration workspace ready</h2>
            <p>Connect platform analytics and moderation endpoints to populate this overview.</p>
          </div>
          <button type="button">Open review queue <ArrowUpRight aria-hidden="true" /></button>
        </section>
      </main>
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
  const [loading, setLoading] = useState(
    role === "USER" || role === "TRAINER",
  );

  useEffect(() => {
    if (role !== "USER" && role !== "TRAINER") return;
    let active = true;

    void Promise.allSettled([
      dashboardApi.get(),
      dashboardApi.getImages(),
    ])
      .then(([dashboardResult, imagesResult]) => {
        if (!active) return;
        if (dashboardResult.status === "rejected") {
          window.location.replace(
            role === "TRAINER" ? "/onboarding/trainer" : "/onboarding/user",
          );
          return;
        }
        if (!dashboardResult.value.onboardingCompleted) {
          window.location.replace(
            role === "TRAINER" ? "/onboarding/trainer" : "/onboarding/user",
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
    } catch {
      setProfileUploadMessage("We could not save that photo. Please try again.");
    } finally {
      setProfileUploading(false);
    }
  };

  if (role === "ADMIN") {
    return <AdminDashboard onSignOut={signOut} />;
  }

  if (role !== "USER" && role !== "TRAINER") {
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
        onSignOut={signOut}
      />
    );
  }

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
