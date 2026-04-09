import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "./api";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

export default function ForecastApp() {
  const [options, setOptions] = useState({ commodities: [], markets: [] });
  const [commodity, setCommodity] = useState("Gold");
  const [market, setMarket] = useState("USA_USD_per_10g");
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchOptions() {
      try {
        const response = await axios.get(`${API_BASE}/options`);
        if (!active) {
          return;
        }

        setOptions(response.data);
        if (response.data.commodities?.length) {
          setCommodity((current) =>
            response.data.commodities.includes(current) ? current : response.data.commodities[0],
          );
        }
        if (response.data.markets?.length) {
          setMarket((current) =>
            response.data.markets.includes(current) ? current : response.data.markets[0],
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
    if (!commodity || !market || !year) {
      return;
    }

    let active = true;

    async function fetchPrediction() {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/predict`, {
          params: { commodity, market, year },
        });
        if (active) {
          setData(response.data);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setData(null);
          setError(
            requestError?.response?.data?.detail ||
              "Unable to load predictions. Start the backend and try again.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchPrediction();
    return () => {
      active = false;
    };
  }, [commodity, market, year]);

  const metrics = data
    ? [
        {
          label: `Current ${data.current_year}`,
          value: formatPrice(data.current_prediction, data.currency),
          delta: `${data.region} • ${data.unit}`,
        },
        {
          label: `Target ${data.target_year}`,
          value: formatPrice(data.target_prediction, data.currency),
          delta: `${data.market.replaceAll("_", " ")}`,
        },
        {
          label: "Projected Change",
          value: formatPrice(data.change_value, data.currency),
          delta: formatPercent(data.change_percent),
        },
      ]
    : [];

  return (
    <main className="page-shell forecast-page">
      <section className="forecast-layout">
        <div className="hero-copy forecast-box">
          <a className="forecast-toggle" href="/index.html">
            World Maps
          </a>
          <p className="eyebrow">Metal Price Forecast</p>
          <div className="controls-grid">
            <label className="control">
              <span>Metal</span>
              <div className="select-wrap">
                <select value={commodity} onChange={(event) => setCommodity(event.target.value)}>
                  {options.commodities.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="control">
              <span>Currency</span>
              <div className="select-wrap">
                <select value={market} onChange={(event) => setMarket(event.target.value)}>
                  {options.markets.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="control">
              <span>Target Year</span>
              <input
                type="number"
                min="1900"
                max="2100"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              />
            </label>
          </div>

          <h1 className="forecast-heading">Predict metal prices by year across global currencies.</h1>

          <section className="forecast-cards-grid">
            <div className="status-panel forecast-card-large">
              <span className={`signal-pill ${signalTone(data?.signal)}`}>{data?.signal ?? "Waiting"}</span>
              <h2>{loading ? "Loading..." : formatPrice(data?.target_prediction, data?.currency)}</h2>
              <p>{data ? `${data.commodity} projected for ${data.target_year}` : "Prediction pending"}</p>
              <span className="date-stamp">
                {data ? `${data.market.replaceAll("_", " ")}` : "Select a market"}
              </span>
            </div>

            {metrics.map((metric) => (
              <article className="metric-card forecast-metric-card" key={metric.label}>
                <p>{metric.label}</p>
                <h3>{metric.value}</h3>
                <span>{metric.delta}</span>
              </article>
            ))}
          </section>
        </div>

        <section className="chart-card forecast-box projection-box">
          <div className="chart-header">
            <div>
              <p className="section-tag">Metal Projection</p>
              <h2>{data ? `${data.commodity} price path around ${data.target_year}` : "Prediction trend"}</h2>
            </div>
          </div>

          <div className="chart-wrap chart-wrap-forecast">
            {loading ? (
              <div className="empty-state">Fetching model predictions...</div>
            ) : (
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={data?.chart_data}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="year" stroke="#a9a28d" />
                  <YAxis stroke="#a9a28d" domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(value) => formatPrice(value, data?.currency)}
                    contentStyle={{
                      backgroundColor: "#1a1812",
                      border: "1px solid rgba(217, 184, 97, 0.25)",
                      borderRadius: "16px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted_price"
                    name="Predicted Price"
                    stroke="#7fe3c5"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#f2cd72" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </section>

      {error ? <section className="error-banner">{error}</section> : null}
    </main>
  );
}
