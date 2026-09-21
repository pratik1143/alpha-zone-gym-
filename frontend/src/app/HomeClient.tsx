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
  Users,
  Target,
  ShieldCheck,
  MoveUpRight,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  MapPin,
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
const programs = [
  [
    "01",
    "STRENGTH",
    "Build a stronger foundation.",
    "/program_strength.png",
    "/weight-training-mohali",
  ],
  [
    "02",
    "PERSONAL TRAINING",
    "Your goals. Your game plan.",
    "/gym_hero_curl.png",
    "/personal-training-mohali",
  ],
  [
    "03",
    "HIIT & CONDITIONING",
    "Bring the energy. Feel the difference.",
    "/program_hiit.png",
    "/hiit-training-mohali",
  ],
  [
    "04",
    "FUNCTIONAL FITNESS",
    "Move better, every day.",
    "/program_endurance.png",
    "/functional-training-mohali",
  ],
];
const faqs = [
  [
    "New to the gym? You belong here.",
    "Absolutely. Visit us, meet the team, and tell us what you want to achieve. We will help you find a comfortable starting point and the right training approach.",
  ],
  [
    "Can I see the gym before joining?",
    "Yes. Use Book a visit to contact our team on WhatsApp and arrange a time to explore the gym in person.",
  ],
  [
    "Which membership is right for me?",
    "Explore our membership page for plan options, or speak with the team about your schedule, training goals, and personal training requirements.",
  ],
];
function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
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
  const [faq, setFaq] = useState<number | null>(0);
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
        <section className="az-hero">
          <motion.div className="az-hero-image" style={{ y: heroY }} />
          <div className="az-hero-shade" />
          <div className="az-container az-hero-content">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="az-eyebrow">
                <span /> DISCIPLINE BUILDS FREEDOM
              </p>
              <h1>
                MORE THAN
                <br />A <em>GYM.</em>
              </h1>
              <p className="az-hero-description">
                A stronger body. A clearer mind.
                <br />A version of you that doesn’t give up.
              </p>
              <div className="az-actions">
                <a
                  className="az-button"
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Find your stronger <ArrowUpRight size={20} />
                </a>
                <a className="az-text-link" href="#gallery">
                  <span className="az-circle">
                    <ArrowDown size={17} />
                  </span>
                  Explore the zone
                </a>
              </div>
              <div className="az-location">
                <MapPin size={14} /> SOHANA, MOHALI{" "}
                <span>YOUR NEXT CHAPTER STARTS HERE</span>
              </div>
            </motion.div>
          </div>
          <div className="az-hero-side">
            TRAIN.
            <br />
            TRANSFORM.
            <br />
            <span>BELONG.</span>
          </div>
          <div className="az-hero-bottom">
            <span>01 / THE ALPHA MINDSET</span>
            <a href="#about">
              SCROLL TO DISCOVER <ArrowDown size={14} />
            </a>
          </div>
        </section>
        <div className="az-ticker" aria-hidden="true">
          <div>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                STRONGER EVERY DAY <b>✳</b> BUILT DIFFERENT <b>✳</b> ALPHA ZONE{" "}
                <b>✳</b>
              </span>
            ))}
          </div>
        </div>
        <section className="az-container az-section" id="about">
          <Reveal className="az-intro">
            <div>
              <p className="az-eyebrow">THE ALPHA MINDSET</p>
              <h2>
                REAL PEOPLE.
                <br />
                <span className="az-muted">EXTRAORDINARY</span>
                <br />
                POTENTIAL.
              </h2>
            </div>
            <div className="az-intro-copy">
              <p>
                This is your space to show up, put in the work, and become a
                little better than yesterday.
              </p>
              <p className="az-secondary">
                From your first rep to your next personal best, find the
                equipment, guidance, and community to keep moving forward.
              </p>
              <Link className="az-text-link" href="/about-us">
                Get to know Alpha Zone <ArrowUpRight size={18} />
              </Link>
            </div>
          </Reveal>
          <Reveal className="az-values">
            {[
              [Dumbbell, "Strength", "Build real strength"],
              [Target, "Confidence", "Back yourself"],
              [ShieldCheck, "Guidance", "Make every rep count"],
              [Users, "Community", "Find your people"],
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof Dumbbell;
              return (
                <div key={String(title)}>
                  <I size={29} />
                  <div>
                    <h3>{String(title)}</h3>
                    <p>{String(desc)}</p>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </section>
        <section
          id="gallery"
          className="az-container az-section az-gallery-section"
        >
          <Reveal className="az-section-heading">
            <div>
              <p className="az-eyebrow">YOUR GYM. YOUR ZONE.</p>
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
        <section className="az-program-section">
          <div className="az-container az-section">
            <Reveal className="az-section-heading">
              <div>
                <p className="az-eyebrow">FIND YOUR WAY TO STRONG</p>
                <h2>
                  YOUR GOALS.
                  <br />
                  <em>YOUR TRAINING.</em>
                </h2>
              </div>
              <Link className="az-text-link" href="/gym-services">
                Explore all programs <ArrowUpRight size={18} />
              </Link>
            </Reveal>
            <div className="az-programs">
              {programs.map(([number, title, desc, img, href]) => (
                <Reveal key={number}>
                  <Link className="az-program" href={href}>
                    <Image
                      width={1200}
                      height={1200}
                      sizes="(max-width: 600px) 90vw, (max-width: 850px) 45vw, 33vw"
                      loading="lazy"
                      src={img}
                      alt={title.toLowerCase() + " training"}
                    />
                    <span className="az-program-number">/ {number}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                    <span className="az-program-arrow">
                      <ArrowUpRight />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
        <section className="az-container az-section">
          <Reveal className="az-visit">
            <div className="az-visit-photo">
              <Image
                width={1200}
                height={1200}
                sizes="(max-width: 600px) 90vw, (max-width: 850px) 45vw, 33vw"
                loading="lazy"
                src="/gym_images/Best Gym in Mohali.jpg"
                alt="Alpha Zone reception with the gym logo on the brick wall"
              />
              <span>YOUR FIRST STEP IS THROUGH THIS DOOR.</span>
            </div>
            <div className="az-visit-copy">
              <p className="az-eyebrow">LESS SOMEDAY. MORE TODAY.</p>
              <h2>
                COME AS
                <br />
                YOU ARE.
                <br />
                <em>LEAVE STRONGER.</em>
              </h2>
              <p>
                You don’t need to be fit to start. You just need a place that
                helps you keep going. Let’s make Alpha Zone yours.
              </p>
              <a
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="az-button"
              >
                Book a visit <ArrowUpRight size={19} />
              </a>
            </div>
          </Reveal>
        </section>
        <section className="az-membership">
          <div className="az-container">
            <Reveal className="az-membership-inner">
              <div>
                <p className="az-eyebrow">MAKE THE COMMITMENT TO YOU</p>
                <h2>
                  YOUR NEXT LEVEL
                  <br />
                  STARTS <span>HERE.</span>
                </h2>
              </div>
              <div>
                <p>
                  A plan for your pace.
                  <br />A space for your ambition.
                </p>
                <Link
                  href="/gym-membership-mohali"
                  className="az-button az-button-dark"
                >
                  Explore memberships <ArrowUpRight size={20} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
        <section className="az-container az-section az-faq">
          <Reveal>
            <p className="az-eyebrow">BEFORE YOUR FIRST REP</p>
            <h2>
              LET’S CLEAR
              <br />
              THINGS UP.
            </h2>
            <Link href="/contact-us" className="az-text-link">
              Talk to our team <ArrowUpRight size={18} />
            </Link>
          </Reveal>
          <div>
            {faqs.map(([question, answer], i) => (
              <div className="az-faq-item" key={question}>
                <button
                  aria-expanded={faq === i}
                  aria-controls={`answer-${i}`}
                  onClick={() => setFaq(faq === i ? null : i)}
                >
                  {question}
                  {faq === i ? <Minus size={20} /> : <Plus size={20} />}
                </button>
                <div id={`answer-${i}`} hidden={faq !== i}>
                  <p>{answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
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
