"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Google tag (GA4 / Google Ads) and Meta Pixel for the public Commerce OS site, switched on by setting
// NEXT_PUBLIC_GOOGLE_TAG_ID (G-… or AW-…; comma-separate several) and NEXT_PUBLIC_META_PIXEL_ID
// in Vercel. Never loaded inside the app. Also remembers which ad or campaign brought the visitor.
const GOOGLE = (process.env.NEXT_PUBLIC_GOOGLE_TAG_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
const META = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid", "msclkid"];

// First visit with UTM tags or an ad click id, kept 90 days (same format as abata.tech).
export function attribution(): Record<string, string> {
  try {
    const saved = JSON.parse(localStorage.getItem("abata_attr") || "null");
    if (saved?.t && Date.now() - saved.t < 90 * 86400000) {
      const { t: _t, ...rest } = saved;
      void _t;
      return rest;
    }
  } catch {}
  return {};
}
// A sent form is the conversion ads optimise for.
export function reportLead(form: string) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; dataLayer?: unknown[] };
  try { w.gtag?.("event", "generate_lead", { form, currency: "INR", value: 1 }); } catch {}
  try { (w.dataLayer = w.dataLayer || []).push({ event: "generate_lead", form }); } catch {}
  try { w.fbq?.("track", "Lead"); } catch {}
}

export function AdTags() {
  const path = usePathname() || "/";
  const app = /^\/(app|onboarding|login|api)(\/|$)/.test(path);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const fresh: Record<string, string | number> = {};
    for (const k of KEYS) { const v = q.get(k); if (v) fresh[k] = v.slice(0, 300); }
    if (Object.keys(fresh).length) {
      fresh.landing_page = location.pathname;
      fresh.referrer = document.referrer.slice(0, 300);
      fresh.t = Date.now();
      try { localStorage.setItem("abata_attr", JSON.stringify(fresh)); } catch {}
    }
  }, []);
  if (app) return null;
  return (
    <>
      {GOOGLE.length > 0 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE[0]}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${GOOGLE.map((id) => `gtag('config','${id}');`).join("")}`}
          </Script>
        </>
      )}
      {META && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
