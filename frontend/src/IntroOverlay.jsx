import { useEffect, useState } from "react";

const DISPLAY_MS = 20000;
const FADE_MS = 900;
const INTRO_STORAGE_KEY = "precious-metals-intro-seen";

export default function IntroOverlay() {
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return sessionStorage.getItem(INTRO_STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const fadeTimer = window.setTimeout(() => {
      setIsFading(true);
    }, DISPLAY_MS);

    const hideTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(INTRO_STORAGE_KEY, "true");
      } catch {}
      setIsVisible(false);
    }, DISPLAY_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  function handleSkip() {
    setIsFading(true);
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, "true");
    } catch {}
    window.setTimeout(() => {
      setIsVisible(false);
    }, FADE_MS);
  }

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
        <button type="button" className="intro-skip" onClick={handleSkip}>
          Skip Intro
        </button>
      </div>
    </section>
  );
}
