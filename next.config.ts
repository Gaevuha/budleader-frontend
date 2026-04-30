import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "picsum.photos",
  },
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (apiUrl) {
  try {
    const parsedApiUrl = new URL(apiUrl);

    remotePatterns.push({
      protocol: parsedApiUrl.protocol.replace(":", "") as "http" | "https",
      hostname: parsedApiUrl.hostname,
      port: parsedApiUrl.port || undefined,
    });
  } catch {
    // Ignore invalid API URL values in local environments.
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    deviceSizes: [375, 460, 474, 686, 700, 768, 960, 1200, 1440],
    imageSizes: [140, 220, 237, 331, 343, 351],
    formats: ["image/avif", "image/webp"],
    qualities: [52, 58, 75],
    remotePatterns,
  },
};

export default nextConfig;
