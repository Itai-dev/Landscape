/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // The companies app is a static page copied to public/companies/ by scripts/prebuild.mjs.
    return [{ source: "/companies", destination: "/companies/index.html" }];
  },
  async headers() {
    // Basic hardening for every response. Pages can't be framed by other sites (the account and unsubscribe
    // buttons stay out of clickjacking reach). No script policy yet: it would have to list Vercel Analytics
    // and Supabase first.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      // Account and sign-in pages are never cached by shared caches.
      { source: "/auth/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  async redirects() {
    // Old addresses of the companies app. The #fragment (an org id or a tab) survives the redirect.
    return [
      { source: "/map", destination: "/companies", permanent: true },
      { source: "/map/app.html", destination: "/companies", permanent: true },
    ];
  },
};
export default nextConfig;
