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
} from "lucide-react";
import { useAuthStore } from "@/store";
import "./marketing.css";
export const joinUrl =
  "https://wa.me/919779333155?text=Hi%20Alpha%20Zone!%20I%20would%20like%20to%20visit%20the%20gym.";
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
  const [loginOpen, setLoginOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const path = usePathname();
  const login = useAuthStore((s) => s.login);
  useEffect(() => {
    if (loginOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [loginOpen]);
  const links = [
    ["Home", "/"],
    ["About", "/about-us"],
    ["Programs", "/gym-services"],
    ["Membership", "/gym-membership-mohali"],
    ["Gallery", "/#gallery"],
    ["Contact", "/contact-us"],
  ];
  return (
    <>
      <header className="az-header">
        <div className="az-nav-wrap">
          <Brand />
          <nav
            aria-label="Main navigation"
            className={menu ? "az-nav is-open" : "az-nav"}
          >
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMenu(false)}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
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
