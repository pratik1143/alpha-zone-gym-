"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  Dumbbell,
  Target,
  ShieldCheck,
  MoveUpRight,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Flame,
  Activity,
  Award,
  Zap,
  Phone,
  Clock,
  CheckCircle2,
  Sparkles,
  Heart,
  TrendingUp
} from "lucide-react";
import {
  MarketingHeader,
  MarketingFooter,
  joinUrl,
} from "@/components/MarketingChrome";

const photos = [
  [
    "Strength Training Gym in Mohali.jpg",
    "Room to raise your limits.",
    "The training floor",
  ],
  [
    "Best Gym in Mohali.jpg",
    "Your new favourite place.",
    "Welcome to Alpha Zone",
  ],
  ["Best Gym nearby.jpg", "Built for the work.", "Strength & equipment"],
  ["Weight Loss Gym Mohali.jpg", "Find your own rhythm.", "Training spaces"],
  ["gym near airport.jpg", "A different kind of energy.", "Inside the zone"],
  [
    "Best Gym Near Landran Road.jpeg",
    "Come for a workout. Stay for the feeling.",
    "Our space",
  ],
];

const whyTrainItems = [
  {
    icon: Dumbbell,
    title: "Elite Equipment",
    desc: "Train with professional strength and cardio equipment designed to support effective and safe workouts."
  },
  {
    icon: Target,
    title: "Expert Coaches",
    desc: "Our coaches help members improve their form, structure their training and stay consistent with their fitness goals."
  },
  {
    icon: Sparkles,
    title: "Personalised Programming",
    desc: "Your training should match your goals. Our approach focuses on structured workouts rather than random exercises."
  },
  {
    icon: Zap,
    title: "Multiple Training Options",
    desc: "Choose from weight training, cardio, CrossFit, functional training, HIIT and personal training."
  },
  {
    icon: ShieldCheck,
    title: "Clean & Comfortable Environment",
    desc: "We maintain a training environment designed to help you focus on your workout."
  },
  {
    icon: Clock,
    title: "Open 7 Days",
    desc: "Flexible gym access makes it easier to build a consistent fitness routine."
  }
];

const services = [
  {
    title: "Weight Training",
    desc: "Build strength and muscle with barbells, dumbbells, power cages and specialized strength equipment.",
    cta: "Explore Weight Training →",
    href: "/weight-training-mohali",
    img: "/gym_images/Strength Training Gym in Mohali.jpg",
    tag: "STRENGTH & HYPERTROPHY"
  },
  {
    title: "Cardio Training",
    desc: "Improve cardiovascular fitness and endurance with rowers, assault bikes, treadmills, StairMasters and other cardio equipment.",
    cta: "Explore Cardio →",
    href: "/weight-loss-gym-mohali",
    img: "/gym_images/Weight Loss Gym Mohali.jpg",
    tag: "ENDURANCE & STAMINA"
  },
  {
    title: "Personal Training",
    desc: "Get one-on-one coaching with customized training blocks, goal tracking and direct guidance.",
    cta: "Explore Personal Training →",
    href: "/personal-training-mohali",
    img: "/gym_images/Best Gym Near Landran Road.jpeg",
    tag: "1-ON-1 COACHING"
  },
  {
    title: "CrossFit",
    desc: "Challenge your strength, endurance and conditioning with high-intensity functional workouts.",
    cta: "Explore CrossFit →",
    href: "/crossfit-mohali",
    img: "/gym_images/Best Gym in Mohali.jpg",
    tag: "POWER & CONDITIONING"
  },
  {
    title: "Functional Training",
    desc: "Improve movement, stability, coordination and overall physical performance through functional exercises.",
    cta: "Explore Functional Training →",
    href: "/functional-training-mohali",
    img: "/gym_images/Best Gym nearby.jpg",
    tag: "MOBILITY & STABILITY"
  },
  {
    title: "HIIT & Group Classes",
    desc: "Take part in energetic group sessions designed around conditioning, strength and fitness.",
    cta: "Explore HIIT →",
    href: "/hiit-training-mohali",
    img: "/gym_images/gym near airport.jpg",
    tag: "HIGH ENERGY BURN"
  }
];

const goals = [
  {
    icon: Dumbbell,
    title: "Build Muscle",
    desc: "Structured resistance and weight training can help you work towards greater strength and muscle development."
  },
  {
    icon: Heart,
    title: "Lose Weight",
    desc: "Combine strength training, cardio and structured workouts to build a sustainable fitness routine."
  },
  {
    icon: TrendingUp,
    title: "Get Stronger",
    desc: "Progressive strength training helps you improve performance and build confidence in the gym."
  },
  {
    icon: Activity,
    title: "Improve Fitness",
    desc: "Build endurance, mobility, conditioning and overall physical fitness."
  }
];

const memberships = [
  {
    duration: "1 Month",
    originalPrice: "₹3,500",
    price: "₹3,000",
    period: "/ month",
    popular: false
  },
  {
    duration: "3 Months",
    originalPrice: "₹8,000",
    price: "₹6,000",
    period: "/ 3 months",
    popular: true
  },
  {
    duration: "6 Months",
    originalPrice: "₹12,000",
    price: "₹9,000",
    period: "/ 6 months",
    popular: false
  },
  {
    duration: "12 Months",
    originalPrice: "₹18,000",
    price: "₹14,000",
    period: "/ year",
    popular: false
  }
];

function Reveal({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.65 }}
    >
      {children}
    </motion.div>
  );
}

export default function HomeClient() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], [0, reduced ? 0 : 160]);
  const [selected, setSelected] = useState<number | null>(null);
  const gallery = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (selected !== null) gallery.current?.showModal();
    else gallery.current?.close();
  }, [selected]);

  const changePhoto = (direction: number) =>
    setSelected((n) =>
      n === null ? 0 : (n + direction + photos.length) % photos.length,
    );

  return (
    <div className="az-site">
      <MarketingHeader />
      <main>
        {/* Hero Section */}
        <section className="az-hero">
          <motion.div className="az-hero-image" style={{ y: heroY }} />
          <div className="az-hero-shade" />
          <div className="az-container az-hero-content">
            <motion.div
              style={{ maxWidth: 600 }}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="az-eyebrow">
                <span /> LANDRAN ROAD, SOHANA · MOHALI
              </p>
              <h1
                style={{
                  fontSize: "clamp(34px, 4.8vw, 62px)",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: "-0.5px",
                  textTransform: "uppercase",
                  margin: "0 0 14px",
                }}
              >
                PREMIUM GYM IN
                <br />
                <em>SOHANA, MOHALI</em>
              </h1>
              <p
                style={{
                  fontSize: "clamp(16px, 2vw, 20px)",
                  fontWeight: 700,
                  color: "#e2e8f0",
                  letterSpacing: "0.2px",
                  margin: "0 0 18px",
                }}
              >
                Sculpt Your Body. <span style={{ color: "var(--az-lime)" }}>Elevate Your Spirit.</span>
              </p>
              <p
                className="az-hero-description"
                style={{
                  maxWidth: 540,
                  margin: "0 0 30px",
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "#cbd5e1",
                }}
              >
                Welcome to Alpha Zone Gym, a premium fitness and performance facility located on Landran Road, Sohana, Mohali. Whether your goal is to build muscle, lose weight, improve strength, increase endurance or simply live a healthier lifestyle, Alpha Zone provides the equipment, coaching and training environment to help you stay consistent.
              </p>
              <div className="az-actions" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <a
                  className="az-button"
                  href="https://wa.me/919779333155?text=Hello%20Alpha%20Zone%20Gym%2C%20I%20want%20to%20join."
                  target="_blank"
                  rel="noreferrer"
                >
                  Join Alpha Zone <ArrowUpRight size={18} />
                </a>
                <a
                  className="az-button az-button-dark"
                  href="https://maps.app.goo.gl/pX8VZNoXNu4YAeBW6"
                  target="_blank"
                  rel="noreferrer"
                  style={{ border: "1px solid rgba(255,255,255,0.18)" }}
                >
                  <MapPin size={16} /> Get Directions
                </a>
              </div>
              <div className="az-location" style={{ marginTop: 24 }}>
                <MapPin size={14} /> 2ND FLOOR, MNB GROUP, SCO 16-17, LANDRAN ROAD, SOHANA
              </div>
            </motion.div>
          </div>
          <div className="az-hero-side">
            TRAIN.
            <br />
            TRANSFORM.
            <br />
            <span>CONSISTENCY.</span>
          </div>
          <div className="az-hero-bottom">
            <span>PERFORMANCE LAB</span>
            <a href="#about">
              SCROLL TO EXPLORE <ArrowDown size={14} />
            </a>
          </div>
        </section>

        {/* Ticker */}
        <div className="az-ticker" aria-hidden="true">
          <div>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                WEIGHT TRAINING <b>✳</b> CARDIO <b>✳</b> CROSSFIT <b>✳</b> FUNCTIONAL TRAINING <b>✳</b> HIIT <b>✳</b> PERSONAL TRAINING <b>✳</b>
              </span>
            ))}
          </div>
        </div>

        {/* Section 1: More Than a Gym. A Performance Lab. */}
        <section className="az-container az-section" id="about">
          <Reveal className="az-intro">
            <div>
              <p className="az-eyebrow">ABOUT OUR APPROACH</p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.15 }}>
                MORE THAN A GYM.
                <br />
                <span className="az-muted">A PERFORMANCE</span>
                <br />
                LAB.
              </h2>
            </div>
            <div className="az-intro-copy">
              <p style={{ fontSize: 16, lineHeight: 1.7, color: "#fff" }}>
                Alpha Zone Gym is designed for people who want more from their training. Our approach combines professional equipment, structured programming and expert coaching to create a focused fitness environment.
              </p>
              <p className="az-secondary" style={{ fontSize: 14, lineHeight: 1.7 }}>
                From strength and weight training to cardio, CrossFit, functional training, HIIT and personal training, you can build your fitness routine around your individual goals.
              </p>
              <Link className="az-text-link" href="/about-us">
                Learn more about Alpha Zone <ArrowUpRight size={18} />
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Section 2: Why Train at Alpha Zone? */}
        <section className="az-container az-section" style={{ paddingTop: 0 }}>
          <Reveal className="az-section-heading">
            <div>
              <p className="az-eyebrow">THE ALPHA ADVANTAGE</p>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", textTransform: "uppercase" }}>
                WHY TRAIN AT
                <br />
                <em>ALPHA ZONE?</em>
              </h2>
            </div>
            <p style={{ maxWidth: 460 }}>
              Everything in our facility is calibrated to give you the most safe, motivating, and progressive workout experience.
            </p>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              marginTop: 32
            }}
          >
            {whyTrainItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Reveal key={idx}>
                  <div
                    style={{
                      background: "#0e1315",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16,
                      padding: 28,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      transition: "all 0.3s"
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "rgba(229,250,25,0.1)",
                        border: "1px solid rgba(229,250,25,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--az-lime)"
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, textTransform: "uppercase" }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Section 3: Our Gym Services */}
        <section className="az-program-section">
          <div className="az-container az-section">
            <Reveal className="az-section-heading">
              <div>
                <p className="az-eyebrow">VERSATILE DISCIPLINES</p>
                <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", textTransform: "uppercase" }}>
                  OUR GYM
                  <br />
                  <em>SERVICES</em>
                </h2>
              </div>
              <Link className="az-text-link" href="/gym-services">
                Explore all services <ArrowUpRight size={18} />
              </Link>
            </Reveal>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
                marginTop: 36
              }}
            >
              {services.map((svc, idx) => (
                <Reveal key={idx}>
                  <Link
                    href={svc.href}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: "100%",
                      background: "#0c1012",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 20,
                      overflow: "hidden",
                      transition: "all 0.3s",
                      color: "#fff"
                    }}
                    className="az-service-card"
                  >
                    <div style={{ position: "relative", height: 210, overflow: "hidden" }}>
                      <Image
                        src={svc.img}
                        alt={svc.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ filter: "brightness(0.75)" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, #0c1012 0%, transparent 60%)"
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: 16,
                          left: 16,
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          background: "rgba(0,0,0,0.7)",
                          backdropFilter: "blur(6px)",
                          color: "var(--az-lime)",
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(229,250,25,0.3)"
                        }}
                      >
                        {svc.tag}
                      </span>
                    </div>
                    <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, textTransform: "uppercase", margin: "0 0 10px" }}>
                          {svc.title}
                        </h3>
                        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: "0 0 16px" }}>
                          {svc.desc}
                        </p>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "var(--az-lime)",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 12
                        }}
                      >
                        <span>{svc.cta}</span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Train for Your Goal */}
        <section className="az-container az-section">
          <Reveal className="az-section-heading">
            <div>
              <p className="az-eyebrow">TARGETED OUTCOMES</p>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", textTransform: "uppercase" }}>
                TRAIN FOR
                <br />
                <em>YOUR GOAL</em>
              </h2>
            </div>
            <p style={{ maxWidth: 440 }}>
              Whatever your personal milestone, our coaching structure helps you build real, sustainable physical capacity.
            </p>
          </Reveal>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
              marginTop: 32
            }}
          >
            {goals.map((g, idx) => {
              const Icon = g.icon;
              return (
                <Reveal key={idx}>
                  <div
                    style={{
                      background: "#0e1315",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16,
                      padding: 26,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(229,250,25,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--az-lime)"
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
                      {g.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>
                      {g.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Section 5: Gym Memberships */}
        <section className="az-membership" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "80px 0" }}>
          <div className="az-container">
            <Reveal className="az-section-heading" style={{ marginBottom: 40 }}>
              <div>
                <p className="az-eyebrow">TRANSPARENT PRICING</p>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", textTransform: "uppercase" }}>
                  GYM MEMBERSHIPS
                </h2>
              </div>
              <p style={{ maxWidth: 460 }}>
                Choose a membership based on your training commitment. Memberships include gym access, cardio and weight equipment, locker room access and a fitness assessment.
              </p>
            </Reveal>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
                marginTop: 32
              }}
            >
              {memberships.map((m, idx) => (
                <Reveal key={idx}>
                  <div
                    style={{
                      background: m.popular ? "#0a130f" : "#0d1113",
                      border: m.popular ? "2px solid var(--az-lime)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 18,
                      padding: 28,
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: "100%"
                    }}
                  >
                    {m.popular && (
                      <span
                        style={{
                          position: "absolute",
                          top: -12,
                          left: 24,
                          background: "var(--az-lime)",
                          color: "#000",
                          fontSize: 10,
                          fontWeight: 900,
                          padding: "3px 10px",
                          borderRadius: 20,
                          letterSpacing: "1px"
                        }}
                      >
                        RECOMMENDED
                      </span>
                    )}
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, textTransform: "uppercase", margin: "0 0 12px" }}>
                        {m.duration}
                      </h3>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, textDecoration: "line-through", color: "#64748b" }}>
                          {m.originalPrice}
                        </span>
                        <span style={{ fontSize: 32, fontWeight: 900, color: "var(--az-lime)" }}>
                          {m.price}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>{m.period}</span>
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 20, paddingTop: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1", marginBottom: 8 }}>
                          <CheckCircle2 size={14} color="var(--az-lime)" /> Gym & Cardio Access
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1", marginBottom: 8 }}>
                          <CheckCircle2 size={14} color="var(--az-lime)" /> Weight Equipment Access
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1", marginBottom: 8 }}>
                          <CheckCircle2 size={14} color="var(--az-lime)" /> Locker Room Access
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1" }}>
                          <CheckCircle2 size={14} color="var(--az-lime)" /> Fitness Assessment
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 44 }}>
              <Link href="/gym-membership-mohali" className="az-button" style={{ display: "inline-flex" }}>
                View Membership Plans <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 6: Photo Gallery */}
        <section
          id="gallery"
          className="az-container az-section az-gallery-section"
        >
          <Reveal className="az-section-heading">
            <div>
              <p className="az-eyebrow">INSIDE ALPHA ZONE</p>
              <h2>
                LOOK INSIDE.
                <br />
                <em>FEEL THE DIFFERENCE.</em>
              </h2>
            </div>
            <p>
              Real spaces. Real energy.
              <br />
              Take a closer look at Alpha Zone.
            </p>
          </Reveal>
          <Reveal className="az-gallery">
            {photos.slice(0, 5).map(([file, caption, label], i) => (
              <button
                className={`az-photo az-photo-${i}`}
                key={file}
                onClick={() => setSelected(i)}
                aria-label={`View ${label}`}
              >
                <Image
                  width={1200}
                  height={1200}
                  sizes="(max-width: 600px) 90vw, (max-width: 850px) 45vw, 33vw"
                  loading="lazy"
                  src={`/gym_images/${file}`}
                  alt={label}
                />
                <div>
                  <span>{label}</span>
                  <strong>{caption}</strong>
                </div>
                <span className="az-photo-arrow">
                  <MoveUpRight size={19} />
                </span>
              </button>
            ))}
          </Reveal>
          <div className="az-gallery-caption">
            <span>NO STOCK SPACES. THIS IS ALPHA ZONE.</span>
            <button className="az-text-link" onClick={() => setSelected(0)}>
              Explore all photos <ArrowRight size={17} />
            </button>
          </div>
        </section>

        {/* Section 7: Located in Sohana, Mohali */}
        <section
          className="az-location-section"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "85px 0"
          }}
        >
          <div className="az-container">
            <Reveal>
              <div
                style={{
                  background: "#0c1113",
                  border: "1px solid rgba(0,0,0,0.2)",
                  borderRadius: 24,
                  padding: "52px 36px",
                  textAlign: "center",
                  maxWidth: 920,
                  margin: "0 auto",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
                  position: "relative",
                  zIndex: 1
                }}
              >
                <p className="az-eyebrow" style={{ color: "var(--az-lime)" }}>VISIT US TODAY</p>
                <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", margin: "8px 0 16px", textTransform: "uppercase", color: "#fff" }}>
                  LOCATED IN SOHANA, MOHALI
                </h2>
                <p style={{ fontSize: 15, color: "#cbd5e1", maxWidth: 650, margin: "0 auto 12px", lineHeight: 1.7 }}>
                  Alpha Zone Gym is located at:
                  <br />
                  <strong style={{ color: "#fff" }}>
                    2nd Floor, MNB Group, SCO 16-17, Landran Road, Sohana, Mohali, Punjab 140308
                  </strong>
                </p>
                <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 auto 20px" }}>
                  We serve members from Sohana and surrounding areas of Mohali.
                </p>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--az-lime)",
                    marginBottom: 28
                  }}
                >
                  <Phone size={18} />
                  <a href="tel:+919779333155" style={{ color: "inherit" }}>
                    +91 97793 33155
                  </a>
                </div>
                <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/contact-us" className="az-button">
                    Contact Alpha Zone <ArrowUpRight size={18} />
                  </Link>
                  <a
                    href="https://maps.app.goo.gl/pX8VZNoXNu4YAeBW6"
                    target="_blank"
                    rel="noreferrer"
                    className="az-button az-button-dark"
                    style={{ border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    <MapPin size={16} /> Open in Google Maps
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <MarketingFooter />

      {/* Lightbox Dialog */}
      <dialog
        ref={gallery}
        className="az-dialog az-lightbox"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") changePhoto(1);
          if (e.key === "ArrowLeft") changePhoto(-1);
        }}
        aria-label="Gym photo gallery"
      >
        <button
          className="az-close"
          aria-label="Close gallery"
          onClick={() => setSelected(null)}
        >
          <X />
        </button>
        {selected !== null && (
          <>
            <Image
              width={1600}
              height={1600}
              sizes="90vw"
              src={`/gym_images/${photos[selected][0]}`}
              alt={photos[selected][2]}
            />
            <div className="az-lightbox-controls">
              <button
                aria-label="Previous photo"
                onClick={() => changePhoto(-1)}
              >
                <ChevronLeft />
              </button>
              <p>
                {photos[selected][2]}{" "}
                <span>
                  {selected + 1} / {photos.length}
                </span>
              </p>
              <button aria-label="Next photo" onClick={() => changePhoto(1)}>
                <ChevronRight />
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
