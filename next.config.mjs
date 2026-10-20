/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // The original map app lives at /map/app.html (copied from site/ by scripts/prebuild.mjs).
    return [{ source: "/map", destination: "/map/app.html", permanent: false }];
  },
};
export default nextConfig;
