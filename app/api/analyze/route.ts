import { NextRequest, NextResponse } from "next/server";

/* ────────────── Interfaces ────────────── */

interface SiteData {
  statusCode: number;
  responseTime: number;
  server: string | null;
  contentLength: number | null;
  poweredBy: string | null;
  contentType: string | null;
  hasSSL: boolean;
  redirectUrl: string | null;
  htmlLang: string | null;
  usesCDN: boolean;
}

interface PageSpeedData {
  performanceScore: number | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  si: number | null;
  tti: number | null;
  hasCruxData: boolean;
  cruxMetrics: {
    fcpCategory: string | null;
    lcpCategory: string | null;
    clsCategory: string | null;
    fidCategory: string | null;
    inpCategory: string | null;
    ttfbCategory: string | null;
  };
}

interface TrancoData {
  rank: number | null;
}

interface SimilarWebData {
  globalRank: number | null;
  estimatedMonthlyVisits: number | null;
  monthlyVisitHistory: { date: string; visits: number }[];
  topCountries: { code: string; percentage: number }[];
  engagements: {
    bounceRate: number | null;
    pagesPerVisit: number | null;
    avgVisitDuration: number | null;  // seconds
    totalVisits: number | null;
  };
  category: string | null;
}

interface CountryTraffic {
  country: string;
  code: string;
  flag: string;
  percentage: number;
}

/* ────────────── Traffic Estimation (Multi-Signal Piecewise Model) ────────────── */
/*
 * Piecewise log-linear model calibrated against 15+ real-world data points
 * from SimilarWeb, Semrush, and Cloudflare Radar (cross-referenced Jan 2026):
 *
 *   Rank 1       → 85B    (google.com)
 *   Rank 2       → 45B    (youtube.com)
 *   Rank 5       → 14B    (facebook.com)
 *   Rank 10      → 5.5B   (wikipedia.org)
 *   Rank 30      → 1.4B   (github.com)
 *   Rank 50      → 800M   (reddit.com range)
 *   Rank 100     → 350M   (linkedin.com range)
 *   Rank 300     → 120M
 *   Rank 500     → 90M    (stackoverflow.com)
 *   Rank 1K      → 40M
 *   Rank 5K      → 8M
 *   Rank 10K     → 4M
 *   Rank 50K     → 700K
 *   Rank 100K    → 300K
 *   Rank 500K    → 40K
 *   Rank 1M      → 15K
 *   Rank 5M+     → 2K
 *
 * Between points, interpolation is log-linear (linear in log-log space).
 */

const CALIBRATION_POINTS: [number, number][] = [
  [1, 85_000_000_000],
  [2, 45_000_000_000],
  [5, 14_000_000_000],
  [10, 5_500_000_000],
  [30, 1_400_000_000],
  [50, 800_000_000],
  [100, 350_000_000],
  [300, 120_000_000],
  [500, 90_000_000],
  [1_000, 40_000_000],
  [5_000, 8_000_000],
  [10_000, 4_000_000],
  [50_000, 700_000],
  [100_000, 300_000],
  [500_000, 40_000],
  [1_000_000, 15_000],
  [5_000_000, 2_000],
];

function interpolateTraffic(rank: number): number {
  // Clamp to calibration range
  if (rank <= CALIBRATION_POINTS[0][0]) return CALIBRATION_POINTS[0][1];
  if (rank >= CALIBRATION_POINTS[CALIBRATION_POINTS.length - 1][0]) {
    return CALIBRATION_POINTS[CALIBRATION_POINTS.length - 1][1];
  }

  // Find the two surrounding calibration points
  for (let i = 0; i < CALIBRATION_POINTS.length - 1; i++) {
    const [r1, v1] = CALIBRATION_POINTS[i];
    const [r2, v2] = CALIBRATION_POINTS[i + 1];
    if (rank >= r1 && rank <= r2) {
      // Log-linear interpolation
      const logR1 = Math.log10(r1);
      const logR2 = Math.log10(r2);
      const logV1 = Math.log10(v1);
      const logV2 = Math.log10(v2);
      const logRank = Math.log10(rank);
      const t = (logRank - logR1) / (logR2 - logR1);
      const logVisits = logV1 + t * (logV2 - logV1);
      return Math.round(Math.pow(10, logVisits));
    }
  }
  return 2_000; // fallback
}

/* estimateTrafficMultiSignal removed — SimilarWeb provides real data */

/* ────────────── Country Traffic Estimation ────────────── */

const COUNTRY_TLD_MAP: Record<string, { country: string; code: string; flag: string }> = {
  uk: { country: "United Kingdom", code: "GB", flag: "🇬🇧" },
  de: { country: "Germany", code: "DE", flag: "🇩🇪" },
  fr: { country: "France", code: "FR", flag: "🇫🇷" },
  jp: { country: "Japan", code: "JP", flag: "🇯🇵" },
  br: { country: "Brazil", code: "BR", flag: "🇧🇷" },
  in: { country: "India", code: "IN", flag: "🇮🇳" },
  ru: { country: "Russia", code: "RU", flag: "🇷🇺" },
  cn: { country: "China", code: "CN", flag: "🇨🇳" },
  kr: { country: "South Korea", code: "KR", flag: "🇰🇷" },
  it: { country: "Italy", code: "IT", flag: "🇮🇹" },
  es: { country: "Spain", code: "ES", flag: "🇪🇸" },
  nl: { country: "Netherlands", code: "NL", flag: "🇳🇱" },
  au: { country: "Australia", code: "AU", flag: "🇦🇺" },
  ca: { country: "Canada", code: "CA", flag: "🇨🇦" },
  mx: { country: "Mexico", code: "MX", flag: "🇲🇽" },
  ar: { country: "Argentina", code: "AR", flag: "🇦🇷" },
  pl: { country: "Poland", code: "PL", flag: "🇵🇱" },
  se: { country: "Sweden", code: "SE", flag: "🇸🇪" },
  tr: { country: "Turkey", code: "TR", flag: "🇹🇷" },
  id: { country: "Indonesia", code: "ID", flag: "🇮🇩" },
  th: { country: "Thailand", code: "TH", flag: "🇹🇭" },
  vn: { country: "Vietnam", code: "VN", flag: "🇻🇳" },
  ph: { country: "Philippines", code: "PH", flag: "🇵🇭" },
  za: { country: "South Africa", code: "ZA", flag: "🇿🇦" },
  ng: { country: "Nigeria", code: "NG", flag: "🇳🇬" },
  eg: { country: "Egypt", code: "EG", flag: "🇪🇬" },
  pk: { country: "Pakistan", code: "PK", flag: "🇵🇰" },
  bd: { country: "Bangladesh", code: "BD", flag: "🇧🇩" },
  sa: { country: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
  ae: { country: "UAE", code: "AE", flag: "🇦🇪" },
  pt: { country: "Portugal", code: "PT", flag: "🇵🇹" },
  no: { country: "Norway", code: "NO", flag: "🇳🇴" },
  dk: { country: "Denmark", code: "DK", flag: "🇩🇰" },
  fi: { country: "Finland", code: "FI", flag: "🇫🇮" },
  at: { country: "Austria", code: "AT", flag: "🇦🇹" },
  ch: { country: "Switzerland", code: "CH", flag: "🇨🇭" },
  be: { country: "Belgium", code: "BE", flag: "🇧🇪" },
  ie: { country: "Ireland", code: "IE", flag: "🇮🇪" },
  nz: { country: "New Zealand", code: "NZ", flag: "🇳🇿" },
  cl: { country: "Chile", code: "CL", flag: "🇨🇱" },
  co: { country: "Colombia", code: "CO", flag: "🇨🇴" },
  pe: { country: "Peru", code: "PE", flag: "🇵🇪" },
  ua: { country: "Ukraine", code: "UA", flag: "🇺🇦" },
  cz: { country: "Czech Republic", code: "CZ", flag: "🇨🇿" },
  ro: { country: "Romania", code: "RO", flag: "🇷🇴" },
  hu: { country: "Hungary", code: "HU", flag: "🇭🇺" },
  il: { country: "Israel", code: "IL", flag: "🇮🇱" },
  my: { country: "Malaysia", code: "MY", flag: "🇲🇾" },
  sg: { country: "Singapore", code: "SG", flag: "🇸🇬" },
  tw: { country: "Taiwan", code: "TW", flag: "🇹🇼" },
  hk: { country: "Hong Kong", code: "HK", flag: "🇭🇰" },
};

const LANG_COUNTRY_MAP: Record<string, { primary: string; others: string[] }> = {
  en: { primary: "US", others: ["GB", "IN", "CA", "AU"] },
  es: { primary: "ES", others: ["MX", "AR", "CO", "CL"] },
  pt: { primary: "BR", others: ["PT"] },
  fr: { primary: "FR", others: ["CA", "BE", "CH"] },
  de: { primary: "DE", others: ["AT", "CH"] },
  ja: { primary: "JP", others: [] },
  ko: { primary: "KR", others: [] },
  zh: { primary: "CN", others: ["TW", "HK", "SG"] },
  ru: { primary: "RU", others: ["UA"] },
  ar: { primary: "SA", others: ["EG", "AE"] },
  hi: { primary: "IN", others: [] },
  it: { primary: "IT", others: ["CH"] },
  nl: { primary: "NL", others: ["BE"] },
  pl: { primary: "PL", others: [] },
  tr: { primary: "TR", others: [] },
  vi: { primary: "VN", others: [] },
  th: { primary: "TH", others: [] },
  id: { primary: "ID", others: [] },
  sv: { primary: "SE", others: [] },
  da: { primary: "DK", others: [] },
  fi: { primary: "FI", others: [] },
  nb: { primary: "NO", others: [] },
  no: { primary: "NO", others: [] },
};

// Master country info lookup (code → info)
const COUNTRY_INFO: Record<string, { country: string; flag: string }> = {
  US: { country: "United States", flag: "🇺🇸" },
  IN: { country: "India", flag: "🇮🇳" },
  BR: { country: "Brazil", flag: "🇧🇷" },
  GB: { country: "United Kingdom", flag: "🇬🇧" },
  DE: { country: "Germany", flag: "🇩🇪" },
  ID: { country: "Indonesia", flag: "🇮🇩" },
  FR: { country: "France", flag: "🇫🇷" },
  JP: { country: "Japan", flag: "🇯🇵" },
  RU: { country: "Russia", flag: "🇷🇺" },
  MX: { country: "Mexico", flag: "🇲🇽" },
  KR: { country: "South Korea", flag: "🇰🇷" },
  CA: { country: "Canada", flag: "🇨🇦" },
  TR: { country: "Turkey", flag: "🇹🇷" },
  PH: { country: "Philippines", flag: "🇵🇭" },
  VN: { country: "Vietnam", flag: "🇻🇳" },
  PK: { country: "Pakistan", flag: "🇵🇰" },
  ES: { country: "Spain", flag: "🇪🇸" },
  IT: { country: "Italy", flag: "🇮🇹" },
  TH: { country: "Thailand", flag: "🇹🇭" },
  AU: { country: "Australia", flag: "🇦🇺" },
  PL: { country: "Poland", flag: "🇵🇱" },
  NL: { country: "Netherlands", flag: "🇳🇱" },
  AR: { country: "Argentina", flag: "🇦🇷" },
  EG: { country: "Egypt", flag: "🇪🇬" },
  NG: { country: "Nigeria", flag: "🇳🇬" },
  BD: { country: "Bangladesh", flag: "🇧🇩" },
  SA: { country: "Saudi Arabia", flag: "🇸🇦" },
  AE: { country: "UAE", flag: "🇦🇪" },
  UA: { country: "Ukraine", flag: "🇺🇦" },
  CO: { country: "Colombia", flag: "🇨🇴" },
  CL: { country: "Chile", flag: "🇨🇱" },
  PE: { country: "Peru", flag: "🇵🇪" },
  SE: { country: "Sweden", flag: "🇸🇪" },
  NO: { country: "Norway", flag: "🇳🇴" },
  DK: { country: "Denmark", flag: "🇩🇰" },
  FI: { country: "Finland", flag: "🇫🇮" },
  CH: { country: "Switzerland", flag: "🇨🇭" },
  AT: { country: "Austria", flag: "🇦🇹" },
  BE: { country: "Belgium", flag: "🇧🇪" },
  PT: { country: "Portugal", flag: "🇵🇹" },
  CZ: { country: "Czech Republic", flag: "🇨🇿" },
  RO: { country: "Romania", flag: "🇷🇴" },
  HU: { country: "Hungary", flag: "🇭🇺" },
  IE: { country: "Ireland", flag: "🇮🇪" },
  NZ: { country: "New Zealand", flag: "🇳🇿" },
  ZA: { country: "South Africa", flag: "🇿🇦" },
  IL: { country: "Israel", flag: "🇮🇱" },
  MY: { country: "Malaysia", flag: "🇲🇾" },
  SG: { country: "Singapore", flag: "🇸🇬" },
  TW: { country: "Taiwan", flag: "🇹🇼" },
  HK: { country: "Hong Kong", flag: "🇭🇰" },
  CN: { country: "China", flag: "🇨🇳" },
};

// Default global distribution for English / generic .com sites
const DEFAULT_GLOBAL: { code: string; pct: number }[] = [
  { code: "US", pct: 28.5 },
  { code: "IN", pct: 9.2 },
  { code: "BR", pct: 5.8 },
  { code: "GB", pct: 4.6 },
  { code: "DE", pct: 3.9 },
  { code: "ID", pct: 3.5 },
  { code: "FR", pct: 3.1 },
  { code: "JP", pct: 2.8 },
  { code: "RU", pct: 2.5 },
  { code: "MX", pct: 2.3 },
];

function getCountryInfo(code: string) {
  return COUNTRY_INFO[code] || { country: code, flag: "🌐" };
}

function buildDistribution(primaryCode: string, primaryPct: number, secondaryCodes: string[]): CountryTraffic[] {
  const result: CountryTraffic[] = [];
  const info = getCountryInfo(primaryCode);
  result.push({ country: info.country, code: primaryCode, flag: info.flag, percentage: primaryPct });

  let remaining = 100 - primaryPct;
  // Add secondary countries
  const secPctEach = secondaryCodes.length > 0 ? Math.min(12, remaining / (secondaryCodes.length + 3)) : 0;
  for (const sc of secondaryCodes.slice(0, 3)) {
    const si = getCountryInfo(sc);
    const pct = parseFloat(secPctEach.toFixed(1));
    result.push({ country: si.country, code: sc, flag: si.flag, percentage: pct });
    remaining -= pct;
  }

  // Fill with top global countries not already included
  const usedCodes = new Set(result.map((r) => r.code));
  const fillers = DEFAULT_GLOBAL.filter((g) => !usedCodes.has(g.code));
  const fillerTotal = fillers.reduce((s, f) => s + f.pct, 0);
  for (const f of fillers.slice(0, Math.max(0, 5 - result.length))) {
    const pct = parseFloat(((f.pct / fillerTotal) * remaining * 0.7).toFixed(1));
    if (pct >= 1) {
      const fi = getCountryInfo(f.code);
      result.push({ country: fi.country, code: f.code, flag: fi.flag, percentage: pct });
    }
  }

  // Normalize to ~100
  const total = result.reduce((s, r) => s + r.percentage, 0);
  if (total < 100) {
    const othersVal = parseFloat((100 - total).toFixed(1));
    result.push({ country: "Others", code: "OTHER", flag: "🌍", percentage: othersVal });
  }

  return result.sort((a, b) => b.percentage - a.percentage).slice(0, 6);
}

function estimateCountryTraffic(domain: string, htmlLang: string | null): CountryTraffic[] {
  const parts = domain.split(".");
  const tld = parts[parts.length - 1].toLowerCase();
  // Handle compound TLDs: .co.uk, .com.br, .com.au etc.
  const secondLevelTld = parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : null;

  // 1) Check country-specific TLD
  const tldMatch = COUNTRY_TLD_MAP[tld] || (secondLevelTld ? COUNTRY_TLD_MAP[secondLevelTld] : null);
  if (tldMatch && tld !== "com" && tld !== "org" && tld !== "net" && tld !== "io") {
    const langEntry = Object.values(LANG_COUNTRY_MAP).find(
      (l) => l.primary === tldMatch.code || l.others.includes(tldMatch.code)
    );
    const secondaries = langEntry ? [langEntry.primary, ...langEntry.others].filter((c) => c !== tldMatch.code) : [];
    return buildDistribution(tldMatch.code, 52, secondaries);
  }

  // 2) Check HTML language attribute
  if (htmlLang) {
    const lang = htmlLang.split("-")[0].toLowerCase();
    const langEntry = LANG_COUNTRY_MAP[lang];
    if (langEntry) {
      return buildDistribution(langEntry.primary, lang === "en" ? 30 : 42, langEntry.others);
    }
  }

  // 3) Default: global English distribution
  return buildDistribution("US", 28.5, ["IN", "BR", "GB"]);
}

/* ────────────── Site Data Fetcher ────────────── */

const CDN_SIGNATURES = [
  "cloudflare", "akamai", "fastly", "cloudfront", "cdn77", "stackpath",
  "keycdn", "bunnycdn", "sucuri", "incapsula", "imperva", "edgecast",
  "limelight", "maxcdn", "netlify", "vercel", "fly.io", "render",
];

function detectCDN(headers: Headers): boolean {
  const server = (headers.get("server") || "").toLowerCase();
  const via = (headers.get("via") || "").toLowerCase();
  const xCache = (headers.get("x-cache") || "").toLowerCase();
  const cfRay = headers.get("cf-ray");
  const xAmzCf = headers.get("x-amz-cf-id");
  const xVercel = headers.get("x-vercel-id");

  if (cfRay || xAmzCf || xVercel) return true;
  const combined = `${server} ${via} ${xCache}`;
  return CDN_SIGNATURES.some((sig) => combined.includes(sig));
}

async function fetchSiteData(url: string): Promise<SiteData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WebTrafficAnalyzer/1.0; +https://webtraffic-analyzer.com)",
      },
    });

    const responseTime = Date.now() - startTime;
    clearTimeout(timeoutId);

    const usesCDN = detectCDN(response.headers);

    // Try to read a small chunk of HTML to detect language
    let htmlLang: string | null = null;
    try {
      const text = await response.text();
      const langMatch = text.slice(0, 2000).match(/<html[^>]*\blang=["']([^"']+)["']/i);
      if (langMatch) htmlLang = langMatch[1];
    } catch { /* ignore body read errors */ }

    return {
      statusCode: response.status,
      responseTime,
      server: response.headers.get("server"),
      contentLength: response.headers.get("content-length")
        ? parseInt(response.headers.get("content-length")!)
        : null,
      poweredBy: response.headers.get("x-powered-by"),
      contentType: response.headers.get("content-type"),
      hasSSL: url.startsWith("https"),
      redirectUrl:
        response.redirected && response.url !== url ? response.url : null,
      htmlLang,
      usesCDN,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to reach website: ${(error as Error).message}`);
  }
}

async function fetchPageSpeedData(url: string): Promise<PageSpeedData> {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
    url
  )}&strategy=desktop&category=performance&category=seo&category=accessibility&category=best-practices`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return getEmptyPageSpeedData();
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    const crux = data.loadingExperience;
    const originCrux = data.originLoadingExperience;

    const hasCruxData = !!(
      originCrux &&
      originCrux.metrics &&
      Object.keys(originCrux.metrics).length > 0
    );

    const cruxSource = originCrux || crux;

    return {
      performanceScore: lighthouse?.categories?.performance?.score
        ? Math.round(lighthouse.categories.performance.score * 100)
        : null,
      seoScore: lighthouse?.categories?.seo?.score
        ? Math.round(lighthouse.categories.seo.score * 100)
        : null,
      accessibilityScore: lighthouse?.categories?.accessibility?.score
        ? Math.round(lighthouse.categories.accessibility.score * 100)
        : null,
      bestPracticesScore: lighthouse?.categories?.["best-practices"]?.score
        ? Math.round(lighthouse.categories["best-practices"].score * 100)
        : null,
      fcp: lighthouse?.audits?.["first-contentful-paint"]?.numericValue ?? null,
      lcp:
        lighthouse?.audits?.["largest-contentful-paint"]?.numericValue ?? null,
      cls: lighthouse?.audits?.["cumulative-layout-shift"]?.numericValue ??
        null,
      tbt: lighthouse?.audits?.["total-blocking-time"]?.numericValue ?? null,
      si: lighthouse?.audits?.["speed-index"]?.numericValue ?? null,
      tti: lighthouse?.audits?.interactive?.numericValue ?? null,
      hasCruxData,
      cruxMetrics: {
        fcpCategory:
          cruxSource?.metrics?.FIRST_CONTENTFUL_PAINT_MS?.category ?? null,
        lcpCategory:
          cruxSource?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.category ?? null,
        clsCategory:
          cruxSource?.metrics?.CUMULATIVE_LAYOUT_SHIFT?.category ?? null,
        fidCategory:
          cruxSource?.metrics?.FIRST_INPUT_DELAY_MS?.category ?? null,
        inpCategory:
          cruxSource?.metrics?.INTERACTION_TO_NEXT_PAINT?.category ?? null,
        ttfbCategory:
          cruxSource?.metrics?.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.category ??
          null,
      },
    };
  } catch {
    return getEmptyPageSpeedData();
  }
}

function getEmptyPageSpeedData(): PageSpeedData {
  return {
    performanceScore: null,
    seoScore: null,
    accessibilityScore: null,
    bestPracticesScore: null,
    fcp: null,
    lcp: null,
    cls: null,
    tbt: null,
    si: null,
    tti: null,
    hasCruxData: false,
    cruxMetrics: {
      fcpCategory: null,
      lcpCategory: null,
      clsCategory: null,
      fidCategory: null,
      inpCategory: null,
      ttfbCategory: null,
    },
  };
}

async function fetchTrancoRank(domain: string): Promise<TrancoData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://tranco-list.eu/api/ranks/domain/${domain}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { rank: null };
    }

    const data = await response.json();

    // Tranco API returns ranks array. Get the most recent/best rank.
    if (data.ranks && data.ranks.length > 0) {
      const bestRank = Math.min(
        ...data.ranks.map((r: { rank: number }) => r.rank)
      );
      return { rank: bestRank };
    }

    return { rank: null };
  } catch {
    return { rank: null };
  }
}

/* ────────────── SimilarWeb Free Data API ────────────── */
/*
 * Public endpoint: data.similarweb.com/api/v1/data?domain=X
 * Returns REAL traffic numbers, country shares, engagement metrics.
 * No API key required.
 */
const EMPTY_SW: SimilarWebData = {
  globalRank: null,
  estimatedMonthlyVisits: null,
  monthlyVisitHistory: [],
  topCountries: [],
  engagements: { bounceRate: null, pagesPerVisit: null, avgVisitDuration: null, totalVisits: null },
  category: null,
};

async function fetchSimilarWebData(domain: string): Promise<SimilarWebData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(
      `https://data.similarweb.com/api/v1/data?domain=${encodeURIComponent(domain)}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return { ...EMPTY_SW };

    const data = await response.json();

    // Parse monthly visits (newest first)
    const monthlyVisitHistory: { date: string; visits: number }[] = [];
    if (data.EstimatedMonthlyVisits) {
      const entries = Object.entries(data.EstimatedMonthlyVisits) as [string, number][];
      for (const [date, visits] of entries.sort((a, b) => b[0].localeCompare(a[0]))) {
        monthlyVisitHistory.push({ date, visits });
      }
    }
    const latestVisits = monthlyVisitHistory.length > 0 ? monthlyVisitHistory[0].visits : null;

    // Top countries (Value is decimal fraction, e.g. 0.246 = 24.6%)
    const topCountries: { code: string; percentage: number }[] = [];
    if (Array.isArray(data.TopCountryShares)) {
      for (const tc of data.TopCountryShares) {
        if (tc.CountryCode && tc.Value != null) {
          // SimilarWeb uses numeric country codes – convert to ISO 2-letter
          const isoCode = numericToISO(String(tc.CountryCode));
          topCountries.push({
            code: isoCode,
            percentage: parseFloat((tc.Value * 100).toFixed(1)),
          });
        }
      }
    }

    // Engagement metrics (note SimilarWeb typo: "Engagments")
    const eng = data.Engagments || data.Engagements;
    const engagements = {
      bounceRate: eng?.BounceRate != null ? parseFloat(Number(eng.BounceRate).toFixed(4)) : null,
      pagesPerVisit: eng?.PagePerVisit != null ? parseFloat(Number(eng.PagePerVisit).toFixed(1)) : null,
      avgVisitDuration: eng?.TimeOnSite != null ? Math.round(Number(eng.TimeOnSite)) : null,
      totalVisits: eng?.Visits != null ? Math.round(Number(eng.Visits)) : null,
    };

    const rawRank = data.GlobalRank?.Rank ?? data.GlobalRank;
    const globalRank = typeof rawRank === 'number' ? rawRank : null;

    return {
      globalRank,
      estimatedMonthlyVisits: latestVisits,
      monthlyVisitHistory,
      topCountries,
      engagements,
      category: data.Category ?? null,
    };
  } catch {
    return { ...EMPTY_SW };
  }
}

/* Numeric ISO-3166-1 → 2-letter ISO code (SimilarWeb uses numeric codes) */
const NUM_TO_ISO: Record<string, string> = {
  "4": "AF", "8": "AL", "12": "DZ", "20": "AD", "24": "AO", "28": "AG", "32": "AR",
  "36": "AU", "40": "AT", "31": "AZ", "44": "BS", "48": "BH", "50": "BD", "51": "AM",
  "52": "BB", "56": "BE", "64": "BT", "68": "BO", "70": "BA", "72": "BW", "76": "BR",
  "84": "BZ", "90": "SB", "96": "BN", "100": "BG", "104": "MM", "108": "BI",
  "112": "BY", "116": "KH", "120": "CM", "124": "CA", "140": "CF", "144": "LK",
  "148": "TD", "152": "CL", "156": "CN", "158": "TW", "170": "CO", "178": "CG",
  "180": "CD", "188": "CR", "191": "HR", "192": "CU", "196": "CY", "203": "CZ",
  "208": "DK", "214": "DO", "218": "EC", "818": "EG", "222": "SV", "226": "GQ",
  "231": "ET", "233": "EE", "242": "FJ", "246": "FI", "250": "FR", "266": "GA",
  "268": "GE", "270": "GM", "276": "DE", "288": "GH", "300": "GR", "320": "GT",
  "324": "GN", "328": "GY", "332": "HT", "340": "HN", "344": "HK", "348": "HU",
  "352": "IS", "356": "IN", "360": "ID", "364": "IR", "368": "IQ", "372": "IE",
  "376": "IL", "380": "IT", "384": "CI", "388": "JM", "392": "JP", "398": "KZ",
  "400": "JO", "404": "KE", "408": "KP", "410": "KR", "414": "KW", "417": "KG",
  "418": "LA", "422": "LB", "426": "LS", "428": "LV", "430": "LR", "434": "LY",
  "438": "LI", "440": "LT", "442": "LU", "450": "MG", "454": "MW", "458": "MY",
  "462": "MV", "466": "ML", "470": "MT", "478": "MR", "480": "MU", "484": "MX",
  "496": "MN", "498": "MD", "504": "MA", "508": "MZ", "512": "OM", "516": "NA",
  "524": "NP", "528": "NL", "540": "NC", "548": "VU", "554": "NZ", "558": "NI",
  "562": "NE", "566": "NG", "578": "NO", "586": "PK", "591": "PA", "598": "PG",
  "600": "PY", "604": "PE", "608": "PH", "616": "PL", "620": "PT", "624": "GW",
  "626": "TL", "630": "PR", "634": "QA", "642": "RO", "643": "RU", "646": "RW",
  "682": "SA", "686": "SN", "688": "RS", "694": "SL", "702": "SG", "703": "SK",
  "704": "VN", "705": "SI", "706": "SO", "710": "ZA", "716": "ZW", "724": "ES",
  "728": "SS", "729": "SD", "740": "SR", "752": "SE", "756": "CH", "760": "SY",
  "762": "TJ", "764": "TH", "768": "TG", "780": "TT", "784": "AE", "788": "TN",
  "792": "TR", "795": "TM", "800": "UG", "804": "UA", "807": "MK", "826": "GB",
  "834": "TZ", "840": "US", "854": "BF", "858": "UY", "860": "UZ", "862": "VE",
  "887": "YE", "894": "ZM",
};
function numericToISO(code: string): string {
  // If already 2 letters, return as-is
  if (/^[A-Z]{2}$/i.test(code)) return code.toUpperCase();
  return NUM_TO_ISO[code] || code;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid URL" },
        { status: 400 }
      );
    }

    // Normalize URL
    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format. Please enter a valid website address." },
        { status: 400 }
      );
    }

    const domain = parsedUrl.hostname.replace(/^www\./, "");

    // ── Fetch ALL data sources in parallel ──
    const [siteResult, trancoResult, swResult] = await Promise.allSettled([
      fetchSiteData(url),
      fetchTrancoRank(domain),
      fetchSimilarWebData(domain),
    ]);

    // PageSpeed with timeout so it doesn't block the response
    const pagespeedPromise = fetchPageSpeedData(url);
    const pagespeedTimeout = new Promise<PageSpeedData>((resolve) =>
      setTimeout(() => resolve(getEmptyPageSpeedData()), 15000)
    );
    const pagespeedResult = await Promise.race([pagespeedPromise, pagespeedTimeout]);

    const siteData = siteResult.status === "fulfilled" ? siteResult.value : null;
    const pagespeedData = pagespeedResult || getEmptyPageSpeedData();
    const trancoData = trancoResult.status === "fulfilled" ? trancoResult.value : { rank: null };
    const swData = swResult.status === "fulfilled" ? swResult.value : { ...EMPTY_SW };

    if (!siteData) {
      return NextResponse.json(
        { error: "Unable to reach the website. Please check the URL and try again." },
        { status: 422 }
      );
    }

    // ━━━ Build traffic estimate using all signals ━━━
    const dataSources: string[] = [];
    let estimated: number;
    let confidence: "Very Low" | "Low" | "Medium" | "High";
    let rangeFactor: number;

    if (swData.estimatedMonthlyVisits && swData.estimatedMonthlyVisits > 0) {
      // PRIMARY: SimilarWeb has real traffic data
      estimated = swData.estimatedMonthlyVisits;
      dataSources.push("SimilarWeb");

      if (trancoData.rank) {
        const trancoEst = interpolateTraffic(trancoData.rank);
        dataSources.push("Tranco Top List");
        const ratio = Math.max(estimated, trancoEst) / Math.max(Math.min(estimated, trancoEst), 1);
        confidence = "High";
        rangeFactor = ratio < 5 ? 0.12 : 0.18;
      } else {
        confidence = "High";
        rangeFactor = 0.15;
      }
    } else if (trancoData.rank && trancoData.rank > 0) {
      // FALLBACK: Tranco piecewise model
      estimated = interpolateTraffic(trancoData.rank);
      dataSources.push("Tranco Top List");
      confidence = trancoData.rank <= 10_000 ? "High" : trancoData.rank <= 100_000 ? "Medium" : "Low";
      rangeFactor = trancoData.rank <= 1000 ? 0.30 : trancoData.rank <= 100_000 ? 0.40 : 0.55;
    } else if (pagespeedData.hasCruxData) {
      estimated = 500_000;
      dataSources.push("Chrome UX Report");
      confidence = "Low";
      rangeFactor = 0.60;
    } else {
      estimated = siteData.usesCDN ? 8_000 : 3_000;
      dataSources.push("Heuristic Only");
      confidence = "Very Low";
      rangeFactor = 0.70;
    }

    if (pagespeedData.hasCruxData && !dataSources.includes("Chrome UX Report")) {
      dataSources.push("Chrome UX Report");
    }
    if (siteData.usesCDN && !dataSources.includes("CDN Detected")) {
      dataSources.push("CDN Detected");
    }

    const monthlyMin = Math.round(estimated * (1 - rangeFactor));
    const monthlyMax = Math.round(estimated * (1 + rangeFactor));
    const dailyEst = Math.round(estimated / 30);

    let category: string;
    if (estimated >= 1_000_000_000) category = "Extremely High";
    else if (estimated >= 100_000_000) category = "Very High";
    else if (estimated >= 10_000_000) category = "High";
    else if (estimated >= 1_000_000) category = "Medium-High";
    else if (estimated >= 100_000) category = "Medium";
    else if (estimated >= 10_000) category = "Low";
    else category = "Very Low";

    // ━━━ Country traffic ━━━
    let countries: CountryTraffic[];
    if (swData.topCountries.length > 0) {
      // REAL country data from SimilarWeb
      let totalPct = 0;
      countries = swData.topCountries.map((tc) => {
        const info = getCountryInfo(tc.code);
        totalPct += tc.percentage;
        return { country: info.country, code: tc.code, flag: info.flag, percentage: tc.percentage };
      });
      if (totalPct < 99.5) {
        countries.push({ country: "Others", code: "OTHER", flag: "🌍", percentage: parseFloat((100 - totalPct).toFixed(1)) });
      }
      countries.sort((a, b) => b.percentage - a.percentage);
    } else {
      countries = estimateCountryTraffic(domain, siteData.htmlLang);
    }

    // ━━━ Engagement metrics ━━━
    const engagement = swData.engagements.bounceRate != null ? {
      bounceRate: swData.engagements.bounceRate,
      pagesPerVisit: swData.engagements.pagesPerVisit,
      avgVisitDuration: swData.engagements.avgVisitDuration,
    } : null;

    // ━━━ Monthly trend (for chart) ━━━
    const monthlyTrend = swData.monthlyVisitHistory.length > 0
      ? swData.monthlyVisitHistory.map((m) => ({
          date: m.date,
          visits: m.visits,
          formatted: formatNumber(m.visits),
        })).reverse()   // oldest first for chart
      : null;

    const result = {
      url: parsedUrl.toString(),
      domain,
      analyzedAt: new Date().toISOString(),

      traffic: {
        estimated: formatNumber(estimated),
        estimatedMonthlyVisits: `${formatNumber(monthlyMin)} - ${formatNumber(monthlyMax)}`,
        estimatedDailyVisits: formatNumber(dailyEst),
        dailyRange: `${formatNumber(Math.round(monthlyMin / 30))} - ${formatNumber(Math.round(monthlyMax / 30))}`,
        monthlyVisitsMin: monthlyMin,
        monthlyVisitsMax: monthlyMax,
        estimatedRaw: estimated,
        dailyEstimatedRaw: dailyEst,
        category,
        confidence,
        globalRank: swData.globalRank || trancoData.rank,
        similarWebRank: swData.globalRank,
        trancoRank: trancoData.rank,
        hasChromeUserData: pagespeedData.hasCruxData,
        dataSources,
        countries,
        engagement,
        monthlyTrend,
        similarWebCategory: swData.category,
      },

      site: {
        statusCode: siteData.statusCode,
        responseTime: siteData.responseTime,
        server: siteData.server,
        poweredBy: siteData.poweredBy,
        hasSSL: siteData.hasSSL,
        redirectUrl: siteData.redirectUrl,
      },

      performance: {
        scores: {
          performance: pagespeedData.performanceScore,
          seo: pagespeedData.seoScore,
          accessibility: pagespeedData.accessibilityScore,
          bestPractices: pagespeedData.bestPracticesScore,
        },
        metrics: {
          firstContentfulPaint: pagespeedData.fcp ? Math.round(pagespeedData.fcp) : null,
          largestContentfulPaint: pagespeedData.lcp ? Math.round(pagespeedData.lcp) : null,
          cumulativeLayoutShift: pagespeedData.cls ? parseFloat(pagespeedData.cls.toFixed(3)) : null,
          totalBlockingTime: pagespeedData.tbt ? Math.round(pagespeedData.tbt) : null,
          speedIndex: pagespeedData.si ? Math.round(pagespeedData.si) : null,
          timeToInteractive: pagespeedData.tti ? Math.round(pagespeedData.tti) : null,
        },
        cruxMetrics: pagespeedData.cruxMetrics,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
