import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Show, UserButton } from "@clerk/react";
import Dashboard from "./pages/Dashboard.jsx";
import OrderBook from "./components/OrderBook.jsx";
import AuthButton from "./components/AuthButton.jsx";

const GITHUB = "https://github.com/Ankit-jha-27/chronos";

const features = [
  ["MATCHING ENGINE", "Price-time priority", "A single-threaded, sequenced matching core with real depth and SQLite persistence. Deterministic, so every run can be replayed."],
  ["AI SWARM", "Agents that quote from trained models", "PPO market makers and whales plus heuristic retail traders, all push-driven and submitting orders concurrently."],
  ["PILLAR 1 · REPLAY", "History that diverges when you trade", "Replay real historical data, and the moment your orders hit the book, the market latches to reactive mode."],
  ["PILLAR 2 · STRATEGIES", "Trade as a first-class participant", "Write a strategy with the SDK, run it in a sealed sandbox, or connect institutional flow through the FIX 4.4 gateway."],
  ["NEWS ORACLE", "Inject a headline, watch the gap", "A Gemini-powered macro engine with a local fallback scorer sizes shocks from actual book depth."],
  ["TERMINAL", "Market, Strategy, Runs", "A professional trading terminal dashboard served over REST and WebSockets from the bridge."],
];
const ports = [
  [":5555", "Order entry", "Engine ROUTER with per-session identity and one ack per request."],
  [":5556", "Market data", "Engine PUB feed of every tick, trade, and event."],
  [":5557", "News oracle", "Scores headlines and trades like any other participant."],
  [":8000", "Bridge", "Dashboard, REST API, and a WebSocket fan-out."],
];
const stats = [
  ["99", "agents: 15 PPO market makers, 4 whales, 80 retail"],
  ["4", "cooperating processes talking over ZeroMQ"],
  ["1:1", "price equals the last real trade in the book"],
  ["Seeded", "deterministic, replayable runs"],
];
const steps = [
  ["Start a simulation", "Pick a symbol and a starting price, then let the swarm populate the book."],
  ["Trade or inject news", "Submit a strategy, load a historical CSV for replay, or fire a headline at the oracle."],
  ["Read the reaction", "See fills, price impact, and equity from runs stored in SQLite."],
];

function Head({ eyebrow, title, sub }) {
  return (
    <>
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <p className="sub">{sub}</p>
    </>
  );
}

function Landing() {
  const [dark, setDark] = useState(null);
  const toggle = () => {
    const isDark = dark ?? matchMedia("(prefers-color-scheme: dark)").matches;
    const next = !isDark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    document.documentElement.style.colorScheme = next ? "dark" : "light";
  };

  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <a className="logo" href="#top"><i />Chronos</a>
            <div className="links">
              <a href="#why">Why Chronos</a><a href="#features">Features</a>
              <a href="#architecture">Architecture</a><a href="#how">How it works</a>
            </div>
            <button className="btn tg" onClick={toggle} aria-label="Toggle theme">◐</button>
            <AuthButton mode="signin" className="btn in">Sign in</AuthButton>
            <AuthButton mode="signup" className="btn p">Get started</AuthButton>
            <Show when="signed-in"><UserButton /></Show>
          </nav>
        </div>
      </header>

      <main id="top">
        <div className="wrap hero">
          <div>
            <div className="eyebrow">Reactive market digital twin</div>
            <h1>Backtest with <em>yourself</em> in the market.</h1>
            <p className="lead">Chronos runs a living limit order book populated by AI agents. Your orders match real resting liquidity, move the price, and the market reacts. Not what happened — what would have happened, with you in it.</p>
            <div className="cta">
              <a className="btn lg" href={GITHUB} target="_blank" rel="noopener noreferrer">View on GitHub</a>
            </div>
            <div className="note">Price comes only from real trades in the book. No random walk.</div>
          </div>
          <OrderBook />
        </div>

        <section id="why"><div className="wrap">
          <Head eyebrow="The problem" title="Classic backtests assume you don’t exist."
            sub="Replaying a frozen tape means every fill happens at the quoted price with zero impact — the price-taker fallacy. Chronos removes it." />
          <div className="grid g2">
            <div className="card vs bad"><span className="tag">TRADITIONAL BACKTESTER</span><h3>What happened</h3>
              <ul><li>Replays a frozen historical tape</li><li>Your trades never touch the price</li><li>Slippage is a guessed constant</li></ul></div>
            <div className="card vs good"><span className="tag">CHRONOS</span><h3>What would have happened</h3>
              <ul><li>A living limit order book of AI and rule-based agents</li><li>Impact emerges from real depth consumed</li><li>Agents re-price on the next tick</li></ul></div>
          </div>
        </div></section>

        <section><div className="wrap"><div className="grid g4">
          {stats.map(([b, s]) => <div className="stat" key={b}><b>{b}</b><span>{s}</span></div>)}
        </div></div></section>

        <section id="features"><div className="wrap">
          <Head eyebrow="Features" title="A real exchange, in a box."
            sub="Everything you need to test a strategy against a market that pushes back." />
          <div className="grid g3">
            {features.map(([t, h, p]) => (
              <div className="card" key={t}><span className="tag">{t}</span><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
        </div></section>

        <section id="architecture"><div className="wrap">
          <Head eyebrow="Architecture" title="Two planes, like a real exchange."
            sub="Order entry runs over reliable request/reply sockets. Market data is pushed one-to-many, sequence-numbered. Honest scope: this is a single-node system." />
          <div className="grid g4">
            {ports.map(([port, h, p]) => (
              <div className="card" key={port}><div className="port">{port}</div><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
        </div></section>

        <section id="how"><div className="wrap">
          <Head eyebrow="How it works" title="From idea to impact in three steps." sub={"\u00a0"} />
          <div className="grid g3 steps">
            {steps.map(([h, p]) => <div className="card" key={h}><h3>{h}</h3><p>{p}</p></div>)}
          </div>
          <p className="sub" style={{ margin: "32px 0 16px" }}>Strategies run in sealed containers: no network, read-only filesystem, capped CPU and memory.</p>
          <pre><b>def</b> on_tick(state):{"\n"}    <b>return</b> orders   <i># your strategy, as a first-class participant</i></pre>
        </div></section>

        <section className="final"><div className="wrap">
          <h2>See what your strategy does to the market.</h2>
          <p className="lead">Create an account and run your first reactive simulation.</p>
          <div className="cta">

            <AuthButton mode="signin" className="btn lg">Sign in</AuthButton>
          </div>
        </div></section>
      </main>

      <footer><div className="wrap"><span>© 2026 Project Chronos</span><a href={GITHUB} target="_blank" rel="noopener noreferrer">github.com/Ankit-jha-27/chronos</a></div></footer>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
