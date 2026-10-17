"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  UserRound,
  Eye,
  EyeOff,
  ChevronDown,
  Dumbbell,
  Target,
  Award,
  Flame,
  Zap,
  Activity,
  LayoutGrid,
} from "lucide-react";
import { useAuthStore } from "@/store";
import "./marketing.css";

export const joinUrl =
  "https://wa.me/919779333155?text=Hi%20Alpha%20Zone!%20I%20would%20like%20to%20visit%20the%20gym.";

const gymServicesList = [
  {
    label: "All Services Overview",
    href: "/gym-services",
    icon: LayoutGrid,
    desc: "Explore full disciplines & facilities",
  },
  {
    label: "Weight Training",
    href: "/weight-training-mohali",
    icon: Dumbbell,
    desc: "Strength & resistance equipment",
  },
  {
    label: "Personal Training",
    href: "/personal-training-mohali",
    icon: Target,
    desc: "1-on-1 coaching & tailored plans",
  },
  {
    label: "HIIT & Group Classes",
    href: "/hiit-training-mohali",
    icon: Award,
    desc: "High intensity conditioning & burn",
  },
  {
    label: "CrossFit",
    href: "/crossfit-mohali",
    icon: Flame,
    desc: "Functional fitness & peak power",
  },
  {
    label: "Functional Training",
    href: "/functional-training-mohali",
    icon: Zap,
    desc: "Mobility, core & athletic stamina",
  },
  {
    label: "Cardio & Weight Loss",
    href: "/weight-loss-gym-mohali",
    icon: Activity,
    desc: "Fat loss, endurance & conditioning",
  },
];

export function Brand() {
  return (
    <Link href="/" className="az-brand">
      <Image width={57} height={57} src="/gymlogo.png" alt="Alpha Zone Gym" />
      <span>
        ALPHA ZONE<small>GYM · MOHALI</small>
      </span>
    </Link>
  );
}
export function MarketingHeader() {
  const [menu, setMenu] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const path = usePathname();
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    if (loginOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [loginOpen]);

  // Close menus on path change
  useEffect(() => {
    setServicesOpen(false);
    setMobileServicesOpen(false);
    setMenu(false);
  }, [path]);

  // Close desktop dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isServicesActive =
    path === "/gym-services" ||
    path.startsWith("/weight-training") ||
    path.startsWith("/personal-training") ||
    path.startsWith("/hiit-training") ||
    path.startsWith("/crossfit") ||
    path.startsWith("/functional-training") ||
    path.startsWith("/weight-loss");

  return (
    <>
      <header className="az-header">
        <div className="az-nav-wrap">
          <Brand />
          <nav
            aria-label="Main navigation"
            className={menu ? "az-nav is-open" : "az-nav"}
          >
            <Link
              href="/"
              onClick={() => setMenu(false)}
              aria-current={path === "/" ? "page" : undefined}
            >
              Home
            </Link>
            <Link
              href="/about-us"
              onClick={() => setMenu(false)}
              aria-current={path === "/about-us" ? "page" : undefined}
            >
              About
            </Link>

            {/* Desktop Gym Services Dropdown */}
            <div
              ref={dropdownRef}
              className="az-nav-dropdown-wrap"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <Link
                href="/gym-services"
                className="az-nav-dropdown-trigger"
                onClick={() => setServicesOpen(false)}
                aria-current={isServicesActive ? "page" : undefined}
                aria-expanded={servicesOpen}
                aria-haspopup="true"
              >
                <span>Gym Services</span>
                <ChevronDown
                  size={14}
                  className={`az-chevron ${servicesOpen ? "is-open" : ""}`}
                />
              </Link>

              <div
                className={`az-dropdown-menu ${servicesOpen ? "is-visible" : ""}`}
                role="menu"
                aria-label="Gym Services menu"
              >
                <div className="az-dropdown-header">
                  <span className="az-dropdown-eyebrow">OUR TRAINING DISCIPLINES</span>
                </div>
                <div className="az-dropdown-items">
                  {gymServicesList.map((svc) => {
                    const SvcIcon = svc.icon;
                    const isActive = path === svc.href;
                    return (
                      <Link
                        key={svc.href}
                        href={svc.href}
                        onClick={() => setServicesOpen(false)}
                        className={`az-dropdown-item ${isActive ? "is-active" : ""}`}
                        role="menuitem"
                        aria-current={isActive ? "page" : undefined}
                      >
                        <div className="az-dropdown-icon">
                          <SvcIcon size={16} />
                        </div>
                        <div className="az-dropdown-text">
                          <span className="az-dropdown-title">{svc.label}</span>
                          <span className="az-dropdown-desc">{svc.desc}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Accordion for Gym Services */}
            <div className="az-mobile-dropdown">
              <div className="az-mobile-dropdown-header">
                <Link
                  href="/gym-services"
                  onClick={() => setMenu(false)}
                  aria-current={isServicesActive ? "page" : undefined}
                >
                  Gym Services
                </Link>
                <button
                  type="button"
                  className="az-mobile-expand-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileServicesOpen(!mobileServicesOpen);
                  }}
                  aria-label="Toggle gym services submenu"
                >
                  <ChevronDown
                    size={18}
                    className={`az-mobile-chevron ${mobileServicesOpen ? "is-rotated" : ""}`}
                  />
                </button>
              </div>
              {mobileServicesOpen && (
                <div className="az-mobile-subnav">
                  {gymServicesList.map((svc) => {
                    const SvcIcon = svc.icon;
                    const isActive = path === svc.href;
                    return (
                      <Link
                        key={svc.href}
                        href={svc.href}
                        onClick={() => {
                          setMenu(false);
                          setMobileServicesOpen(false);
                        }}
                        className={`az-mobile-sublink ${isActive ? "is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <SvcIcon size={15} />
                        <span>{svc.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <Link
              href="/gym-membership-mohali"
              onClick={() => setMenu(false)}
              aria-current={path === "/gym-membership-mohali" ? "page" : undefined}
            >
              Membership
            </Link>
            <Link
              href="/#gallery"
              onClick={() => setMenu(false)}
            >
              Gallery
            </Link>
            <Link
              href="/blog"
              onClick={() => setMenu(false)}
              aria-current={path.startsWith("/blog") || path === "/best-gym-in-sohana-mohali" || path === "/weight-training-for-beginners-mohali" || path === "/best-gym-in-mohali" || path === "/affordable-gym-in-mohali" || path === "/personal-trainer-in-mohali" || path === "/crossfit-gym-in-mohali" || path === "/gym-membership-in-mohali" || path === "/hiit-training-in-mohali" ? "page" : undefined}
            >
              Blog
            </Link>
            <Link
              href="/contact-us"
              onClick={() => setMenu(false)}
              aria-current={path === "/contact-us" ? "page" : undefined}
            >
              Contact
            </Link>
          </nav>
          <div className="az-header-actions">
            <button
              className="az-login"
              aria-label="Member login"
              onClick={() => setLoginOpen(true)}
            >
              <UserRound size={15} />
              <span>Member login</span>
            </button>
            <a
              className="az-button az-small"
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
            >
              Join the zone <ArrowUpRight size={16} />
            </a>
            <button
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              className="az-menu"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <dialog
        ref={dialog}
        className="az-dialog az-login-dialog"
        onCancel={() => setLoginOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setLoginOpen(false);
        }}
      >
        <button
          className="az-close"
          aria-label="Close login"
          onClick={() => setLoginOpen(false)}
        >
          <X />
        </button>
        <p className="az-eyebrow">WELCOME BACK</p>
        <h2>Back in the zone.</h2>
        <p>Sign in to your Alpha Zone account.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const data = new FormData(e.currentTarget);
            try {
              await login({
                email: String(data.get("email")),
                password: String(data.get("password")),
              });
              setLoginOpen(false);
              router.push("/dashboard");
            } catch {
              setError("Unable to sign in. Check your email and password.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input autoComplete="username" name="email" type="email" required />
          </label>
          <label>
            Password
            <div className="az-password">
              <input
                autoComplete="current-password"
                name="password"
                type={visible ? "text" : "password"}
                required
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <p role="alert">{error}</p>}
          <button disabled={busy} className="az-button">
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
      </dialog>
    </>
  );
}
export function MarketingFooter() {
  return (
    <footer className="az-footer">
      <div className="az-container az-footer-top">
        <Brand />
        <p>Stronger. Fitter. More you.</p>
        <div className="az-footer-links">
          <Link href="/app-page">
            Get the app <ArrowUpRight size={14} />
          </Link>
          <Link href="/blog">
            Fitness blog <ArrowUpRight size={14} />
          </Link>
          <Link href="/contact-us">
            Find us <ArrowUpRight size={14} />
          </Link>
          <a href="tel:+919779333155">+91 97793 33155</a>
        </div>
        <div className="az-footer-socials" aria-label="Official Social Media Profiles">
          <span className="az-footer-socials-label">Follow Us</span>
          <div className="az-footer-socials-list">
            <a
              href="https://www.instagram.com/alphazonegym/"
              target="_blank"
              rel="noopener noreferrer me"
              aria-label="Follow Alpha Zone Gym on Instagram"
              title="Alpha Zone Gym on Instagram"
              className="az-social-btn az-social-instagram"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61586834013922"
              target="_blank"
              rel="noopener noreferrer me"
              aria-label="Connect with Alpha Zone Gym on Facebook"
              title="Alpha Zone Gym on Facebook"
              className="az-social-btn az-social-facebook"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@Alphazonegym"
              target="_blank"
              rel="noopener noreferrer me"
              aria-label="Subscribe to Alpha Zone Gym on YouTube"
              title="Alpha Zone Gym on YouTube"
              className="az-social-btn az-social-youtube"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="az-container az-footer-bottom">
        <span>
          © {new Date().getFullYear()} Alpha Zone Gym. All rights reserved.
        </span>
        <span>SOHANA, MOHALI · BUILT FOR YOUR NEXT LEVEL</span>
        <Link href="/privacy-policy">Privacy policy</Link>
      </div>
    </footer>
  );
}
