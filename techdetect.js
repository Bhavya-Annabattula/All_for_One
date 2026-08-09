// techdetect.js
// This function is injected into the PAGE's own JS context via
// chrome.scripting.executeScript, so it can see page globals like
// window.React, window.wp, window.Shopify, etc. that content.js
// (isolated world) cannot see.
//
// Returns a plain object: { categories: { [categoryName]: [{name, evidence}] }, scannedAt }

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
  const inlineScriptBlob = Array.from(document.scripts)
    .filter(s => !s.src)
    .map(s => s.textContent || "")
    .join(" ")
    .slice(0, 200000); // cap to avoid perf issues on huge pages
  const linkHrefs = Array.from(document.querySelectorAll("link[href]")).map(l => l.href).join(" ");
  const metaGenerator = (document.querySelector('meta[name="generator"]') || {}).content || "";
  const bodyAttrs = document.body ? document.body.getAttributeNames().join(" ") : "";
  const htmlAttrs = document.documentElement.getAttributeNames().join(" ");
  const cookies = document.cookie || "";

  // =====================================================================
  // FRAMEWORKS (frontend)
  // =====================================================================
  if (window.React || document.querySelector("[data-reactroot], #root, #__next")) {
    add("Frameworks", "React", "window.React / data-reactroot detected");
  }
  if (window.__NEXT_DATA__ || scriptSrcBlob.includes("_next/static")) {
    add("Frameworks", "Next.js", "_next/static assets or __NEXT_DATA__ found");
  }
  if (window.__remixContext || html.includes("__remixManifest")) {
    add("Frameworks", "Remix", "__remixContext / __remixManifest found");
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
  if (scriptSrcBlob.includes("/_app/immutable/") || html.includes("data-sveltekit")) {
    add("Frameworks", "SvelteKit", "_app/immutable assets or data-sveltekit attrs found");
  }
  if (window.Qwik || htmlAttrs.includes("q:container")) {
    add("Frameworks", "Qwik", "q:container attribute or window.Qwik found");
  }
  if (window._$HY || html.includes("data-hk=")) {
    add("Frameworks", "SolidJS / SolidStart", "data-hk hydration markers found");
  }
  if (window.jQuery || (window.$ && window.$.fn && window.$.fn.jquery)) {
    const v = window.jQuery ? window.jQuery.fn.jquery : window.$.fn.jquery;
    add("Frameworks", "jQuery", v ? `version ${v}` : "window.jQuery detected");
  }
  if (window.Alpine) {
    add("Frameworks", "Alpine.js", "window.Alpine detected");
  }
  if (window.htmx) {
    add("Frameworks", "htmx", "window.htmx detected");
  }
  if (window.Ember || html.includes("ember-view")) {
    add("Frameworks", "Ember.js", "window.Ember or ember-view class found");
  }
  if (window.Backbone) {
    add("Frameworks", "Backbone.js", "window.Backbone detected");
  }
  if (window.Lit || customElements.get === "function" && html.includes("lit-")) {
    add("Frameworks", "Lit", "window.Lit or lit- markers found");
  }
  if (window.Astro || html.includes("astro-island")) {
    add("Frameworks", "Astro", "astro-island custom elements found");
  }
  if (scriptSrcBlob.includes("gatsby") || window.___gatsby) {
    add("Frameworks", "Gatsby", "window.___gatsby or gatsby assets found");
  }

  // =====================================================================
  // LANGUAGES / RUNTIME / COMPILE TARGETS
  // =====================================================================
  if (window.Deno) {
    add("Language & Runtime", "Deno", "window.Deno detected (unusual client-side, likely SSR artifact)");
  }
  if (document.querySelector('script[type="module"]')) {
    add("Language & Runtime", "ES Modules", "type=module script tags found");
  }
  if (scriptSrcBlob.match(/\.wasm(\?|$)/) || inlineScriptBlob.includes("WebAssembly.instantiate")) {
    add("Language & Runtime", "WebAssembly", "WASM binary or WebAssembly API usage found");
  }
  if (window.Go && window.Go.prototype && window.Go.prototype.importObject) {
    add("Language & Runtime", "Go (compiled to WASM)", "Go WASM runtime glue detected");
  }
  if (window.Blazor || html.includes("_framework/blazor")) {
    add("Language & Runtime", "Blazor (.NET WASM)", "_framework/blazor assets found");
  }
  if (window.pyodide || scriptSrcBlob.includes("pyodide")) {
    add("Language & Runtime", "Pyodide (Python in browser)", "pyodide script found");
  }
  if (window.Elm) {
    add("Language & Runtime", "Elm", "window.Elm detected");
  }
  if (scriptSrcBlob.includes(".dart.js") || html.includes("flutter-view")) {
    add("Language & Runtime", "Dart / Flutter Web", "dart.js bundle or flutter-view element found");
  }
  if (document.querySelector('meta[name="typescript"]') || scriptSrcBlob.match(/\.ts\.js|__typescript/)) {
    add("Language & Runtime", "TypeScript (build artifact)", "typescript-related markers found");
  }

  // =====================================================================
  // STATE MANAGEMENT
  // =====================================================================
  if (window.__REDUX_DEVTOOLS_EXTENSION__ || inlineScriptBlob.includes("redux")) {
    add("State Management", "Redux", "Redux DevTools hook or redux reference found");
  }
  if (window.__MOBX_DEVTOOLS_GLOBAL_HOOK__) {
    add("State Management", "MobX", "MobX DevTools hook found");
  }
  if (window.__ZUSTAND__ || inlineScriptBlob.includes("zustand")) {
    add("State Management", "Zustand", "zustand reference found");
  }
  if (inlineScriptBlob.includes("recoil") || scriptSrcBlob.includes("recoil")) {
    add("State Management", "Recoil", "recoil reference found");
  }
  if (window.__APOLLO_CLIENT__ || inlineScriptBlob.includes("ApolloClient")) {
    add("State Management", "Apollo Client (GraphQL)", "window.__APOLLO_CLIENT__ or ApolloClient reference found");
  }
  if (window.__REACT_QUERY_STATE__ || inlineScriptBlob.includes("react-query") || inlineScriptBlob.includes("@tanstack/query")) {
    add("State Management", "TanStack / React Query", "react-query state markers found");
  }
  if (window.Vuex || inlineScriptBlob.includes("pinia")) {
    add("State Management", window.Vuex ? "Vuex" : "Pinia", "Vue state library reference found");
  }

  // =====================================================================
  // CMS / SITE BUILDERS
  // =====================================================================
  if (/wordpress/i.test(metaGenerator) || scriptSrcBlob.includes("/wp-content/") || scriptSrcBlob.includes("/wp-includes/")) {
    add("CMS", "WordPress", "wp-content/wp-includes paths or generator meta tag");
  }
  if (window.elementorFrontend || scriptSrcBlob.includes("elementor")) {
    add("CMS", "Elementor (WP page builder)", "elementor assets found");
  }
  if (scriptSrcBlob.includes("woocommerce") || bodyAttrs.includes("woocommerce")) {
    add("CMS", "WooCommerce", "woocommerce assets/classes found");
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
  if (scriptSrcBlob.includes("cdn.contentful.com") || inlineScriptBlob.includes("contentful")) {
    add("CMS", "Contentful (headless)", "contentful reference found");
  }
  if (scriptSrcBlob.includes("sanity.io") || inlineScriptBlob.includes("sanityClient")) {
    add("CMS", "Sanity (headless)", "sanity.io reference found");
  }
  if (/hubspot/i.test(scriptSrcBlob) || window._hsq) {
    add("CMS", "HubSpot CMS", "window._hsq or hubspot assets found");
  }
  if (scriptSrcBlob.includes("cdn.builder.io")) {
    add("CMS", "Builder.io", "builder.io assets found");
  }
  if (window.Framer || scriptSrcBlob.includes("framerusercontent.com")) {
    add("CMS", "Framer", "framerusercontent.com assets found");
  }

  // =====================================================================
  // BACKEND / API HINTS (best-effort, only what's visible client-side)
  // =====================================================================
  if (inlineScriptBlob.includes("/graphql") || scriptSrcBlob.includes("graphql")) {
    add("Backend / API", "GraphQL endpoint", "reference to /graphql path found");
  }
  if (document.querySelector('meta[name="csrf-token"]') && html.includes("laravel")) {
    add("Backend / API", "Laravel (PHP)", "csrf-token meta + laravel markers found");
  }
  if (cookies.includes("PHPSESSID")) {
    add("Backend / API", "PHP", "PHPSESSID cookie found");
  }
  if (cookies.includes("JSESSIONID")) {
    add("Backend / API", "Java (Servlet/Spring)", "JSESSIONID cookie found");
  }
  if (cookies.includes("ASP.NET_SessionId") || html.includes("__VIEWSTATE")) {
    add("Backend / API", "ASP.NET", "ASP.NET session cookie or __VIEWSTATE field found");
  }
  if (cookies.match(/django|csrftoken/i)) {
    add("Backend / API", "Django (Python)", "csrftoken cookie found");
  }
  if (window.__RAILS_ENV__ || cookies.includes("_session_id")) {
    add("Backend / API", "Ruby on Rails", "rails-style session cookie found");
  }
  if (inlineScriptBlob.includes("firebaseio.com") || window.firebase) {
    add("Backend / API", "Firebase", "firebase SDK or firebaseio.com reference found");
  }
  if (inlineScriptBlob.includes("supabase.co") || window.supabase) {
    add("Backend / API", "Supabase", "supabase reference found");
  }
  if (scriptSrcBlob.includes("amazonaws.com") || inlineScriptBlob.includes("execute-api")) {
    add("Backend / API", "AWS (API Gateway/S3 assets)", "amazonaws.com reference found");
  }

  // =====================================================================
  // ANALYTICS / TRACKING
  // =====================================================================
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
  if (window.analytics && scriptSrcBlob.includes("cdn.segment.com")) {
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
  if (window.amplitude) {
    add("Analytics", "Amplitude", "window.amplitude detected");
  }
  if (window.heap) {
    add("Analytics", "Heap", "window.heap detected");
  }
  if (scriptSrcBlob.includes("snowplow")) {
    add("Analytics", "Snowplow", "snowplow script found");
  }
  if (window.Sentry) {
    add("Analytics", "Sentry (error tracking)", "window.Sentry detected");
  }
  if (window.LogRocket) {
    add("Analytics", "LogRocket", "window.LogRocket detected");
  }
  if (window.datadog || scriptSrcBlob.includes("datadoghq")) {
    add("Analytics", "Datadog RUM", "datadog reference found");
  }
  if (window.bugsnag || window.Bugsnag) {
    add("Analytics", "Bugsnag", "window.Bugsnag detected");
  }

  // =====================================================================
  // CDN / HOSTING
  // =====================================================================
  if (scriptSrcBlob.includes("cdn.jsdelivr.net")) {
    add("CDN & Hosting", "jsDelivr", "jsdelivr.net script found");
  }
  if (scriptSrcBlob.includes("cdnjs.cloudflare.com") || linkHrefs.includes("cdnjs.cloudflare.com")) {
    add("CDN & Hosting", "Cloudflare (cdnjs)", "cdnjs.cloudflare.com asset found");
  }
  if (scriptSrcBlob.includes("unpkg.com")) {
    add("CDN & Hosting", "unpkg", "unpkg.com script found");
  }
  if (document.querySelector('meta[name="vercel"]') || scriptSrcBlob.includes("_vercel/")) {
    add("CDN & Hosting", "Vercel", "_vercel/ assets or meta tag found");
  }
  if (html.includes("netlify")) {
    add("CDN & Hosting", "Netlify", "netlify markers found in page");
  }
  if (scriptSrcBlob.includes("fastly")) {
    add("CDN & Hosting", "Fastly", "fastly reference found");
  }
  if (scriptSrcBlob.includes("akamaized.net") || scriptSrcBlob.includes("akamai")) {
    add("CDN & Hosting", "Akamai", "akamai reference found");
  }
  if (scriptSrcBlob.includes("azureedge.net")) {
    add("CDN & Hosting", "Azure CDN", "azureedge.net reference found");
  }

  // =====================================================================
  // BUILD TOOLS (visible via source-map comments / chunk naming patterns)
  // =====================================================================
  if (scriptSrcBlob.match(/\/assets\/index-[a-zA-Z0-9]{6,}\.js/) || html.includes("vite")) {
    add("Build Tools", "Vite", "vite-style hashed asset naming found");
  }
  if (scriptSrcBlob.match(/chunk-[a-zA-Z0-9]{6,}\.js/) || scriptSrcBlob.includes("webpackJsonp")) {
    add("Build Tools", "Webpack", "webpack-style chunk naming or webpackJsonp found");
  }
  if (inlineScriptBlob.includes("parcelRequire")) {
    add("Build Tools", "Parcel", "parcelRequire global found");
  }
  if (scriptSrcBlob.includes("__esbuild") || inlineScriptBlob.includes("esbuild")) {
    add("Build Tools", "esbuild", "esbuild reference found");
  }
  if (inlineScriptBlob.includes("System.register")) {
    add("Build Tools", "SystemJS", "System.register module format found");
  }

  // =====================================================================
  // FONTS / UI FRAMEWORKS
  // =====================================================================
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
  if (linkHrefs.includes("bulma")) {
    add("Fonts & UI", "Bulma", "bulma stylesheet found");
  }
  if (html.includes("mantine-") || scriptSrcBlob.includes("@mantine")) {
    add("Fonts & UI", "Mantine", "mantine class markers found");
  }
  if (html.includes("chakra-") || scriptSrcBlob.includes("@chakra-ui")) {
    add("Fonts & UI", "Chakra UI", "chakra- class markers found");
  }
  if (html.includes("MuiBox") || html.includes("MuiButton") || scriptSrcBlob.includes("@mui")) {
    add("Fonts & UI", "Material UI (MUI)", "Mui* class markers found");
  }
  if (html.includes("ant-") && scriptSrcBlob.includes("antd")) {
    add("Fonts & UI", "Ant Design", "ant- class markers or antd bundle found");
  }
  if (scriptSrcBlob.includes("cdn.jsdelivr.net/npm/animate.css") || linkHrefs.includes("animate.css")) {
    add("Fonts & UI", "Animate.css", "animate.css stylesheet found");
  }

  // =====================================================================
  // PAYMENTS
  // =====================================================================
  if (window.Stripe || scriptSrcBlob.includes("js.stripe.com")) {
    add("Payments", "Stripe", "window.Stripe or js.stripe.com script found");
  }
  if (scriptSrcBlob.includes("paypal.com/sdk") || scriptSrcBlob.includes("paypalobjects.com")) {
    add("Payments", "PayPal", "paypal sdk/assets found");
  }
  if (scriptSrcBlob.includes("checkout.razorpay.com")) {
    add("Payments", "Razorpay", "razorpay checkout script found");
  }
  if (scriptSrcBlob.includes("js.squareup.com")) {
    add("Payments", "Square", "squareup.com script found");
  }
  if (scriptSrcBlob.includes("checkout.com")) {
    add("Payments", "Checkout.com", "checkout.com script found");
  }
  if (scriptSrcBlob.includes("braintreegateway.com")) {
    add("Payments", "Braintree", "braintreegateway.com script found");
  }
  if (scriptSrcBlob.includes("cashfree.com")) {
    add("Payments", "Cashfree", "cashfree.com script found");
  }

  // =====================================================================
  // SECURITY-VISIBLE CLUES (client-observable only — not a real audit)
  // =====================================================================
  if (scriptSrcBlob.includes("hcaptcha.com")) {
    add("Security", "hCaptcha", "hcaptcha.com script found");
  }
  if (scriptSrcBlob.includes("recaptcha")) {
    add("Security", "Google reCAPTCHA", "recaptcha script found");
  }
  if (scriptSrcBlob.includes("turnstile")) {
    add("Security", "Cloudflare Turnstile", "turnstile script found");
  }
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    add("Security", "Content-Security-Policy (meta tag)", "CSP meta tag present in document");
  }

  // =====================================================================
  // TESTING / DEV TOOLING (occasionally left in production bundles)
  // =====================================================================
  if (window.Cypress) {
    add("Testing", "Cypress (test runner artifact)", "window.Cypress detected");
  }
  if (window.__vueDevtoolsHook || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    add("Testing", "Framework DevTools Hook", "devtools global hook present (dev build likely)");
  }
  if (document.querySelector("[data-testid]")) {
    add("Testing", "data-testid attributes", "test-id attributes found in DOM (testing-library convention)");
  }

  // =====================================================================
  // HOSTNAME-BASED FALLBACK
  // For closed-source / heavily obfuscated platforms where DOM/global
  // sniffing yields little or nothing. This supplements rather than
  // replaces the checks above, and is the most reliable signal on sites
  // like YouTube, Gmail, Claude.ai, etc.
  // =====================================================================
  const hostnamePlatformMap = [
    // Google products
    { match: /(^|\.)youtube\.com$/, category: "Known Platform", name: "YouTube (Google)" },
    { match: /(^|\.)google\.com$/, category: "Known Platform", name: "Google Search / Workspace" },
    { match: /(^|\.)mail\.google\.com$/, category: "Known Platform", name: "Gmail (Google)" },
    { match: /(^|\.)docs\.google\.com$/, category: "Known Platform", name: "Google Docs/Sheets/Slides" },
    { match: /(^|\.)drive\.google\.com$/, category: "Known Platform", name: "Google Drive" },
    { match: /(^|\.)maps\.google\.com$/, category: "Known Platform", name: "Google Maps" },
    { match: /(^|\.)meet\.google\.com$/, category: "Known Platform", name: "Google Meet" },

    // AI products
    { match: /(^|\.)claude\.ai$/, category: "Known Platform", name: "Claude (Anthropic)" },
    { match: /(^|\.)chatgpt\.com$/, category: "Known Platform", name: "ChatGPT (OpenAI)" },
    { match: /(^|\.)openai\.com$/, category: "Known Platform", name: "OpenAI" },
    { match: /(^|\.)gemini\.google\.com$/, category: "Known Platform", name: "Gemini (Google)" },
    { match: /(^|\.)perplexity\.ai$/, category: "Known Platform", name: "Perplexity AI" },
    { match: /(^|\.)copilot\.microsoft\.com$/, category: "Known Platform", name: "Microsoft Copilot" },

    // Social / communication
    { match: /(^|\.)facebook\.com$/, category: "Known Platform", name: "Facebook (Meta)" },
    { match: /(^|\.)instagram\.com$/, category: "Known Platform", name: "Instagram (Meta)" },
    { match: /(^|\.)whatsapp\.com$/, category: "Known Platform", name: "WhatsApp (Meta)" },
    { match: /(^|\.)twitter\.com$|(^|\.)x\.com$/, category: "Known Platform", name: "X (formerly Twitter)" },
    { match: /(^|\.)linkedin\.com$/, category: "Known Platform", name: "LinkedIn (Microsoft)" },
    { match: /(^|\.)reddit\.com$/, category: "Known Platform", name: "Reddit" },
    { match: /(^|\.)tiktok\.com$/, category: "Known Platform", name: "TikTok (ByteDance)" },
    { match: /(^|\.)snapchat\.com$/, category: "Known Platform", name: "Snapchat" },
    { match: /(^|\.)pinterest\.com$/, category: "Known Platform", name: "Pinterest" },
    { match: /(^|\.)discord\.com$/, category: "Known Platform", name: "Discord" },
    { match: /(^|\.)slack\.com$/, category: "Known Platform", name: "Slack (Salesforce)" },
    { match: /(^|\.)telegram\.org$/, category: "Known Platform", name: "Telegram" },
    { match: /(^|\.)zoom\.us$/, category: "Known Platform", name: "Zoom" },

    // Shopping / commerce
    { match: /(^|\.)amazon\.[a-z.]+$/, category: "Known Platform", name: "Amazon" },
    { match: /(^|\.)ebay\.com$/, category: "Known Platform", name: "eBay" },
    { match: /(^|\.)etsy\.com$/, category: "Known Platform", name: "Etsy" },
    { match: /(^|\.)flipkart\.com$/, category: "Known Platform", name: "Flipkart" },
    { match: /(^|\.)alibaba\.com$/, category: "Known Platform", name: "Alibaba" },
    { match: /(^|\.)walmart\.com$/, category: "Known Platform", name: "Walmart" },

    // Dev / productivity
    { match: /(^|\.)github\.com$/, category: "Known Platform", name: "GitHub (Microsoft)" },
    { match: /(^|\.)gitlab\.com$/, category: "Known Platform", name: "GitLab" },
    { match: /(^|\.)bitbucket\.org$/, category: "Known Platform", name: "Bitbucket (Atlassian)" },
    { match: /(^|\.)notion\.so$/, category: "Known Platform", name: "Notion" },
    { match: /(^|\.)atlassian\.net$/, category: "Known Platform", name: "Atlassian (Jira/Confluence)" },
    { match: /(^|\.)trello\.com$/, category: "Known Platform", name: "Trello (Atlassian)" },
    { match: /(^|\.)figma\.com$/, category: "Known Platform", name: "Figma (Adobe)" },
    { match: /(^|\.)asana\.com$/, category: "Known Platform", name: "Asana" },
    { match: /(^|\.)airtable\.com$/, category: "Known Platform", name: "Airtable" },
    { match: /(^|\.)dropbox\.com$/, category: "Known Platform", name: "Dropbox" },
    { match: /(^|\.)box\.com$/, category: "Known Platform", name: "Box" },
    { match: /(^|\.)render\.com$/, category: "Known Platform", name: "Render" },
    { match: /(^|\.)vercel\.com$/, category: "Known Platform", name: "Vercel" },
    { match: /(^|\.)netlify\.com$/, category: "Known Platform", name: "Netlify" },
    { match: /(^|\.)herokuapp\.com$/, category: "Known Platform", name: "Heroku" },

    // Streaming / media
    { match: /(^|\.)netflix\.com$/, category: "Known Platform", name: "Netflix" },
    { match: /(^|\.)spotify\.com$/, category: "Known Platform", name: "Spotify" },
    { match: /(^|\.)twitch\.tv$/, category: "Known Platform", name: "Twitch (Amazon)" },
    { match: /(^|\.)hulu\.com$/, category: "Known Platform", name: "Hulu" },
    { match: /(^|\.)primevideo\.com$/, category: "Known Platform", name: "Prime Video (Amazon)" },
    { match: /(^|\.)disneyplus\.com$/, category: "Known Platform", name: "Disney+" },

    // Microsoft ecosystem
    { match: /(^|\.)outlook\.com$|(^|\.)office\.com$/, category: "Known Platform", name: "Microsoft 365 / Outlook" },
    { match: /(^|\.)live\.com$/, category: "Known Platform", name: "Microsoft Live" },
    { match: /(^|\.)azure\.com$/, category: "Known Platform", name: "Microsoft Azure Portal" },
    { match: /(^|\.)teams\.microsoft\.com$/, category: "Known Platform", name: "Microsoft Teams" },

    // Finance / misc SaaS
    { match: /(^|\.)paypal\.com$/, category: "Known Platform", name: "PayPal" },
    { match: /(^|\.)stripe\.com$/, category: "Known Platform", name: "Stripe Dashboard" },
    { match: /(^|\.)salesforce\.com$/, category: "Known Platform", name: "Salesforce" },
    { match: /(^|\.)zendesk\.com$/, category: "Known Platform", name: "Zendesk" },
    { match: /(^|\.)intercom\.com$/, category: "Known Platform", name: "Intercom" },
    { match: /(^|\.)hubspot\.com$/, category: "Known Platform", name: "HubSpot" },
  ];

  const hostname = window.location.hostname || "";
  const matchedPlatform = hostnamePlatformMap.find(p => p.match.test(hostname));
  if (matchedPlatform) {
    add(matchedPlatform.category, matchedPlatform.name, `Recognized by hostname: ${hostname}`);
  }

  // ---------- Convert Maps/Sets into plain arrays for messaging ----------
  const categories = {};
  Object.keys(found).forEach(cat => {
    categories[cat] = Array.from(found[cat].entries()).map(([name, evidenceSet]) => ({
      name,
      evidence: Array.from(evidenceSet)[0] // just show first piece of evidence
    }));
  });

  const totalDetections = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);

  return {
    categories,
    scannedAt: Date.now(),
    hostname,
    totalDetections,
    // Signal to the UI: nothing beyond the hostname guess was found,
    // so it can show a "limited visibility" message instead of implying
    // a thorough scan happened.
    domDetectionEmpty: totalDetections === 0 || (totalDetections === 1 && !!matchedPlatform)
  };
}

// Explicit global assignment OUTSIDE the function so popup.js can
// reliably reference this regardless of script-loading order.
window.detectTechStack = detectTechStack;
