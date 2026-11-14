import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141512",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: "50%",
            border: "20px solid #f4f4f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 170,
              height: 170,
              borderRadius: "50%",
              border: "8px solid rgba(244,244,241,0.42)",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 54,
            width: 20,
            height: 44,
            borderRadius: 10,
            background: "#f4f4f1",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 138,
            top: 142,
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "#5bd6a8",
          }}
        />
      </div>
    ),
    size,
  );
}
