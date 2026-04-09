import { useEffect, useState } from "react";
import axios from "axios";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE = "http://127.0.0.1:8000";
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const REGION_COUNTRIES = {
  Europe: [
    "United Kingdom",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Poland",
    "Netherlands",
    "Belgium",
    "Switzerland",
    "Austria",
    "Czechia",
    "Portugal",
    "Greece",
    "Sweden",
    "Norway",
    "Finland",
    "Denmark",
    "Romania",
    "Hungary",
    "Ireland",
    "Ukraine",
  ],
  "Middle East": [
    "Saudi Arabia",
    "United Arab Emirates",
    "Qatar",
    "Kuwait",
    "Oman",
    "Bahrain",
    "Jordan",
    "Israel",
    "Iraq",
    "Iran",
    "Turkey",
    "Syria",
    "Lebanon",
    "Yemen",
  ],
  Others: [],
};

function formatPrice(value, currency) {
  if (value == null) {
    return "--";
  }

  const safeCurrency = currency && currency.length === 3 ? currency : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  if (value == null) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function signalTone(signal) {
  if (signal === "RISE") {
    return "buy";
  }
  if (signal === "FALL") {
    return "sell";
  }
  return "hold";
}

function normalizeName(value) {
  return value.toLowerCase().replaceAll(".", "").replaceAll(",", "").trim();
}

function buildProducerMap(producers = []) {
  return Object.fromEntries(producers.map((item) => [normalizeName(item.name), item.value]));
}

function buildUsageMap(usage = []) {
  const usageEntries = {};

  usage.forEach((item) => {
    if (item.name === "Others") {
      usageEntries.__others = item.value;
      return;
    }

    if (REGION_COUNTRIES[item.name]) {
      REGION_COUNTRIES[item.name].forEach((country) => {
        usageEntries[normalizeName(country)] = item.value;
      });
      return;
    }

    usageEntries[normalizeName(item.name)] = item.value;
  });

  return usageEntries;
}

function goldIntensity(value, maxValue) {
  if (!value || !maxValue) {
    return "#080808";
  }

  const ratio = Math.max(0.08, value / maxValue);
  const alpha = 0.16 + ratio * 0.84;
  return `rgba(242, 205, 114, ${alpha.toFixed(2)})`;
}

function WorldIntensityMap({ title, subtitle, values, maxValue }) {
  return (
    <article className="map-card">
      <div className="chart-header">
        <div>
          <p className="section-tag">{title}</p>
          <h2>{subtitle}</h2>
        </div>
      </div>

      <div className="map-shell">
        <ComposableMap projectionConfig={{ scale: 150 }} className="world-map">
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryName = geo.properties.name || geo.properties.NAME;
                const normalized = normalizeName(countryName ?? "");
                const value = values[normalized] ?? values.__others ?? 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={goldIntensity(value, maxValue)}
                    stroke="rgba(255, 255, 255, 0.72)"
                    strokeWidth={0.45}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#ffd886" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
    </article>
  );
}

export default function App() {
  const [options, setOptions] = useState({ commodities: [], markets: [] });
  const [statsOptions, setStatsOptions] = useState({ categories: [] });
  const [statsCategory, setStatsCategory] = useState("Gold");
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchOptions() {
      try {
        const [predictionOptions, statsResponse] = await Promise.all([axios.get(`${API_BASE}/options`), axios.get(`${API_BASE}/global-stats/options`)]);
        if (!active) {
          return;
        }

        setOptions(predictionOptions.data);
        setStatsOptions(statsResponse.data);
        if (statsResponse.data.categories?.length) {
          setStatsCategory((current) =>
            statsResponse.data.categories.includes(current) ? current : statsResponse.data.categories[0],
          );
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.detail ||
              "Unable to load model options. Start the backend and try again.",
          );
        }
      }
    }

    fetchOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!statsCategory) {
      return;
    }

    let active = true;

    async function fetchStats() {
      try {
        setStatsLoading(true);
        const response = await axios.get(`${API_BASE}/global-stats`, {
          params: { category: statsCategory },
        });
        if (active) {
          setStatsData(response.data);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.detail ||
              "Unable to load global stats. Start the backend and try again.",
          );
        }
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    }

    fetchStats();
    return () => {
      active = false;
    };
  }, [statsCategory]);

  const producerValues = buildProducerMap(statsData?.producers);
  const usageValues = buildUsageMap(statsData?.usage);
  const producerMax = Math.max(...(statsData?.producers ?? []).map((item) => item.value), 0);
  const usageMax = Math.max(...(statsData?.usage ?? []).map((item) => item.value), 0);

  return (
    <main className="page-shell home-page">
      <section className="front-grid">
        <article className="front-copy">
          <a className="forecast-toggle" href="/forecast.html">
            Metal Forecast
          </a>
          <p className="eyebrow">Global Supply And Usage</p>
          <div className="category-row">
            {statsOptions.categories.map((option) => (
              <button
                type="button"
                key={option}
                className={`category-chip ${statsCategory === option ? "active" : ""}`}
                onClick={() => setStatsCategory(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </article>

        <article className="front-stat">
          <p className="section-tag">Global Snapshot</p>
          <h2>{statsLoading ? "Loading..." : statsData?.category}</h2>
          <div className="snapshot-grid">
            <div>
              <span>Top Producer</span>
              <strong>{statsData?.top_producer ?? "--"}</strong>
            </div>
            <div>
              <span>Top Usage Region</span>
              <strong>{statsData?.top_usage_region ?? "--"}</strong>
            </div>
            <div>
              <span>Producer Total</span>
              <strong>{statsData?.producer_total ?? "--"}%</strong>
            </div>
            <div>
              <span>Usage Total</span>
              <strong>{statsData?.usage_total ?? "--"}%</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="stats-grid">
        {statsLoading ? (
          <div className="stats-loading">Loading world maps...</div>
        ) : (
          <>
            <WorldIntensityMap
              title="Global Producers"
              subtitle={statsData ? `${statsData.category} production intensity by country` : "Production map"}
              values={producerValues}
              maxValue={producerMax}
            />
            <div className="map-data-list">
              {(statsData?.producers ?? []).map((item) => (
                <div className="map-data-row" key={item.name}>
                  <span>{item.name}</span>
                  <strong>{item.value}%</strong>
                </div>
              ))}
            </div>
            <WorldIntensityMap
              title="Global Usage"
              subtitle={statsData ? `${statsData.category} usage intensity by geography` : "Usage map"}
              values={usageValues}
              maxValue={usageMax}
            />
            <div className="map-data-list">
              {(statsData?.usage ?? []).map((item) => (
                <div className="map-data-row" key={item.name}>
                  <span>{item.name}</span>
                  <strong>{item.value}%</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      {error ? <section className="error-banner">{error}</section> : null}
    </main>
  );
}
