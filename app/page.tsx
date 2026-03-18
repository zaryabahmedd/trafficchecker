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

        <section className="mb-14 rounded-3xl bg-white border border-gray-200 p-8 shadow-sm space-y-6">
          <p className="text-sm text-red-600 font-semibold uppercase tracking-wide">
            SEO Content Section
          </p>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            Why choose our trafic checker platoform or website
          </h2>

          <p className="text-gray-600 leading-relaxed">
            Every growth journey starts with one honest question: how many real people visit my site, and why? Our platform was built for founders, marketers, bloggers, agencies, and curious builders who are tired of guessing. In one scan, you can turn a URL into practical traffic intelligence. If you have searched for a webstie traffic chekcmer, website traffic chekcmer, or a reliable website traffic analyzer, you are exactly where you need to be. This is your fast lane from confusion to clarity, with a clear call to action at the center: run your check, compare your progress, and make your next move with confidence.
          </p>

          <p className="text-gray-600 leading-relaxed">
            Think of it like a map before a long drive. Without direction, you spend time and money moving in circles. With clean visibility, every action becomes more intentional. You can prioritize pages that deserve optimization, identify competitor momentum, and spot traffic opportunities before they become crowded. Over time, those small, data-backed choices compound into better rankings, better conversions, and better business outcomes.
          </p>

          <ol className="list-decimal pl-6 text-gray-700 space-y-2 leading-relaxed">
            <li>Free, instant scans with no complicated setup.</li>
            <li>Simple interface that works for beginners and experts.</li>
            <li>Estimated monthly and daily visits in one clear view.</li>
            <li>Global rank signals and supporting traffic context.</li>
            <li>Country-level traffic distribution for smarter targeting.</li>
            <li>Performance and SEO scoring in the same workflow.</li>
            <li>Top keyword indicators to guide your content priorities.</li>
            <li>Confidence labels so decisions are made responsibly.</li>
            <li>Live-friendly UX built for quick checks and rapid comparisons.</li>
            <li>Action-oriented insights that help you plan your next campaign.</li>
          </ol>

          <h3 className="text-2xl font-bold text-gray-900">
            How our traffic analyzer software works and why we are accurate?
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Accuracy is not a magic trick. It is a process. Our traffic analyzer software combines multiple quality signals: real-world browsing behavior patterns, ranking references, on-site performance signals, and trend-based estimation logic. Then, those inputs are normalized and cross-checked to reduce obvious outliers before results are shown. Instead of pretending to know the impossible, we present realistic ranges, confidence levels, and supporting metrics so you can understand not only the number, but also its reliability. This is why professionals use us as a website traffic analyzer for competitor benchmarking, campaign planning, and SEO forecasting.
          </p>

          <h4 className="text-xl font-bold text-gray-900">
            Contributing speciallv vlaue to traffic chekrs, seo analyst and the rest of the world
          </h4>
          <p className="text-gray-600 leading-relaxed">
            A strong internet economy depends on transparent insight. Students use our checker to learn digital strategy. Small businesses use it to decide where to invest next. Agencies use it to validate direction before launching high-budget campaigns. SEO teams use it to spot momentum shifts early. Product teams use it to measure demand signals in new regions. Content creators use it to identify where attention already exists. Even non-technical teams can read the story behind the data and take meaningful action. That is the bigger mission: democratize traffic intelligence so better decisions are not reserved for enterprise budgets.
          </p>

          <h5 className="text-lg font-bold text-gray-900">
            The need was there as there was no accurate free traffic achekce r website availabel across the internet
          </h5>
          <p className="text-gray-600 leading-relaxed">
            We built this because too many free tools were either outdated, too shallow, or too confusing. People needed an accurate free checker that felt trustworthy from the first click. So we focused on clarity, speed, and transparent methodology. Today, this tool helps you move from raw curiosity to practical growth strategy in minutes. Whether you call it a webstie traffic chekcmer, website traffic chekcmer, traffic analyzer, or website traffic analyzer, the goal stays the same: help you measure what matters, act faster, and grow smarter.
          </p>
        </section>

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
          <div className="mt-16 text-center">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
              <div className="group p-7 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-3xl mb-4 mx-auto group-hover:scale-110 transition-transform">
                  📊
                </div>
                <h3 className="text-gray-900 font-bold mb-2">Traffic Estimates</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Get estimated monthly and daily visits based on global ranking databases.
                </p>
              </div>
              <div className="group p-7 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-3xl mb-4 mx-auto group-hover:scale-110 transition-transform">
                  ⚡
                </div>
                <h3 className="text-gray-900 font-bold mb-2">Performance Scores</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Lighthouse performance, SEO, accessibility, and best practices scores.
                </p>
              </div>
              <div className="group p-7 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-red-200 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-3xl mb-4 mx-auto group-hover:scale-110 transition-transform">
                  👥
                </div>
                <h3 className="text-gray-900 font-bold mb-2">Real User Data</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Chrome User Experience Report data from real website visitors.
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Powered by Google PageSpeed Insights API & Tranco Ranking List
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
