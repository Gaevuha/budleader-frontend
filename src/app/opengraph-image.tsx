import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Будлідер - будівельні матеріали та послуги";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "linear-gradient(135deg, #f4efe4 0%, #ddd2b7 42%, #3b5a43 100%)",
          color: "#1f241f",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
            }}
          >
            <div
              style={{
                width: "74px",
                height: "74px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "20px",
                background: "rgba(255,255,255,0.72)",
                border: "2px solid rgba(31,36,31,0.12)",
                fontSize: "34px",
                fontWeight: 800,
              }}
            >
              БЛ
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ fontSize: "26px", opacity: 0.76 }}>
                budleader.com.ua
              </div>
              <div style={{ fontSize: "44px", fontWeight: 800 }}>Будлідер</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 20px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.72)",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            Каталог + доставка
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "860px",
            gap: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "72px",
              lineHeight: 1.05,
              fontWeight: 800,
            }}
          >
            Будівельні матеріали та послуги для ремонту і будівництва
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              lineHeight: 1.35,
              color: "rgba(31,36,31,0.82)",
            }}
          >
            Інструменти, сантехніка, електротовари, техніка та швидкий підбір
            під ваш об&apos;єкт.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          {[
            "Будматеріали",
            "Інструменти",
            "Сантехніка",
            "Електротовари",
            "Послуги техніки",
          ].map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                padding: "14px 22px",
                borderRadius: "999px",
                background: "rgba(31,36,31,0.84)",
                color: "#f8f4ea",
                fontSize: "24px",
                fontWeight: 700,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
