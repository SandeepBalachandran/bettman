import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Bettman — Private World Cup Prediction League";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d9488 0%, #7c3aed 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 180,
            height: 180,
            borderRadius: 40,
            background: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 110,
            marginBottom: 36,
          }}
        >
          🏆
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -2,
          }}
        >
          Bettman
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 500,
            color: "rgba(255,255,255,0.9)",
            marginTop: 18,
          }}
        >
          World Cup Prediction League ⚽
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 400,
            color: "rgba(255,255,255,0.75)",
            marginTop: 28,
          }}
        >
          Predict winners &amp; scorers · Climb the leaderboard · Win bragging rights
        </div>
      </div>
    ),
    { ...size }
  );
}
