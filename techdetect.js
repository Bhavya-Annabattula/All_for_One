// techdetect.js
// This function is injected into the PAGE's own JS context via
// chrome.scripting.executeScript, so it can see page globals like
// window.React, window.wp, window.Shopify, etc. that content.js
// (isolated world) cannot see.
//
// Returns a plain object: { categories: { [categoryName]: [{name, evidence}] } }

function detectTechStack() {
  const found = {}; // category -> Map(name -> evidence[])

  function add(category, name, evidence) {
    if (!found[category]) found[category] = new Map();
    if (!found[category].has(name)) found[category].set(name, new Set());
    found[category].get(name).add(evidence);
  }

  const html = document.documentElement.outerHTML || "";
  const scripts = Array.from(document.scripts).map(s => s.src).filter(Boolean);
  const scriptSrcBlob = scripts.join(" ");
  const linkHrefs = Array.from(document.querySelectorAll("link[href]")).map(l => l.href).join(" ");
  const metaGenerator = (document.querySelector('meta[name="generator"]') || {}).content || "";
  const bodyAttrs = document.body ? document.body.getAttributeNames().join(" ") : "";
  const htmlAttrs = document.documentElement.getAttributeNames().join(" ");

  // ---------- FRAMEWORKS ----------
  if (window.React || document.querySelector("[data-reactroot], #root, #__next")) {
    if (window.React || html.includes("data-reactroot") || window.__NEXT_DATA__) {
      add("Frameworks", "React", "window.React / data-reactroot detected");
    }
  }
  if (window.__NEXT_DATA__ || scriptSrcBlob.includes("_next/static")) {
    add("Frameworks", "Next.js", "_next/static assets or __NEXT_DATA__ found");
  }
  if (window.Vue || document.querySelector("[data-v-app]") || htmlAttrs.includes("data-v-")) {
    add("Frameworks", "Vue.js", "window.Vue or data-v- attributes found");
  }
  if (window.__NUXT__ || scriptSrcBlob.includes("_nuxt/")) {
    add("Frameworks", "Nuxt.js", "_nuxt/ assets or __NUXT__ found");
  }
  if (window.ng || document.querySelector("[ng-version]")) {
    const ver = document.querySelector("[ng-version]");
    add("Frameworks", "Angular", ver ? `ng-version="${ver.getAttribute("ng-version")}"` : "window.ng detected");
  }
  if (window.angular) {
    add("Frameworks", "AngularJS", "window.angular detected");
  }
  if (window.__svelte || html.includes("svelte-")) {
    add("Frameworks", "Svelte", "svelte- class/id markers found");
  }
  if (window.jQuery || window.$ && window.$.fn && window.$.fn.jquery) {
    const v = window.jQuery ? window.jQuery.fn.jquery : window.$.fn.jquery;
    add("Frameworks", "jQuery", v ? `version ${v}` : "window.jQuery detected");
  }
  if (window.Alpine) {
    add("Frameworks", "Alpine.js", "window.Alpine detected");
  }
  if (window.htmx) {
    add("Frameworks", "htmx", "window.htmx detected");
  }

  // ---------- CMS / SITE BUILDERS ----------
  if (/wordpress/i.test(metaGenerator) || scriptSrcBlob.includes("/wp-content/") || scriptSrcBlob.includes("/wp-includes/")) {
    add("CMS", "WordPress", "wp-content/wp-includes paths or generator meta tag");
  }
  if (window.Shopify || scriptSrcBlob.includes("cdn.shopify.com")) {
    add("CMS", "Shopify", "window.Shopify or cdn.shopify.com script found");
  }
  if (html.includes("wix-") || scriptSrcBlob.includes("static.wixstatic.com")) {
    add("CMS", "Wix", "wixstatic.com assets found");
  }
  if (html.includes("data-wf-") || scriptSrcBlob.includes("website-files.com")) {
    add("CMS", "Webflow", "data-wf- attributes or website-files.com assets");
  }
  if (/squarespace/i.test(metaGenerator) || scriptSrcBlob.includes("squarespace.com")) {
    add("CMS", "Squarespace", "generator meta tag or squarespace.com assets");
  }
  if (window.Drupal || html.includes("Drupal.settings")) {
    add("CMS", "Drupal", "window.Drupal detected");
  }
  if (/joomla/i.test(metaGenerator)) {
    add("CMS", "Joomla", "generator meta tag");
  }
  if (window.Ghost || html.includes("ghost-url")) {
    add("CMS", "Ghost", "ghost markers found");
  }

  // ---------- ANALYTICS / TRACKING ----------
  if (window.ga || window.gtag || scriptSrcBlob.includes("google-analytics.com") || scriptSrcBlob.includes("googletagmanager.com/gtag")) {
    add("Analytics", "Google Analytics", "gtag/ga script or global function found");
  }
  if (window.dataLayer || scriptSrcBlob.includes("googletagmanager.com/gtm.js")) {
    add("Analytics", "Google Tag Manager", "window.dataLayer or gtm.js script found");
  }
  if (window.fbq || scriptSrcBlob.includes("connect.facebook.net")) {
    add("Analytics", "Meta Pixel", "window.fbq or connect.facebook.net script found");
  }
  if (window.hj || scriptSrcBlob.includes("static.hotjar.com")) {
    add("Analytics", "Hotjar", "window.hj or hotjar script found");
  }
  if (window.analytics && window.analytics.constructor && scriptSrcBlob.includes("cdn.segment.com")) {
    add("Analytics", "Segment", "cdn.segment.com script found");
  }
  if (window.mixpanel) {
    add("Analytics", "Mixpanel", "window.mixpanel detected");
  }
  if (window.posthog) {
    add("Analytics", "PostHog", "window.posthog detected");
  }
  if (scriptSrcBlob.includes("clarity.ms")) {
    add("Analytics", "Microsoft Clarity", "clarity.ms script found");
  }

  // ---------- CDN / HOSTING (best-effort, DOM-visible clues only) ----------
  if (scriptSrcBlob.includes("cdn.jsdelivr.net")) {
    add("CDN", "jsDelivr", "jsdelivr.net script found");
  }
  if (scriptSrcBlob.includes("cdnjs.cloudflare.com") || linkHrefs.includes("cdnjs.cloudflare.com")) {
    add("CDN", "Cloudflare (cdnjs)", "cdnjs.cloudflare.com asset found");
  }
  if (scriptSrcBlob.includes("unpkg.com")) {
    add("CDN", "unpkg", "unpkg.com script found");
  }
  if (document.querySelector('meta[name="vercel"]') || scriptSrcBlob.includes("_vercel/")) {
    add("Hosting", "Vercel", "_vercel/ assets or meta tag found");
  }
  if (html.includes("netlify")) {
    add("Hosting", "Netlify", "netlify markers found in page");
  }

  // ---------- FONTS / UI ----------
  if (linkHrefs.includes("fonts.googleapis.com") || linkHrefs.includes("fonts.gstatic.com")) {
    add("Fonts & UI", "Google Fonts", "fonts.googleapis.com/gstatic.com link found");
  }
  if (scriptSrcBlob.includes("kit.fontawesome.com") || linkHrefs.includes("font-awesome")) {
    add("Fonts & UI", "Font Awesome", "fontawesome asset found");
  }
  if (scriptSrcBlob.includes("cdn.tailwindcss.com") || html.includes("tailwind")) {
    add("Fonts & UI", "Tailwind CSS", "tailwindcss reference found");
  }
  if (linkHrefs.includes("bootstrap") || scriptSrcBlob.includes("bootstrap")) {
    add("Fonts & UI", "Bootstrap", "bootstrap asset found");
  }

  // ---------- PAYMENTS ----------
  if (window.Stripe || scriptSrcBlob.includes("js.stripe.com")) {
    add("Payments", "Stripe", "window.Stripe or js.stripe.com script found");
  }
  if (scriptSrcBlob.includes("paypal.com/sdk") || scriptSrcBlob.includes("paypalobjects.com")) {
    add("Payments", "PayPal", "paypal sdk/assets found");
  }

  // ---------- Convert Maps/Sets into plain arrays for messaging ----------
  const categories = {};
  Object.keys(found).forEach(cat => {
    categories[cat] = Array.from(found[cat].entries()).map(([name, evidenceSet]) => ({
      name,
      evidence: Array.from(evidenceSet)[0] // just show first piece of evidence
    }));
  });

  return { categories, scannedAt: Date.now() };
}
