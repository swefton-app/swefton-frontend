import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L, { type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  AccessPassResponse,
  CardPaymentRequest,
  GymDirectoryProfileResponse,
  GymDirectorySummaryResponse,
  MembershipPlanResponse,
} from "@swefton/shared/membership";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  DoorOpen,
  Dumbbell,
  LoaderCircle,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { getApiErrorMessage } from "../../../../core/http/getApiErrorMessage";
import {
  gymMembershipApi,
  type MemberCoordinates,
} from "../../api/gymMembershipApi";
import { SocialFeed } from "../../../feed/components/SocialFeed";
import styles from "./GymDiscovery.module.css";

interface GymDiscoveryProps {
  memberName: string;
  savedCoordinates?: MemberCoordinates;
  onBack: () => void;
}

const priceFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function planPrice(plan: MembershipPlanResponse) {
  if (plan.currency === "EUR")
    return priceFormatter.format(plan.effectivePrice);
  return `${plan.effectivePrice.toFixed(2)} ${plan.currency}`;
}

function regularPlanPrice(plan: MembershipPlanResponse) {
  const amount = plan.offer?.originalPrice ?? plan.price;
  if (plan.currency === "EUR") return priceFormatter.format(amount);
  return `${amount.toFixed(2)} ${plan.currency}`;
}

function durationLabel(months: number) {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  return `${months} ${months === 1 ? "month" : "months"}`;
}

function groupPlansByDuration(plans: MembershipPlanResponse[]) {
  return [...new Set(plans.map((plan) => plan.durationMonths))]
    .sort((a, b) => a - b)
    .map((durationMonths) => ({
      durationMonths,
      plans: plans.filter((plan) => plan.durationMonths === durationMonths),
    }));
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

function Logo({
  gym,
}: {
  gym: Pick<GymDirectorySummaryResponse, "name" | "logoImage">;
}) {
  return (
    <span className={styles.logo}>
      {gym.logoImage ? (
        <img src={gym.logoImage.url} alt={`${gym.name} logo`} />
      ) : (
        <Dumbbell aria-hidden="true" />
      )}
    </span>
  );
}

function GymDirectoryMap({
  gyms,
  coordinates,
  onClose,
  onOpenGym,
}: {
  gyms: GymDirectorySummaryResponse[];
  coordinates?: MemberCoordinates;
  onClose: () => void;
  onOpenGym: (gymId: number) => void;
}) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const validGyms = gyms.filter(
      (gym) => Number.isFinite(gym.latitude) && Number.isFinite(gym.longitude),
    );
    const fallback: [number, number] = coordinates
      ? [coordinates.latitude, coordinates.longitude]
      : [41.3275, 19.8187];
    const map = L.map(mapElementRef.current, { zoomControl: true }).setView(
      fallback,
      coordinates ? 12 : 7,
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const points: L.LatLngExpression[] = [];
    validGyms.forEach((gym) => {
      const markerContent = document.createElement("div");
      markerContent.className = styles.gymMapMarker;

      const logo = gym.logoImage?.url
        ? document.createElement("img")
        : document.createElement("span");
      if (logo instanceof HTMLImageElement) {
        logo.src = gym.logoImage!.url;
        logo.alt = "";
      } else {
        logo.textContent = gym.name.trim().charAt(0).toUpperCase() || "G";
      }
      markerContent.appendChild(logo);

      const name = document.createElement("strong");
      name.textContent = gym.name;
      markerContent.appendChild(name);

      const point: L.LatLngExpression = [gym.latitude, gym.longitude];
      points.push(point);
      const marker = L.marker(point, {
        icon: L.divIcon({
          className: styles.gymMapMarkerHost,
          html: markerContent,
          iconSize: [145, 44],
          iconAnchor: [22, 44],
        }),
        title: gym.name,
      }).addTo(map);

      const address = document.createElement("span");
      address.textContent = gym.formattedAddress;
      marker.bindTooltip(address, { direction: "top", offset: [0, -38] });
      marker.on("click", () => onOpenGym(gym.id));
    });

    if (coordinates) {
      points.push([coordinates.latitude, coordinates.longitude]);
      L.circleMarker([coordinates.latitude, coordinates.longitude], {
        radius: 7,
        color: "#ffffff",
        weight: 3,
        fillColor: "#2d9cff",
        fillOpacity: 1,
      })
        .bindTooltip("Your location")
        .addTo(map);
    }

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [70, 70], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }

    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates, gyms, onOpenGym]);

  return createPortal(
    <div
      className={styles.mapBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.mapDialog} role="dialog" aria-modal="true" aria-labelledby="gym-map-title">
        <header>
          <div>
            <span className={styles.eyebrow}>Registered gyms</span>
            <h2 id="gym-map-title">Find a gym on the map</h2>
            <p>Select a gym marker to open its profile.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close gym map"><X /></button>
        </header>
        <div ref={mapElementRef} className={styles.gymMap} aria-label="Map of registered gyms" />
      </section>
    </div>,
    document.body,
  );
}

export function GymDiscovery({
  memberName,
  savedCoordinates,
  onBack,
}: GymDiscoveryProps) {
  const [coordinates, setCoordinates] = useState<MemberCoordinates | undefined>(
    savedCoordinates,
  );
  const [locationSource, setLocationSource] = useState<
    "saved" | "current" | null
  >(savedCoordinates ? "saved" : null);
  const [query, setQuery] = useState("");
  const [gyms, setGyms] = useState<GymDirectorySummaryResponse[]>([]);
  const [profile, setProfile] = useState<GymDirectoryProfileResponse | null>(
    null,
  );
  const [profileSection, setProfileSection] = useState<"posts" | "plans" | "machines">("posts");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submittingPlanId, setSubmittingPlanId] = useState<number | null>(null);
  const [passBusy, setPassBusy] = useState(false);
  const [pass, setPass] = useState<AccessPassResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] =
    useState<MembershipPlanResponse | null>(null);
  const skipLiveSearch = useRef(true);
  const [payment, setPayment] = useState<CardPaymentRequest>({
    cardholderName: memberName,
    cardNumber: "",
    expiryMonth: new Date().getMonth() + 1,
    expiryYear: new Date().getFullYear() + 1,
    cvc: "",
  });

  const searchGyms = useCallback(
    async (nextCoordinates?: MemberCoordinates, searchQuery = "") => {
      setLoading(true);
      setError("");
      try {
        setGyms(await gymMembershipApi.search(nextCoordinates, searchQuery));
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "We could not find gyms near this location.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void searchGyms(savedCoordinates), 0);
    return () => window.clearTimeout(timer);
  }, [savedCoordinates, searchGyms]);

  useEffect(() => {
    if (skipLiveSearch.current) {
      skipLiveSearch.current = false;
      return;
    }
    const timer = window.setTimeout(
      () => void searchGyms(coordinates, query),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [coordinates, query, searchGyms]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location access is not supported by this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoordinates(next);
        setLocationSource("current");
        setLocating(false);
        void searchGyms(next, query);
      },
      () => {
        setLocating(false);
        setError(
          "Allow location access to calculate how far each gym is from you.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  };

  const openGym = async (gymId: number) => {
    setLoading(true);
    setError("");
    setPass(null);
    try {
      setProfile(await gymMembershipApi.profile(gymId, coordinates));
      setProfileSection("posts");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "We could not open this gym profile."),
      );
    } finally {
      setLoading(false);
    }
  };

  const openGymFromMap = useCallback((gymId: number) => {
    setMapOpen(false);
    void openGym(gymId);
  }, [coordinates]);

  const requestMembership = async () => {
    if (!profile || !selectedPlan) return;
    setSubmittingPlanId(selectedPlan.id);
    setError("");
    try {
      const membership = await gymMembershipApi.request(
        selectedPlan.id,
        payment,
      );
      setProfile((current) => (current ? { ...current, membership } : current));
      setSelectedPlan(null);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "We could not send your membership request.",
        ),
      );
    } finally {
      setSubmittingPlanId(null);
    }
  };

  const refreshProfile = () => {
    if (profile) void openGym(profile.id);
  };

  const createPass = async () => {
    if (!profile?.membership) return;
    setPassBusy(true);
    setError("");
    try {
      const direction = profile.membership.checkedIn ? "EXIT" : "ENTER";
      const nextPass = await gymMembershipApi.createPass(
        profile.membership.id,
        direction,
      );
      const image = await QRCode.toDataURL(nextPass.qrPayload, {
        width: 320,
        margin: 2,
        color: { dark: "#111815", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setPass(nextPass);
      setQrDataUrl(image);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "We could not create an access QR code.",
        ),
      );
    } finally {
      setPassBusy(false);
    }
  };

  const distanceLabel = useMemo(() => {
    if (!profile) return "";
    if (profile.distanceKm === null) return "Facility details";
    return profile.distanceKm < 1
      ? `${Math.round(profile.distanceKm * 1000)} m away`
      : `${profile.distanceKm.toFixed(1)} km away`;
  }, [profile]);

  useEffect(() => {
    const profileId = profile?.id;
    const timer = window.setInterval(() => {
      if (profileId) {
        void gymMembershipApi
          .profile(profileId, coordinates)
          .then((updated) =>
            setProfile((current) =>
              current?.id === profileId ? updated : current,
            ),
          )
          .catch(() => undefined);
        return;
      }
      void gymMembershipApi
        .search(coordinates, query)
        .then(setGyms)
        .catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [coordinates, profile?.id, query]);

  if (profile) {
    const membership = profile.membership;
    return (
      <section className={styles.profilePage}>
        <button
          className={styles.backButton}
          type="button"
          onClick={() => {
            setProfile(null);
            setPass(null);
          }}
        >
          <ArrowLeft /> All nearby gyms
        </button>

        <article
          className={styles.profileHero}
          style={
            profile.coverImage
              ? {
                  backgroundImage: `linear-gradient(90deg, rgba(10,17,14,.94), rgba(10,17,14,.56)), url(${profile.coverImage.url})`,
                }
              : undefined
          }
        >
          <div className={styles.profileIdentity}>
            <Logo gym={profile} />
            <div>
              <span className={styles.profileDistance}>
                <MapPin /> {distanceLabel}
              </span>
              <h1>{profile.name}</h1>
              <p>{profile.formattedAddress}</p>
            </div>
          </div>
        </article>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <nav className={styles.profileTabs} aria-label="Facility profile sections">
          <div className={styles.profileTabLinks}>
            <button type="button" className={profileSection === "posts" ? styles.activeProfileTab : undefined} onClick={() => setProfileSection("posts")}>Posts</button>
            <button type="button" className={profileSection === "plans" ? styles.activeProfileTab : undefined} onClick={() => setProfileSection("plans")}>Membership plans</button>
            <button type="button" className={profileSection === "machines" ? styles.activeProfileTab : undefined} onClick={() => setProfileSection("machines")}>Machines</button>
          </div>
          <span className={styles.occupancyBadge} aria-label={`${profile.peopleInsideCount} people inside now`}>
            <UsersRound aria-hidden="true" />
            <strong>{profile.peopleInsideCount}</strong>
            <span>inside now</span>
          </span>
        </nav>

        <div className={`${styles.profileGrid} ${profileSection !== "posts" ? styles.profileSectionOnly : ""}`}>
          {profileSection !== "plans" && (
          <div className={styles.mainColumn}>
            {profileSection === "posts" && (
            <>
            <section className={styles.panel}>
              <span className={styles.eyebrow}>About this gym</span>
              <h2>Train with the equipment you need.</h2>
              <p className={styles.description}>
                {profile.description ||
                  "This gym has not added a description yet."}
              </p>
              <div className={styles.hoursList}>
                {profile.openingHours.map((hours) => (
                  <div key={hours.days}>
                    <Clock3 />
                    <span>{hours.days}</span>
                    <strong>
                      {hours.open24Hours
                        ? "Open 24 hours"
                        : `${formatTime(hours.opensAt)} – ${formatTime(hours.closesAt)}`}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <SocialFeed facilityId={profile.facilityId} showFilters={false} />
            </>
            )}

            {profileSection === "machines" && (
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <span className={styles.eyebrow}>Equipment</span>
                  <h2>Machines at {profile.name}</h2>
                </div>
                <span>
                  {profile.machines.reduce(
                    (sum, machine) => sum + machine.quantity,
                    0,
                  )}{" "}
                  total
                </span>
              </div>
              {profile.machines.length ? (
                <div className={styles.machineGrid}>
                  {profile.machines.map((machine) => (
                    <article key={machine.name}>
                      <Dumbbell />
                      <div>
                        <strong>{machine.name}</strong>
                        <span>{machine.status}</span>
                      </div>
                      <b>×{machine.quantity}</b>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyCopy}>
                  This gym has not published its machine list yet.
                </p>
              )}
            </section>
            )}
          </div>
          )}

          {profileSection === "plans" && (
          <aside className={styles.membershipPanel}>
            <span className={styles.eyebrow}>Membership</span>
            {!membership && (
              <>
                <h2>Choose the plan that moves you forward.</h2>
                <p>
                  Select a membership plan. The gym owner will review and
                  approve your request.
                </p>
                <div className={styles.planList}>
                  {groupPlansByDuration(profile.plans).map((group) => (
                    <section
                      className={styles.planDurationGroup}
                      key={group.durationMonths}
                    >
                      <header>
                        <strong>
                          {durationLabel(group.durationMonths)}
                        </strong>
                        <span>
                          {group.plans.length}{" "}
                          {group.plans.length === 1 ? "option" : "options"}
                        </span>
                      </header>
                      {group.plans.map((plan) => (
                        <article key={plan.id}>
                          <div>
                            {plan.offer && (
                              <span className={styles.discountBadge}>
                                Discount active
                              </span>
                            )}
                            <strong>{plan.name}</strong>
                            <span>
                              {plan.visitsPerWeek ?? 7} entries each week
                            </span>
                          </div>
                          <b
                            className={
                              plan.offer ? styles.salePrice : undefined
                            }
                          >
                            {plan.offer && <del>{regularPlanPrice(plan)}</del>}
                            {planPrice(plan)}
                            <small>
                              {" "}
                              / {durationLabel(plan.durationMonths)}
                            </small>
                          </b>
                          {plan.offer && (
                            <small className={styles.discountEnds}>
                              Discount ends{" "}
                              {new Date(plan.offer.endsAt).toLocaleDateString()}
                            </small>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            disabled={submittingPlanId !== null}
                          >
                            {submittingPlanId === plan.id ? (
                              <LoaderCircle className={styles.spin} />
                            ) : (
                              <CheckCircle2 />
                            )}
                            Choose plan
                          </button>
                        </article>
                      ))}
                    </section>
                  ))}
                </div>
              </>
            )}

            {membership?.status === "PENDING" && (
              <div className={styles.statusCard}>
                <Clock3 />
                <h2>Waiting for approval</h2>
                <p>
                  {profile.name} needs to accept your request for the{" "}
                  {membership.plan.name} plan.
                </p>
                <button
                  type="button"
                  onClick={refreshProfile}
                  disabled={loading}
                >
                  <RefreshCw className={loading ? styles.spin : ""} /> Check
                  status
                </button>
              </div>
            )}

            {membership?.status === "ACTIVE" && (
              <div className={styles.activeMembership}>
                <div className={styles.activeBadge}>
                  <ShieldCheck /> Active membership
                </div>
                <h2>{membership.plan.name}</h2>
                <div className={styles.usage}>
                  <strong>{membership.remainingEntriesThisWeek ?? "∞"}</strong>
                  <span>entries left this week</span>
                </div>
                <p>
                  Valid through{" "}
                  {membership.endsOn
                    ? new Date(
                        `${membership.endsOn}T00:00:00`,
                      ).toLocaleDateString()
                    : "—"}
                </p>
                <button
                  className={styles.qrButton}
                  type="button"
                  onClick={() => void createPass()}
                  disabled={passBusy}
                >
                  {passBusy ? (
                    <LoaderCircle className={styles.spin} />
                  ) : membership.checkedIn ? (
                    <DoorOpen />
                  ) : (
                    <QrCode />
                  )}
                  {membership.checkedIn
                    ? "Generate exit QR"
                    : "Generate entry QR"}
                </button>
              </div>
            )}

            {membership &&
              !["PENDING", "ACTIVE"].includes(membership.status) && (
                <div className={styles.statusCard}>
                  <X />
                  <h2>Membership {membership.status.toLowerCase()}</h2>
                  <p>
                    Contact the gym or choose a new plan when one becomes
                    available.
                  </p>
                </div>
              )}
          </aside>
          )}
        </div>

        {selectedPlan && (
          <div
            className={styles.qrBackdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.currentTarget === event.target &&
                submittingPlanId === null
              )
                setSelectedPlan(null);
            }}
          >
            <form
              className={styles.checkoutDialog}
              onSubmit={(event) => {
                event.preventDefault();
                void requestMembership();
              }}
            >
              <button
                className={styles.qrClose}
                type="button"
                onClick={() => setSelectedPlan(null)}
                aria-label="Close checkout"
              >
                <X />
              </button>
              <CreditCard className={styles.checkoutIcon} aria-hidden="true" />
              <span className={styles.eyebrow}>Development checkout</span>
              <h2>{selectedPlan.name}</h2>
              <div className={styles.checkoutPrice}>
                {selectedPlan.offer && (
                  <del>{regularPlanPrice(selectedPlan)}</del>
                )}
                <strong>{planPrice(selectedPlan)}</strong>
                <span>
                  for {durationLabel(selectedPlan.durationMonths)}
                </span>
              </div>
              <p>
                Your card is validated for this local checkout but its number
                and CVC are never stored.
              </p>
              <label>
                Cardholder name
                <input
                  required
                  autoComplete="cc-name"
                  value={payment.cardholderName}
                  onChange={(event) =>
                    setPayment({
                      ...payment,
                      cardholderName: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Card number
                <input
                  required
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  value={payment.cardNumber}
                  onChange={(event) =>
                    setPayment({
                      ...payment,
                      cardNumber: event.target.value
                        .replace(/[^0-9 ]/g, "")
                        .slice(0, 23),
                    })
                  }
                />
              </label>
              <div className={styles.checkoutRow}>
                <label>
                  Expiry month
                  <input
                    required
                    type="number"
                    min="1"
                    max="12"
                    autoComplete="cc-exp-month"
                    value={payment.expiryMonth}
                    onChange={(event) =>
                      setPayment({
                        ...payment,
                        expiryMonth: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Expiry year
                  <input
                    required
                    type="number"
                    min={new Date().getFullYear()}
                    autoComplete="cc-exp-year"
                    value={payment.expiryYear}
                    onChange={(event) =>
                      setPayment({
                        ...payment,
                        expiryYear: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  CVC
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={payment.cvc}
                    onChange={(event) =>
                      setPayment({
                        ...payment,
                        cvc: event.target.value.replace(/\D/g, "").slice(0, 4),
                      })
                    }
                  />
                </label>
              </div>
              <button
                className={styles.payButton}
                type="submit"
                disabled={submittingPlanId !== null}
              >
                {submittingPlanId ? (
                  <LoaderCircle className={styles.spin} />
                ) : (
                  <ShieldCheck />
                )}
                Pay {planPrice(selectedPlan)} and request membership
              </button>
            </form>
          </div>
        )}

        {pass && qrDataUrl && (
          <div
            className={styles.qrBackdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) {
                setPass(null);
                refreshProfile();
              }
            }}
          >
            <section
              className={styles.qrDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-title"
            >
              <button
                className={styles.qrClose}
                type="button"
                onClick={() => {
                  setPass(null);
                  refreshProfile();
                }}
                aria-label="Close QR code"
              >
                <X />
              </button>
              <span className={styles.eyebrow}>
                {pass.direction === "ENTER" ? "Entry pass" : "Exit pass"}
              </span>
              <h2 id="qr-title">Show this code at {profile.name}</h2>
              <img
                src={qrDataUrl}
                alt={`${pass.direction.toLowerCase()} QR code for ${profile.name}`}
              />
              <p>
                This is a single-use code and expires at{" "}
                {new Date(pass.expiresAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </p>
              <div className={styles.qrIdentity}>
                <strong>{memberName}</strong>
                <strong>Welcome to {profile.name}</strong>
              </div>
              {pass.direction === "ENTER" && (
                <strong>
                  {pass.remainingEntriesThisWeek ?? "Unlimited"} entries remain
                  before this visit is scanned.
                </strong>
              )}
            </section>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={styles.directory}>
      <header className={styles.directoryHeader}>
        <div>
          <button className={styles.backButton} type="button" onClick={onBack}>
            <ArrowLeft /> Dashboard
          </button>
          <span className={styles.eyebrow}>Gym discovery</span>
          <h1>Find your gym.</h1>
          <p>
            Gyms are sorted using your saved location. You can temporarily use
            your current location instead.
          </p>
        </div>
        <div className={styles.locationActions}>
          <button
            className={styles.mapButton}
            type="button"
            onClick={() => setMapOpen(true)}
            disabled={!gyms.length || loading}
          >
            <MapIcon /> Open map
          </button>
          <button
            className={`${styles.locationButton} ${locationSource === "current" ? styles.activeLocation : ""}`}
            type="button"
            onClick={useCurrentLocation}
            aria-pressed={locationSource === "current"}
            disabled={locating}
          >
            {locating ? (
              <LoaderCircle className={styles.spin} />
            ) : (
              <LocateFixed />
            )}
            Use my current location
          </button>
        </div>
      </header>

      {mapOpen && (
        <GymDirectoryMap
          gyms={gyms}
          coordinates={coordinates}
          onClose={() => setMapOpen(false)}
          onOpenGym={openGymFromMap}
        />
      )}

      <form
        className={styles.searchBar}
        onSubmit={(event) => {
          event.preventDefault();
          void searchGyms(coordinates, query);
        }}
      >
        <Search aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by gym name, city, or address"
          aria-label="Search gyms"
        />
        <button type="submit" disabled={loading}>
          Search
        </button>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className={styles.loading}>
          <LoaderCircle className={styles.spin} />
          <span>Finding gyms near you…</span>
        </div>
      ) : gyms.length ? (
        <div className={styles.gymGrid}>
          {gyms.map((gym) => {
            const activeMember = gym.membershipStatus === "ACTIVE";
            return (
            <button
              key={gym.id}
              type="button"
              className={`${styles.gymCard} ${gym.checkedInByMe ? styles.currentGymCard : activeMember ? styles.memberGymCard : ""}`}
              onClick={() => void openGym(gym.id)}
            >
              {(gym.checkedInByMe || activeMember) && <span className={styles.youAreHere}><CheckCircle2 /> {gym.checkedInByMe ? "You are here" : "Your gym"}</span>}
              <Logo gym={gym} />
              <div className={styles.gymInfo}>
                <h2>{gym.name}</h2>
                {activeMember && <strong className={styles.memberStatus}>Active member</strong>}
                <p>
                  <MapPin /> {gym.formattedAddress}
                </p>
                <div>
                  {gym.distanceKm !== null && (
                    <span>
                      {gym.distanceKm < 1
                        ? `${Math.round(gym.distanceKm * 1000)} m`
                        : `${gym.distanceKm.toFixed(1)} km`}{" "}
                      away
                    </span>
                  )}
                  <span>
                    <UsersRound /> {gym.peopleInsideCount} inside now
                  </span>
                </div>
              </div>
            </button>
          )})}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Dumbbell />
          <h2>No gyms found here yet.</h2>
          <p>Try a broader search or update your location.</p>
        </div>
      )}
    </section>
  );
}
