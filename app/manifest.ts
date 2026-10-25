import type { MetadataRoute } from "next";

// Makes the site installable ("Add to Home screen") as a standalone app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bettman",
    short_name: "Bettman",
    description: "Private football prediction game",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    categories: ["sports", "games", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Fixtures", url: "/fixtures", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Leaderboard", url: "/leaderboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
