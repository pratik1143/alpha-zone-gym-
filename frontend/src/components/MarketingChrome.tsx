"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
        <div>
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
