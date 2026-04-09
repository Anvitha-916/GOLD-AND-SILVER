import { useEffect, useState } from "react";

const DISPLAY_MS = 13000;
const FADE_MS = 900;

export default function IntroOverlay() {
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setIsFading(true);
    }, DISPLAY_MS);

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, DISPLAY_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <section className={`intro-overlay ${isFading ? "is-fading" : ""}`}>
      <div className="intro-orbit intro-orbit-left" />
      <div className="intro-orbit intro-orbit-right" />
      <div className="intro-core">
        <p className="intro-kicker">PRECIOUS METALS INTELLIGENCE</p>
        <h1>Data-Driven Business Intelligence For Precious Metal Price Forecasting And Market Analysis</h1>
        <p className="intro-copy">
          Turning global production, demand signals, and predictive models into decisions for gold and silver markets.
        </p>
        <div className="intro-bar">
          <span />
        </div>
      </div>
    </section>
  );
}
