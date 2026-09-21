"use client";
import { ReactNode } from "react";
import { MarketingHeader, MarketingFooter } from "./MarketingChrome";
export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="az-site">
      <MarketingHeader />
      <main className="az-interior">{children}</main>
      <MarketingFooter />
    </div>
  );
}
