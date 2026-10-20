/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // The companies app is a static page copied to public/companies/ by scripts/prebuild.mjs.
    return [{ source: "/companies", destination: "/companies/index.html" }];
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
