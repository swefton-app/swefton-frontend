import { useCallback, useEffect, useRef, useState } from "react";
import type { CardPaymentRequest } from "@swefton/shared/membership";
import type {
  TrainerPackageResponse,
  TrainerProfileResponse,
} from "@swefton/shared/trainer";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  LoaderCircle,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { getApiErrorMessage } from "../../../../core/http/getApiErrorMessage";
import { trainerApi } from "../../api/trainerApi";
import styles from "./TrainerDiscovery.module.css";

interface Props {
  memberName: string;
  onBack: () => void;
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}

export function TrainerDiscovery({ memberName, onBack }: Props) {
  const [trainers, setTrainers] = useState<TrainerProfileResponse[]>([]);
  const [profile, setProfile] = useState<TrainerProfileResponse | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<TrainerPackageResponse | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const skipLiveSearch = useRef(true);
  const [payment, setPayment] = useState<CardPaymentRequest>({
    cardholderName: memberName,
    cardNumber: "",
    expiryMonth: new Date().getMonth() + 1,
    expiryYear: new Date().getFullYear() + 1,
    cvc: "",
  });

  const search = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTrainers(await trainerApi.list(query));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "We could not load trainers."));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void search(), 0);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (skipLiveSearch.current) {
      skipLiveSearch.current = false;
      return;
    }
    const timer = window.setTimeout(() => void search(), 1000);
    return () => window.clearTimeout(timer);
  }, [search]);

  const checkout = async () => {
    if (!selectedPackage) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await trainerApi.checkout({
        packageId: selectedPackage.id,
        payment,
      });
      setSuccess(
        `Payment ${result.payment.reference} succeeded. Your request is waiting for ${result.trainerName}.`,
      );
      setSelectedPackage(null);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The trainer checkout could not be completed.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  if (profile)
    return (
      <section className={styles.page}>
        <button
          className={styles.back}
          type="button"
          onClick={() => {
            setProfile(null);
            setSuccess("");
          }}
        >
          <ArrowLeft /> All trainers
        </button>
        <header className={styles.hero}>
          <div className={styles.avatar}>
            {profile.avatar ? (
              <img src={profile.avatar.url} alt={profile.displayName} />
            ) : (
              <UserRound />
            )}
          </div>
          <div>
            <span>Personal trainer</span>
            <h1>{profile.displayName}</h1>
            <p>
              <MapPin />{" "}
              {[profile.city, profile.country].filter(Boolean).join(", ") ||
                "Remote coaching"}
            </p>
          </div>
          {profile.experience !== null && (
            <strong>
              {profile.experience}
              <small>years experience</small>
            </strong>
          )}
        </header>
        {error && <p className={styles.error}>{error}</p>}
        {success && (
          <p className={styles.success}>
            <CheckCircle2 /> {success}
          </p>
        )}
        <div className={styles.profileGrid}>
          <article className={styles.about}>
            <span>About</span>
            <h2>Coaching built around you.</h2>
            <p>
              {profile.bio || "This trainer has not added a biography yet."}
            </p>
          </article>
          <aside className={styles.packages}>
            <span>Training packages</span>
            <h2>Choose your plan</h2>
            {profile.packages.length ? (
              profile.packages.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.sessionsPerWeek} sessions/week · {item.durationDays}{" "}
                      days
                    </small>
                  </div>
                  <div className={item.offer ? styles.sale : undefined}>
                    {item.offer && (
                      <del>
                        {money(item.offer.originalPrice, item.currency)}
                      </del>
                    )}
                    <b>{money(item.effectivePrice, item.currency)}</b>
                  </div>
                  {item.description && <p>{item.description}</p>}
                  <button
                    type="button"
                    onClick={() => setSelectedPackage(item)}
                  >
                    Choose and pay
                  </button>
                </article>
              ))
            ) : (
              <p>No packages are available yet.</p>
            )}
          </aside>
        </div>
        {selectedPackage && (
          <div
            className={styles.backdrop}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !busy)
                setSelectedPackage(null);
            }}
          >
            <form
              className={styles.checkout}
              onSubmit={(event) => {
                event.preventDefault();
                void checkout();
              }}
            >
              <button
                className={styles.close}
                type="button"
                onClick={() => setSelectedPackage(null)}
              >
                <X />
              </button>
              <CreditCard />
              <span>Development checkout</span>
              <h2>{selectedPackage.name}</h2>
              <div className={styles.total}>
                {selectedPackage.offer && (
                  <del>
                    {money(
                      selectedPackage.offer.originalPrice,
                      selectedPackage.currency,
                    )}
                  </del>
                )}
                <strong>
                  {money(
                    selectedPackage.effectivePrice,
                    selectedPackage.currency,
                  )}
                </strong>
              </div>
              <p>Card number and CVC are validated but never saved.</p>
              <label>
                Cardholder name
                <input
                  required
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
              <div className={styles.row}>
                <label>
                  Month
                  <input
                    required
                    type="number"
                    min="1"
                    max="12"
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
                  Year
                  <input
                    required
                    type="number"
                    min={new Date().getFullYear()}
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
              <button className={styles.pay} type="submit" disabled={busy}>
                {busy ? (
                  <LoaderCircle className={styles.spin} />
                ) : (
                  <ShieldCheck />
                )}{" "}
                Pay and send request
              </button>
            </form>
          </div>
        )}
      </section>
    );

  return (
    <section className={styles.page}>
      <button className={styles.back} type="button" onClick={onBack}>
        <ArrowLeft /> Dashboard
      </button>
      <header className={styles.heading}>
        <div>
          <span>Trainer discovery</span>
          <h1>Find your coach.</h1>
          <p>Compare profiles, packages, and current offers before you choose.</p>
        </div>
        <div className={styles.headingHighlights} aria-label="Trainer directory benefits">
          <span><BadgeCheck aria-hidden="true" /> Registered trainers</span>
          <span><Sparkles aria-hidden="true" /> Flexible packages</span>
        </div>
      </header>
      <form
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <Search />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by trainer, city, or coaching style"
        />
        <button>Search</button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <div className={styles.state}>
          <LoaderCircle className={styles.spin} /> Loading trainers…
        </div>
      ) : trainers.length ? (
        <div className={styles.grid}>
          {trainers.map((trainer) => (
            <button
              key={trainer.id}
              type="button"
              className={styles.card}
              onClick={() => setProfile(trainer)}
            >
              <div className={styles.avatar}>
                {trainer.avatar ? (
                  <img src={trainer.avatar.url} alt="" />
                ) : (
                  <Dumbbell />
                )}
              </div>
              <div>
                <h2>{trainer.displayName}</h2>
                <p>
                  <MapPin />{" "}
                  {[trainer.city, trainer.country].filter(Boolean).join(", ") ||
                    "Remote"}
                </p>
                <span>
                  {trainer.packages.length} package
                  {trainer.packages.length === 1 ? "" : "s"} available
                </span>
                <strong className={styles.cardAction}>View profile <ArrowUpRight aria-hidden="true" /></strong>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Dumbbell aria-hidden="true" />
          <h2>No trainers found</h2>
          <p>Try a trainer name, city, or a broader coaching style.</p>
        </div>
      )}
    </section>
  );
}
