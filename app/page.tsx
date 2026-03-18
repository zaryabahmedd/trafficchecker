"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

/* ─────────────── Types ─────────────── */
interface AnalysisResult {
  url: string;
  domain: string;
  analyzedAt: string;
  traffic: {
    estimated: string;
    estimatedMonthlyVisits: string;
    estimatedDailyVisits: string;
    dailyRange: string;
    monthlyVisitsMin: number;
    monthlyVisitsMax: number;
    estimatedRaw: number;
    dailyEstimatedRaw: number;
    category: string;
    confidence: string;
    globalRank: number | null;
    similarWebRank: number | null;
    trancoRank: number | null;
    hasChromeUserData: boolean;
    dataSources: string[];
    countries: {
      country: string;
      code: string;
      flag: string;
      percentage: number;
    }[];
    engagement: {
      bounceRate: number | null;
      pagesPerVisit: number | null;
      avgVisitDuration: number | null;
    } | null;
    monthlyTrend: {
      date: string;
      visits: number;
      formatted: string;
    }[] | null;
    similarWebCategory: string | null;
  };
  topKeywords: { name: string; estimatedValue: number; volume: number; cpc: number | null }[];
  site: {
    statusCode: number;
    responseTime: number;
    server: string | null;
    poweredBy: string | null;
    hasSSL: boolean;
    redirectUrl: string | null;
  };
  performance: {
    scores: {
      performance: number | null;
      seo: number | null;
      accessibility: number | null;
      bestPractices: number | null;
    };
    metrics: {
      firstContentfulPaint: number | null;
      largestContentfulPaint: number | null;
      cumulativeLayoutShift: number | null;
      totalBlockingTime: number | null;
      speedIndex: number | null;
      timeToInteractive: number | null;
    };
    cruxMetrics: {
      fcpCategory: string | null;
      lcpCategory: string | null;
      clsCategory: string | null;
      fidCategory: string | null;
      inpCategory: string | null;
      ttfbCategory: string | null;
    };
  };
}

/* ─────────────── Helper Components ─────────────── */

function ScoreRing({
  score,
  label,
  size = 100,
}: {
  score: number | null;
  label: string;
  size?: number;
}) {
  if (score === null) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="rounded-full border-4 border-gray-200 flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-gray-400 text-sm">N/A</span>
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    );
  }

  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90
      ? "#16a34a"
      : score >= 50
        ? "#d97706"
        : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="6"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-500 text-center">{label}</span>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  variant?: string;
}) {
  const variantMap: Record<string, string> = {
    default: "border-gray-100 hover:border-red-200 hover:shadow-red-50",
    success: "border-gray-100 hover:border-green-200 hover:shadow-green-50",
    warning: "border-gray-100 hover:border-amber-200 hover:shadow-amber-50",
    danger: "border-gray-100 hover:border-red-300 hover:shadow-red-50",
  };

  return (
    <div
      className={`bg-white border ${variantMap[variant] || variantMap.default} rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl">{icon}</div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {subValue && (
        <div className="text-xs text-gray-400 mt-1">{subValue}</div>
      )}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    "Extremely High": "bg-green-50 text-green-700 border-green-200",
    "Very High": "bg-emerald-50 text-emerald-700 border-emerald-200",
    High: "bg-blue-50 text-blue-700 border-blue-200",
    "Medium-High": "bg-sky-50 text-sky-700 border-sky-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    Low: "bg-orange-50 text-orange-700 border-orange-200",
    "Very Low": "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colorMap[category] || "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {category} Traffic
    </span>
  );
}

function CruxBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-gray-300">—</span>;
  const colorMap: Record<string, string> = {
    FAST: "text-green-600 bg-green-50 px-2 py-0.5 rounded-full",
    AVERAGE: "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full",
    SLOW: "text-red-600 bg-red-50 px-2 py-0.5 rounded-full",
  };
  return (
    <span className={`text-sm font-semibold ${colorMap[category] || "text-gray-500"}`}>
      {category.charAt(0) + category.slice(1).toLowerCase()}
    </span>
  );
}

function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-red-100 border-t-red-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-b-gray-800 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Analyzing website...</p>
        <p className="text-sm text-gray-400 mt-2">
          Fetching traffic data, performance metrics & rankings
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        {["Checking website availability...", "Running PageSpeed analysis...", "Fetching global rankings..."].map((text, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-gray-500">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    console.log("[WebTraffic] Starting analysis for:", trimmedUrl);

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      console.log("[WebTraffic] Response status:", res.status);

      const data = await res.json();
      console.log("[WebTraffic] Response data:", data);

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        console.log("[WebTraffic] Traffic:", data.traffic?.estimatedMonthlyVisits);
        setResult(data);
      }
    } catch (err) {
      console.error("[WebTraffic] Fetch error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-red-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gray-50 rounded-full blur-3xl opacity-80" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-50/30 rounded-full blur-3xl" />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-semibold mb-6 shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Free Website Traffic Analyzer
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-5">
            <span className="text-gray-900">Website Traffic Checker: </span>
            <span style={{ color: "#FD254B" }}>Analyze Your Site Now</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Enter any website URL to get estimated traffic data, global ranking,
            performance scores, and SEO insights — powered by real Chrome
            user data and global ranking databases.
          </p>
        </header>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-14">
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., google.com)"
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all text-base shadow-sm"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-w-[160px] shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Analyze
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Feature highlights below search bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-14 -mt-8">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-200">
            <span className="text-xl">📊</span>
            <div>
              <div className="text-xs font-bold text-gray-900">Traffic Estimates</div>
              <div className="text-xs text-gray-400">Monthly &amp; daily visits from global ranking databases</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-200">
            <span className="text-xl">⚡</span>
            <div>
              <div className="text-xs font-bold text-gray-900">Performance Scores</div>
              <div className="text-xs text-gray-400">Lighthouse, SEO, accessibility &amp; best practices</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-200">
            <span className="text-xl">👥</span>
            <div>
              <div className="text-xs font-bold text-gray-900">Real User Data</div>
              <div className="text-xs text-gray-400">Chrome UX Report data from real visitors</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
             SEO CONTENT — ~3000 words, modern card layout
        ═══════════════════════════════════════════════════════════ */}
        <div className="mb-20 space-y-16">

          {/* ── H2: WHY CHOOSE US ── */}
          <div>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-4">Platform Strengths</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                Why Choose Our Traffic Checker Platform?
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
                There is no shortage of traffic tools on the internet. But most of them make you pay, sign up, wait, or guess. We took a different approach — build something that respects your time, shows you transparent data, and actually helps you act on what you find. Here are the ten core reasons professionals and beginners keep coming back to our <strong>website traffic analyzer</strong>.
              </p>
            </div>

            {/* 10 FEATURE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Card 1 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl">🚀</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">1. Free, Instant Scans With Zero Setup</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      The biggest friction point with most analytics tools is the onboarding: create an account, verify your email, add a payment method, install a pixel, wait for data to accumulate. We eliminated every one of those steps. Paste a URL, press Analyze, and within seconds you are looking at real traffic estimates, performance scores, keyword signals, country breakdowns, and global ranking data — all in one screen. There is nothing to install, nothing to configure, and nothing to pay. The moment you land on our page, the full power of the tool is already available to you. This makes it ideal for quick competitor checks, client pitches, pre-purchase domain research, or any scenario where speed matters more than a complex dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl">🎯</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">2. Designed for Beginners and Experts Alike</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      A traffic tool is only useful if you can actually understand what it is telling you. We obsessed over the interface so it communicates clearly to two very different audiences at once. A beginner sees plain-English labels like "Estimated Monthly Visits," "Traffic Level: Medium," and color-coded performance scores. An expert sees the same screen and immediately notices confidence levels, data source attribution, engagement ratios, CrUX performance categories, and monthly trend lines. You do not need to toggle between beginner and advanced modes — the layout naturally layers complexity from top to bottom. This single-interface philosophy means your entire team — from the junior content writer to the senior SEO director — can open the same URL result and walk away with something valuable.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl">📅</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">3. Monthly and Daily Traffic Estimates in One View</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Traffic numbers need context to be useful. Knowing that a website gets "2.4 million visits" means very little unless you also know whether that is a month, a week, or a day. Our <strong>website traffic checker</strong> shows both the estimated monthly total and the daily average prominently side by side, along with realistic ranges so you understand the confidence envelope around the figure. We also show estimated annual visits so you can think about scale. For sites with historical monthly data, you will see a smooth trend chart covering up to 12 months — so you can tell immediately whether traffic is growing, plateauing, or declining. That monthly trend is often the most actionable piece of data on the page, because trend direction matters more than a single snapshot number.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl">🌐</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">4. Global Rank Signals and Real Traffic Context</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Raw visit numbers are powerful, but global ranking context puts them in perspective. Our tool surfaces the website's global rank alongside its traffic estimates — so a figure like "300,000 monthly visits" immediately tells a different story when you see it sits around rank 80,000 globally. We cross-reference multiple ranking databases to deliver reliable rank signals, and we show the data sources transparently so you know where the figure is coming from. This is particularly valuable for competitive intelligence: when you check a competitor's domain, you are not just seeing how many people visit — you are seeing where they stand in the global hierarchy of websites, which helps you calibrate what it would take to close the gap.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 5 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl">🗺️</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">5. Country-Level Traffic Breakdown for Smarter Targeting</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Knowing how many people visit a site is only half the picture. Knowing where those people come from is the other half — and often the more strategically important one. Our <strong>website traffic analyzer</strong> shows a country-by-country breakdown of estimated traffic distribution, with percentage shares and country flags for quick visual scanning. This data is invaluable for several use cases: if you are evaluating whether to advertise on a site, you need to know if its audience matches your target geography. If you are analyzing a competitor, knowing their strongest markets tells you where else they might expand. If it is your own site, seeing unexpected traffic from a country you never targeted is a growth signal worth investigating immediately.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 6 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl">⚡</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">6. Performance and SEO Scoring in the Same Workflow</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Traffic and performance are inseparable. A site that loads slowly will lose visitors before they even see your content. One that scores poorly on SEO audits will struggle to attract organic search traffic in the first place. That is why we run a full performance audit alongside every traffic check — measuring Core Web Vitals, SEO score, accessibility, and best practice compliance all in a single pass. You see animated ring scores, detailed metric breakdowns, and real Chrome User Experience (CrUX) data where available. Instead of running your traffic check in one tool and your performance audit in another, you get a complete picture in one place, in one scan. This is a huge time saver for agencies audit workflows and solo developers checking their own sites.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 7 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl">🔑</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">7. Top Keyword Indicators to Guide Content Strategy</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Every website tells a story through the keywords that bring it traffic. When you analyze a domain with our tool, we surface the top search keywords estimated to drive that site's organic visibility — including monthly search volume and estimated cost-per-click for each term. For competitor research, this is like reading their content strategy in plain text. You can immediately see which topics they have captured, identify gaps they have not addressed, and spot high-value keywords worth targeting yourself. For your own site, comparing your actual keyword performance against these estimates reveals whether search engines are sending you the visitors you have worked to attract. This level of insight used to require a separate keyword research subscription — here it comes bundled with every traffic check.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 8 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl">🏷️</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">8. Confidence Labels for Responsible Decision-Making</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      One of the most dishonest things a traffic tool can do is present an estimate as if it were a verified fact. We refuse to do that. Every result on our platform comes with a clearly labeled confidence level — High, Medium, Low, or Very Low — that tells you exactly how reliable the underlying data is. A site with rich, verified data from multiple reliable sources gets a High confidence tag. A brand-new domain with no ranking history gets a Very Low tag and a clear note that the estimate is heuristic-only. This honesty changes how you use the data: you lean harder on High-confidence results when making critical decisions, and you treat Very Low results as a starting point for further research rather than a final answer. That is the kind of transparency that builds genuine trust over time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 9 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl">💡</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">9. Live-Friendly UX Built for Speed and Rapid Comparisons</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Speed is not just about how quickly the analysis runs — it is also about how quickly you can move from one domain to the next. Our interface was designed with rapid comparison workflows in mind. The results page auto-scrolls into view the moment data arrives. The input field stays accessible so you can immediately type a new domain without scrolling back to the top. The visual hierarchy is deliberate: the most important numbers appear large and prominent at the top, with supporting detail layered below for those who want to go deeper. Whether you are on a laptop running a 20-site competitor audit or on a phone quickly checking a domain someone mentioned in a meeting, the experience adapts and stays fast. Good UX is itself a form of accuracy — because a confusing layout creates misread numbers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 10 */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl">📈</div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">10. Action-Oriented Insights That Drive Your Next Campaign</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Data without direction is just numbers. Every metric we show you is there because it answers a real question you might have when planning your next move online. Bounce rate tells you whether visitors are staying or leaving immediately. Pages per visit reveals how engaging the content experience is. Average visit duration tells you whether people are reading or skimming. Monthly trend lines tell you whether a competitor is accelerating or slowing down. Top keywords tell you what content is working. Country distribution tells you where the next expansion opportunity might be. We do not dump raw data on you and walk away — we structure the results so the natural next step in your campaign decision-making becomes obvious. That is the difference between a data tool and a strategic asset.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── H3: HOW IT WORKS ── */}
          <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-10 text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest mb-4">Methodology</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                How Our Traffic Analyzer Software Works — and Why We Are Accurate
              </h2>
              <p className="text-gray-300 text-base max-w-2xl mx-auto">
                Accuracy is not a feature you can add at the end. It has to be baked into every layer of how data is collected, cross-checked, and presented.
              </p>
            </div>
            <div className="bg-white px-8 py-10 space-y-8">
              <p className="text-gray-600 leading-relaxed text-base">
                When you submit a domain to our <strong>website traffic analyzer</strong>, the system immediately launches a multi-signal data collection process running several independent checks in parallel. Rather than relying on a single source — which any single source being wrong would make the entire result wrong — we deliberately draw from multiple independent streams and then reason about what the combined picture says. Here is exactly how each layer works.
              </p>

              {/* Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { step: "01", icon: "📡", title: "Live Web Data Fetch", body: "We make a direct HTTP request to the domain, recording response time, SSL status, server technology, CDN presence, and HTML language — all of which feed into the confidence calculation and country estimation model." },
                  { step: "02", icon: "📊", title: "Traffic Database Lookup", body: "We query established global traffic reference data to pull aggregated browsing behavior, global rank, monthly visit history, country traffic shares, engagement metrics, and top keyword signals for the domain." },
                  { step: "03", icon: "🏆", title: "Ranking List Cross-Check", body: "We cross-reference global domain ranking lists that track the top millions of websites by traffic. When a site appears here, its rank feeds into a calibrated piecewise model to produce a secondary traffic estimate that validates or challenges the primary figure." },
                  { step: "04", icon: "⚡", title: "PageSpeed & CrUX Audit", body: "A Google PageSpeed Insights API call runs a full Lighthouse audit and pulls Chrome User Experience Report data — real-world performance as recorded by Chrome browsers. CrUX data alone is a powerful traffic indicator because it only exists for sites with meaningful real-user sessions." },
                ].map((s) => (
                  <div key={s.step} className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-black text-red-500 bg-red-50 border border-red-100 rounded-full w-8 h-8 flex items-center justify-center shrink-0">{s.step}</span>
                      <span className="text-xl">{s.icon}</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">{s.title}</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">{s.body}</p>
                  </div>
                ))}
              </div>

              <p className="text-gray-600 leading-relaxed text-base">
                Once all four data streams return, the engine enters a reconciliation phase. If real aggregated traffic data is available, that becomes the primary figure — it is the most direct signal we have. If a ranking list entry is also available, we use the piecewise interpolation model as a cross-check: if the two signals are within 5× of each other, confidence is High; if they diverge significantly, we widen the range estimate to reflect that uncertainty honestly. If Chrome User Experience data exists without the other signals, it tells us there are real users but not exactly how many — so we set confidence to Low. If none of these signals exist, the result clearly shows "No Data Available" rather than fabricating a plausible-looking number.
              </p>
              <p className="text-gray-600 leading-relaxed text-base">
                This tiered, multi-source approach is what separates our <strong>website traffic checker</strong> from tools that generate a number from a single algorithm and present it as fact. The internet is too varied and too dynamic for any single source to be authoritative across all domains. Young domains have no ranking history. Non-English sites may not be well-covered by English-centric tools. Micro-niche sites might have loyal but small audiences that rank databases document poorly. By combining sources and being transparent about where data came from, we give you a figure you can actually reason about.
              </p>
              <div className="rounded-2xl bg-red-50 border border-red-100 p-6">
                <p className="text-red-700 text-sm leading-relaxed font-medium">
                  <span className="font-black">Key principle:</span> We would rather show you a realistic range with a "Low confidence" label than show you a precise-looking number that is probably wrong. A range you can trust is more valuable than a pinpoint figure that misleads you. Every result includes a confidence label, a data source list, and a range — because that is what honest traffic estimation looks like.
                </p>
              </div>
            </div>
          </div>

          {/* ── H4: WHO IT HELPS ── */}
          <div>
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-4">Who Benefits</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                Contributing Real Value to Traffic Checkers, SEO Analysts, and the Wider World
              </h2>
              <p className="text-gray-500 text-base max-w-2xl mx-auto leading-relaxed">
                A healthy digital economy depends on information flowing freely to everyone, not just to those with enterprise-level subscriptions. Here is the full range of people our platform is built to serve — and how it specifically helps each one of them.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: "🔍", title: "SEO Analysts", body: "For SEO professionals, traffic data is the ground truth that validates every hypothesis. Our website traffic checker lets analysts quickly verify whether the organic strategy implemented for a client has moved the needle, benchmark a site against three or four competitors in a matter of minutes, and identify which pages a competitor's domain ranks for based on keyword signals. The monthly trend chart is especially useful here — SEO work is long-cycle, and seeing a clear upward trajectory over six months is the kind of proof that retains clients and justifies budget increases. The confidence labels also matter in professional settings, because presenting uncertain data as certain to a client is a credibility risk analysts cannot afford." },
                { icon: "🏢", title: "Digital Agencies", body: "Agencies run competitive audits constantly — for client onboarding, quarterly reviews, pitch decks, and strategy sessions. A tool that can scan a dozen competitor domains quickly and return clean, visual results cuts hours off each audit. Our platform gives agencies the ability to show clients exactly how their site compares in traffic, performance scores, keyword footprint, and engagement metrics against industry peers — all in a format that is easy to screenshot and drop into a presentation. The country distribution data is particularly valuable for international clients who need to understand whether a competitor's apparent strength is global or concentrated in one regional market." },
                { icon: "🚀", title: "Startup Founders", body: "Before a startup launches, there is an enormous amount of market research compressed into limited time. One of the fastest ways to validate whether a niche has traction is to check the traffic of sites already operating in it. If your competitor is getting 400,000 monthly visits with a relatively simple site and modest SEO investment, that is a strong signal that the audience exists and is reachable. If five sites in your niche all show near-zero traffic, that is a different kind of signal worth investigating before you commit a development budget. Our website traffic analyzer turns that competitive landscape scan into a ten-minute exercise rather than a multi-day research project." },
                { icon: "✍️", title: "Content Creators", body: "For bloggers, YouTubers, newsletter writers, and podcast producers, understanding traffic patterns is the key to growing an audience strategically rather than by luck. Our tool helps content creators identify websites in their niche that are already attracting significant traffic, study the keyword topics those sites are ranking for, and find gaps where quality content could capture untapped search demand. It also helps creators evaluate potential collaboration partners: before approaching a website for a guest post or sponsorship opportunity, checking its traffic legitimacy takes thirty seconds and could save you from investing effort in a site with no real audience." },
                { icon: "🛒", title: "E-Commerce Teams", body: "For e-commerce businesses, competitive intelligence is a survival skill. Knowing whether a competitor's site is growing, which countries their customers are coming from, how long visitors stay, and what pages they explore gives you a data-driven foundation for your own positioning decisions. If a competitor suddenly shows a traffic spike in a country you have never targeted, that is a market signal worth exploring. If their bounce rate is high despite strong traffic, that is an opening for you to offer a better user experience and capture market share. Our platform gives e-commerce teams the quick, broad visibility they need to stay ahead of market shifts without relying purely on expensive proprietary research tools." },
                { icon: "📚", title: "Students and Researchers", body: "Digital marketing education has a persistent problem: case studies and textbooks describe the internet of several years ago - the landscape that actually exists today requires direct examination. Our website traffic checker gives students and academic researchers access to the same quality of traffic intelligence that professionals use, at no cost. This closes a real equity gap in digital education. A student studying SEO strategy can now validate their theoretical models against live web data. A researcher studying platform competition can check how different sites in an ecosystem compare in traffic share. A marketing student preparing a case study can pull real numbers rather than citing aggregated statistics that do not reflect the specific domain being analyzed." },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300 p-6">
                  <div className="text-3xl mb-3">{card.icon}</div>
                  <h4 className="text-base font-bold text-gray-900 mb-3">{card.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 p-7">
              <p className="text-gray-700 text-base leading-relaxed">
                Beyond these specific audiences, there is a broader principle at work. Every person who makes a better, more informed decision about a website — whether they are buying it, building for it, competing with it, or advertising through it — contributes to a healthier internet. When bad actors cannot hide behind opaque traffic metrics, accountability improves. When good content creators can verify that their investment in quality is driving real audience growth, they are incentivized to keep producing great work. When small businesses can access the same competitive intelligence as large enterprises, the playing field gets a little more level. That is the larger mission of our free <strong>website traffic analyzer</strong>: not just to answer a technical question, but to improve the quality of decisions being made across the internet every day.
              </p>
            </div>
          </div>

          {/* ── H5: ORIGIN STORY ── */}
          <div className="rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-100 px-8 py-8">
              <span className="inline-block px-4 py-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest mb-4">Our Story</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                The Gap Was Real: No Accurate, Free Website Traffic Checker Existed
              </h2>
            </div>
            <div className="bg-white px-8 py-10 space-y-6">
              <p className="text-gray-600 leading-relaxed">
                The need for this tool did not start with a product brief or a business plan. It started with a moment of frustration that many of us in the digital space have experienced: you want to quickly understand whether a website has real traffic, and you discover that getting a reliable answer is surprisingly difficult and expensive. The free tools that exist either show nothing useful, lock the real numbers behind a premium subscription, present estimates with no indication of how confident they are, or display obviously wrong figures that clearly came from a stale, poorly-maintained database.
              </p>
              <p className="text-gray-600 leading-relaxed">
                The paid tools are excellent for professionals who use them every day and can justify the subscription cost. But what about the startup founder who needs to check ten competitor sites before a pitch meeting? What about the freelance writer who wants to verify a website's traffic before writing a guest post? What about the student who needs real data for a marketing assignment? What about the small business owner who wants to understand whether an advertising opportunity is worth taking? For all of these people, the existing options are either too expensive, too complex, or too unreliable.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We decided to build the tool that we ourselves wanted to use. The design constraints were clear from the start: it had to be completely free. It had to work without an account or sign-up. It had to return results fast enough to fit into a real research workflow. It had to be transparent about data sources and confidence levels rather than hiding methodology behind a black box. And most importantly, it had to be accurate — not accurate in a marketing sense, but genuinely calibrated against real-world reference data so the estimates could be trusted for actual decision-making.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Building that required significant work. The multi-source data architecture had to be designed from scratch. The piecewise traffic interpolation model had to be calibrated against dozens of real-world data points. The confidence labeling system had to be thoughtfully designed so it communicated uncertainty clearly without overwhelming users. The performance integration had to be fast enough that it did not slow down the traffic results users were primarily there to see. The country distribution estimation had to work gracefully for domains where direct geographic data was not available.
              </p>
              <p className="text-gray-600 leading-relaxed">
                The result is the tool you are using right now. It is not perfect — no traffic estimation tool can be, because no one outside a website's own analytics platform knows its exact visitor count. But it is honest, it is fast, it is free, and it gives you enough signal to make meaningful decisions. Whether you call it a <strong>website traffic checker</strong>, a <strong>website traffic analyzer</strong>, or something else entirely, the goal has always been the same: give everyone access to the kind of traffic intelligence that helps them move forward with confidence. That mission is as relevant today as it was when we started building, and it will keep driving every improvement we make to this platform going forward.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {["Free Forever", "No Sign-Up", "Transparent Methodology", "Multi-Source Data", "Confidence Labels", "Real-Time Analysis"].map((tag) => (
                  <span key={tag} className="inline-flex items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
        {/* ═══════════════════════ END SEO CONTENT ═══════════════════════ */}

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingAnimation />}

        {/* Results */}
        {result && !loading && (
          <div ref={resultsRef} className="space-y-8">
            {/* Domain Header */}
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-gray-200 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  {result.domain.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-gray-900 font-bold text-lg">{result.domain}</div>
                  <div className="text-xs text-gray-400">
                    Analyzed {new Date(result.analyzedAt).toLocaleString()}
                  </div>
                </div>
                {result.site.hasSSL && (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 px-2 py-1 rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    SSL
                  </div>
                )}
              </div>
            </div>

            {/* ========= TRAFFIC RESULTS - MAIN SECTION ========= */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-red-950 border border-gray-800 p-8 glow-border shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                {/* Section title */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Website Traffic</h2>
                  <CategoryBadge category={result.traffic.category} />
                </div>

                {/* Main Estimates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-red-500/30 transition-colors">
                    <div className="text-sm text-red-300 font-semibold mb-1">📅 Estimated Monthly Visits</div>
                    <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                      {result.traffic.estimated}
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                      Range: {result.traffic.estimatedMonthlyVisits}
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-red-500/30 transition-colors">
                    <div className="text-sm text-rose-300 font-semibold mb-1">📊 Estimated Daily Visits</div>
                    <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                      {result.traffic.estimatedDailyVisits}
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                      Range: {result.traffic.dailyRange}
                    </div>
                  </div>
                </div>

                {/* Traffic Details Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-xs text-gray-400 mb-1">Traffic Level</div>
                    <div className="text-xl font-bold text-emerald-400">
                      {result.traffic.category}
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-xs text-gray-400 mb-1">Confidence</div>
                    <div className={`text-xl font-bold ${result.traffic.confidence === "High" ? "text-emerald-400" :
                      result.traffic.confidence === "Medium" ? "text-amber-400" : "text-red-400"
                      }`}>
                      {result.traffic.confidence}
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-xs text-gray-400 mb-1">Est. Yearly Visits</div>
                    <div className="text-xl font-bold text-rose-400">
                      {result.traffic.estimatedRaw >= 1_000_000_000
                        ? `${(result.traffic.estimatedRaw * 12 / 1_000_000_000).toFixed(1)}B`
                        : result.traffic.estimatedRaw >= 1_000_000
                          ? `${(result.traffic.estimatedRaw * 12 / 1_000_000).toFixed(0)}M`
                          : result.traffic.estimatedRaw >= 1_000
                            ? `${(result.traffic.estimatedRaw * 12 / 1_000).toFixed(0)}K`
                            : `${result.traffic.estimatedRaw * 12}`
                      }
                    </div>
                  </div>
                </div>

                {/* Data Sources Badge Row */}
                {(() => {
                  const visibleSources = (result.traffic.dataSources || []).filter(
                    (src) => !/^similar\s*web$/i.test(src)
                  );

                  if (visibleSources.length === 0) return null;

                  return (
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <span className="text-xs text-gray-500">Data sources:</span>
                      {visibleSources.map((src) => (
                        <span key={src} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20">
                          {src}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {/* Engagement Metrics */}
                {result.traffic.engagement && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                      <div className="text-xs text-gray-400 mb-1">Bounce Rate</div>
                      <div className="text-xl font-bold text-red-400">
                        {result.traffic.engagement.bounceRate != null
                          ? `${(result.traffic.engagement.bounceRate * 100).toFixed(1)}%`
                          : "N/A"}
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                      <div className="text-xs text-gray-400 mb-1">Pages / Visit</div>
                      <div className="text-xl font-bold text-white">
                        {result.traffic.engagement.pagesPerVisit ?? "N/A"}
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                      <div className="text-xs text-gray-400 mb-1">Avg. Visit Duration</div>
                      <div className="text-xl font-bold text-rose-300">
                        {result.traffic.engagement.avgVisitDuration != null
                          ? `${Math.floor(result.traffic.engagement.avgVisitDuration / 60)}m ${result.traffic.engagement.avgVisitDuration % 60}s`
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Trend */}
                {result.traffic.monthlyTrend && result.traffic.monthlyTrend.length > 1 && (
                  <div className="mt-4 bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                    <div className="text-xs text-gray-400 mb-3">Monthly Visit Trend</div>
                    <div className="relative">
                      {(() => {
                        const trend = result.traffic.monthlyTrend!;
                        const maxVal = Math.max(...trend.map((t) => t.visits));
                        const minVal = Math.min(...trend.map((t) => t.visits));
                        const range = maxVal - minVal || 1;
                        const height = 120;
                        const width = 100;
                        const padding = { top: 10, bottom: 25, left: 5, right: 5 };
                        const chartHeight = height - padding.top - padding.bottom;
                        const chartWidth = width - padding.left - padding.right;

                        // Calculate points
                        const points = trend.map((m, i) => {
                          const x = padding.left + (i / (trend.length - 1)) * chartWidth;
                          const y = padding.top + chartHeight - ((m.visits - minVal) / range) * chartHeight;
                          return { x, y, data: m };
                        });

                        // Create smooth curve path using cardinal spline
                        const createSmoothPath = (pts: { x: number; y: number }[]) => {
                          if (pts.length < 2) return "";
                          let path = `M ${pts[0].x} ${pts[0].y}`;
                          for (let i = 0; i < pts.length - 1; i++) {
                            const p0 = pts[Math.max(0, i - 1)];
                            const p1 = pts[i];
                            const p2 = pts[i + 1];
                            const p3 = pts[Math.min(pts.length - 1, i + 2)];
                            const cp1x = p1.x + (p2.x - p0.x) / 6;
                            const cp1y = p1.y + (p2.y - p0.y) / 6;
                            const cp2x = p2.x - (p3.x - p1.x) / 6;
                            const cp2y = p2.y - (p3.y - p1.y) / 6;
                            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                          }
                          return path;
                        };

                        const linePath = createSmoothPath(points);
                        const areaPath = linePath + ` L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

                        return (
                          <div className="relative">
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.02" />
                                </linearGradient>
                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="rgb(220, 38, 38)" />
                                  <stop offset="50%" stopColor="rgb(239, 68, 68)" />
                                  <stop offset="100%" stopColor="rgb(248, 113, 113)" />
                                </linearGradient>
                                <filter id="glow">
                                  <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                                  <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                                </filter>
                              </defs>
                              {/* Grid lines */}
                              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                                <line
                                  key={i}
                                  x1={padding.left}
                                  y1={padding.top + ratio * chartHeight}
                                  x2={width - padding.right}
                                  y2={padding.top + ratio * chartHeight}
                                  stroke="rgba(255,255,255,0.05)"
                                  strokeWidth="0.3"
                                />
                              ))}
                              {/* Area fill */}
                              <path d={areaPath} fill="url(#areaGradient)" />
                              {/* Line */}
                              <path
                                d={linePath}
                                fill="none"
                                stroke="url(#lineGradient)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter="url(#glow)"
                              />

                            </svg>
                            {/* Hover areas with tooltips - positioned outside SVG */}
                            {points.map((p, i) => {
                              const month = new Date(p.data.date).toLocaleDateString("en-US", { month: "short" });
                              const year = new Date(p.data.date).getFullYear();
                              const leftPercent = (p.x / width) * 100;
                              const topPercent = (p.y / height) * 100;
                              return (
                                <div
                                  key={i}
                                  className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 flex items-center justify-center"
                                  style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                                >
                                  {/* Proper circular dot */}
                                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.4)] group-hover:scale-125 transition-transform duration-200" />


                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                                    <div className="bg-gray-900 px-3 py-2 rounded-lg shadow-xl text-center whitespace-nowrap border border-gray-600">
                                      <div className="text-xs font-semibold text-red-400">{month} {year}</div>
                                      <div className="text-sm font-bold text-white">{p.data.formatted} visits</div>
                                    </div>
                                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 border-r border-b border-gray-600 rotate-45"></div>
                                  </div>
                                </div>
                              );
                            })}
                            {/* X-axis labels */}
                            <div className="flex justify-between mt-1 px-1">
                              {trend.map((m, i) => {
                                const month = new Date(m.date).toLocaleDateString("en-US", { month: "short" });
                                return (
                                  <div key={i} className="text-[9px] text-gray-500">
                                    {month}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========= COUNTRY TRAFFIC SECTION ========= */}
            {result.traffic.countries && result.traffic.countries.length > 0 && (
              <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Traffic by Country
                </h3>
                <div className="space-y-4">
                  {result.traffic.countries.map((c, i) => {
                    const barColors = [
                      "bg-red-500",
                      "bg-rose-500",
                      "bg-gray-800",
                      "bg-red-400",
                      "bg-gray-600",
                      "bg-rose-400",
                    ];
                    const barColor = barColors[i % barColors.length];
                    return (
                      <div key={c.code} className="flex items-center gap-3">
                        <div className="text-2xl w-9 text-center shrink-0">{c.flag}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-gray-800 font-semibold truncate">{c.country}</span>
                            <span className="text-sm text-gray-500 font-mono ml-2">{c.percentage}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} rounded-full transition-all duration-700`}
                              style={{ width: `${Math.min(c.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-5">
                  Country estimates based on domain TLD, language detection, and global web traffic patterns.
                </p>
              </div>
            )}

            {/* ========= TOP KEYWORDS SECTION ========= */}
            {result.topKeywords && result.topKeywords.length > 0 && (
              <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  Top Search Keywords
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-gray-400 font-semibold border-b border-gray-100">
                        <th className="pb-3 pr-4">Keyword</th>
                        <th className="pb-3 pr-4 text-right">Search Volume</th>
                        <th className="pb-3 text-right">CPC (Est.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.topKeywords.map((k, i) => (
                        <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pr-4">
                            <span className="text-sm font-bold text-gray-800 group-hover:text-red-600 transition-colors">
                              {k.name}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <span className="text-sm font-mono text-gray-600">
                              {k.volume >= 1_000_000
                                ? `${(k.volume / 1_000_000).toFixed(1)}M`
                                : k.volume >= 1_000
                                  ? `${(k.volume / 1_000).toFixed(0)}K`
                                  : k.volume}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <span className="text-sm text-emerald-600 font-semibold">
                              {k.cpc != null ? `$${k.cpc.toFixed(2)}` : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-5">
                  Estimated traffic-driving keywords and monthly search volume data.
                </p>
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                icon="⚡"
                label="Response Time"
                value={`${result.site.responseTime}ms`}
                subValue={
                  result.site.responseTime < 200
                    ? "Excellent"
                    : result.site.responseTime < 500
                      ? "Good"
                      : result.site.responseTime < 1000
                        ? "Average"
                        : "Slow"
                }
                variant="success"
              />
              <MetricCard
                icon="🌐"
                label="HTTP Status"
                value={`${result.site.statusCode} ${result.site.statusCode === 200 ? "OK" : ""}`}
                subValue={result.site.server || "Unknown server"}
                variant="default"
              />
              <MetricCard
                icon="🔐"
                label="Security"
                value={result.site.hasSSL ? "SSL Secured" : "No SSL"}
                subValue={result.site.hasSSL ? "HTTPS connection" : "HTTP only - not secure"}
                variant={result.site.hasSSL ? "success" : "danger"}
              />
              {result.performance.metrics.firstContentfulPaint && (
                <MetricCard
                  icon="🎨"
                  label="First Contentful Paint"
                  value={`${(result.performance.metrics.firstContentfulPaint / 1000).toFixed(1)}s`}
                  subValue={
                    result.performance.metrics.firstContentfulPaint < 1800
                      ? "Good"
                      : result.performance.metrics.firstContentfulPaint < 3000
                        ? "Needs Improvement"
                        : "Poor"
                  }
                  variant="warning"
                />
              )}
              {result.performance.metrics.largestContentfulPaint && (
                <MetricCard
                  icon="🖼️"
                  label="Largest Contentful Paint"
                  value={`${(result.performance.metrics.largestContentfulPaint / 1000).toFixed(1)}s`}
                  subValue={
                    result.performance.metrics.largestContentfulPaint < 2500
                      ? "Good"
                      : result.performance.metrics.largestContentfulPaint < 4000
                        ? "Needs Improvement"
                        : "Poor"
                  }
                  variant="danger"
                />
              )}
              {result.performance.metrics.totalBlockingTime !== null && (
                <MetricCard
                  icon="🔒"
                  label="Total Blocking Time"
                  value={`${result.performance.metrics.totalBlockingTime}ms`}
                  subValue={
                    result.performance.metrics.totalBlockingTime < 200
                      ? "Good"
                      : result.performance.metrics.totalBlockingTime < 600
                        ? "Needs Improvement"
                        : "Poor"
                  }
                  variant="danger"
                />
              )}
            </div>

            {/* Performance Scores */}
            {(result.performance.scores.performance !== null ||
              result.performance.scores.seo !== null) && (
                <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Lighthouse Scores
                  </h3>
                  <div className="flex flex-wrap justify-center gap-8">
                    <ScoreRing
                      score={result.performance.scores.performance}
                      label="Performance"
                    />
                    <ScoreRing
                      score={result.performance.scores.seo}
                      label="SEO"
                    />
                    <ScoreRing
                      score={result.performance.scores.accessibility}
                      label="Accessibility"
                    />
                    <ScoreRing
                      score={result.performance.scores.bestPractices}
                      label="Best Practices"
                    />
                  </div>
                </div>
              )}

            {/* Chrome UX Report */}
            {result.traffic.hasChromeUserData && (
              <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Chrome User Experience Report
                  <span className="text-xs font-normal text-gray-400 ml-1">(Real User Data)</span>
                </h3>
                <p className="text-sm text-gray-400 mb-5">
                  This data comes from real Chrome users who visited this website.
                  It confirms the site has significant traffic.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-2 font-medium">FCP</div>
                    <CruxBadge category={result.performance.cruxMetrics.fcpCategory} />
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-2 font-medium">LCP</div>
                    <CruxBadge category={result.performance.cruxMetrics.lcpCategory} />
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-2 font-medium">CLS</div>
                    <CruxBadge category={result.performance.cruxMetrics.clsCategory} />
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-2 font-medium">INP</div>
                    <CruxBadge category={result.performance.cruxMetrics.inpCategory} />
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-2 font-medium">FID</div>
                    <CruxBadge category={result.performance.cruxMetrics.fidCategory} />
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-2 font-medium">TTFB</div>
                    <CruxBadge category={result.performance.cruxMetrics.ttfbCategory} />
                  </div>
                </div>
              </div>
            )}

            {/* Site Info */}
            <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Site Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-500">Domain</span>
                  <span className="text-gray-900 font-semibold">{result.domain}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-500">SSL Certificate</span>
                  <span className={result.site.hasSSL ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {result.site.hasSSL ? "✓ Secure" : "✗ Not Secure"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-500">Server</span>
                  <span className="text-gray-900 font-semibold">
                    {result.site.server || "Hidden"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-500">Technology</span>
                  <span className="text-gray-900 font-semibold">
                    {result.site.poweredBy || "Not disclosed"}
                  </span>
                </div>
                {result.site.redirectUrl && (
                  <div className="col-span-full flex justify-between items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-500">Redirects to</span>
                    <span className="text-red-600 font-semibold truncate max-w-xs">
                      {result.site.redirectUrl}
                    </span>
                  </div>
                )}
                {result.performance.metrics.speedIndex && (
                  <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-500">Speed Index</span>
                    <span className="text-gray-900 font-semibold">
                      {(result.performance.metrics.speedIndex / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
                {result.performance.metrics.timeToInteractive && (
                  <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-500">Time to Interactive</span>
                    <span className="text-gray-900 font-semibold">
                      {(result.performance.metrics.timeToInteractive / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="text-center text-xs text-gray-400 py-4">
              <p>
                Traffic estimates are based on the Tranco global ranking list and
                Chrome User Experience Report (CrUX) data.
              </p>
              <p className="mt-1">
                Actual traffic may vary. For precise analytics, use tools like
                Google Analytics on your own website.
              </p>
            </div>
          </div>
        )}

        {/* Footer / Features */}
        {!result && !loading && (
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">
              Powered by Google PageSpeed Insights API &amp; Tranco Ranking List
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
