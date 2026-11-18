import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { UserButton, useAuth, useUser } from "@clerk/react";
import useSWR from "swr";
import NewBacktestDialog from "../components/NewBacktestDialog.jsx";
import { API, apiFetch } from "../lib/api.js";
import "./Dashboard.css";

const ICONS = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 6-7" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
  refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3" /></>,
  upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
};

function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function shortId(value = "") {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value || "—";
}

function MetricCard({ label, value, note, tone }) {
  return (
    <article className="dash-metric">
      <div className="dash-metric-top"><span>{label}</span><span className={`dash-metric-mark ${tone || ""}`} aria-hidden="true" /></div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function SectionHeading({ eyebrow, title, action, id }) {
  return (
    <div className="dash-section-heading">
      <div><span className="dash-eyebrow">{eyebrow}</span><h2 id={id}>{title}</h2></div>
      {action}
    </div>
  );
}

function LoadingRows({ count = 3 }) {
  return <div className="dash-loading" aria-label="Loading data">{Array.from({ length: count }, (_, index) => <span className="dash-skeleton" key={index} />)}</div>;
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="dash-empty dash-error" role="status">
      <strong>Could not load this section</strong>
      <span>{message || "Check the Chronos API connection and try again."}</span>
      <button className="dash-link-button" type="button" onClick={onRetry}>Try again</button>
    </div>
  );
}

function EmptyState({ title, detail, action }) {
  return <div className="dash-empty"><span className="dash-empty-icon"><Icon name="chart" size={19} /></span><strong>{title}</strong><span>{detail}</span>{action}</div>;
}

function Dashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [datasets, setDatasets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const fetcher = useCallback((path) => apiFetch(getToken, path), [getToken]);
  const enabled = isLoaded && isSignedIn;

  const { data: runs, error: runsError, isLoading: runsLoading, mutate: refreshRuns } = useSWR(enabled ? "/api/runs" : null, fetcher, { refreshInterval: 20000, revalidateOnFocus: true });
  const { data: scripts, error: scriptsError, isLoading: scriptsLoading, mutate: refreshScripts } = useSWR(enabled ? "/api/scripts" : null, fetcher, { refreshInterval: 30000, revalidateOnFocus: true });
  const { data: results, error: resultsError, isLoading: resultsLoading, mutate: refreshResults } = useSWR(enabled ? "/api/results" : null, fetcher, { refreshInterval: 15000, revalidateOnFocus: true });
  const { data: runningStrategies } = useSWR(enabled ? "/api/strategy/list" : null, fetcher, { refreshInterval: 10000, revalidateOnFocus: true, shouldRetryOnError: false });

  useEffect(() => {
    document.title = "Chronos · Dashboard";
  }, []);

  const normalizedRuns = Array.isArray(runs) ? runs : [];
  const normalizedScripts = Array.isArray(scripts) ? scripts : [];
  const normalizedResults = Array.isArray(results) ? results : [];
  const normalizedRunning = Array.isArray(runningStrategies) ? runningStrategies : [];
  const totalTrades = normalizedResults.reduce((sum, item) => sum + (Number(item.total_trades) || 0), 0);
  const orderedResults = [...normalizedResults].sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));
  const latestPnl = orderedResults.length ? Number(orderedResults[0].total_pnl) || 0 : null;
  const runningByScript = useMemo(() => new Map(normalizedRunning.filter((item) => item.script_id).map((item) => [item.script_id, item])), [normalizedRunning]);
  const recentRuns = normalizedRuns.slice(0, 6);
  const recentScripts = normalizedScripts.slice(0, 4);

  const refreshAll = () => Promise.all([refreshRuns(), refreshScripts(), refreshResults()]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const uploaded = await apiFetch(getToken, "/api/replay/upload", { method: "POST", body });
      setDatasets((current) => [uploaded, ...current.filter((item) => item.file_id !== uploaded.file_id)]);
      setNotice(`${uploaded.filename} is ready to replay.`);
      window.setTimeout(() => setNotice(""), 4500);
    } catch (error) {
      setUploadError(error.message || "The CSV could not be uploaded.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleStarted = async (run) => {
    setDialogOpen(false);
    setNotice(run?.run_id ? `Backtest started · ${shortId(run.run_id)}` : "Backtest started.");
    window.setTimeout(() => setNotice(""), 4500);
    await refreshRuns();
  };

  if (!isLoaded) {
    return <main className="dash-auth-loading"><span className="dash-spinner" aria-hidden="true" /><span>Loading your workspace…</span></main>;
  }
  if (!isSignedIn) return <Navigate to="/" replace />;

  const givenName = user?.firstName || user?.username || "there";

  return (
    <div className="dashboard-shell">
      <aside className="dash-sidebar" aria-label="Workspace navigation">
        <Link className="dash-brand" to="/dashboard" aria-label="Chronos dashboard home"><span className="dash-brand-mark" aria-hidden="true">C</span><span>CHRONOS<span className="dash-brand-caption">RESEARCH WORKSPACE</span></span></Link>
        <div className="dash-workspace-label">WORKSPACE</div>
        <nav className="dash-nav">
          <Link className="dash-nav-item is-active" to="/dashboard" aria-current="page"><Icon name="grid" /><span>Overview</span></Link>
          <a className="dash-nav-item" href={`${API}/#/market`}><Icon name="chart" /><span>Simulation</span><Icon name="arrow" size={14} /></a>
          <a className="dash-nav-item" href={`${API}/#/strategies`}><Icon name="layers" /><span>Strategies</span><Icon name="arrow" size={14} /></a>
          <a className="dash-nav-item" href="#datasets"><Icon name="database" /><span>Datasets</span></a>
        </nav>
        <div className="dash-sidebar-bottom">
          <div className="dash-help-card"><span className="dash-help-kicker">NEXT STEP</span><strong>Test a strategy in a living market.</strong><a href={`${API}/#/strategies`}>Open strategy editor <Icon name="arrow" size={14} /></a></div>
          <div className="dash-sidebar-user"><span className="dash-avatar" aria-hidden="true">{givenName.charAt(0).toUpperCase()}</span><div><strong>{user?.fullName || givenName}</strong><span>Personal workspace</span></div></div>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar">
          <div className="dash-breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>Overview</strong></div>
          <div className="dash-top-actions"><span className="dash-engine-pill"><i aria-hidden="true" /> CHRONOS ENGINE</span><UserButton /></div>
        </header>

        <div className="dash-content">
          <section className="dash-welcome">
            <div><span className="dash-eyebrow">YOUR RESEARCH DESK</span><h1>Welcome back, {givenName}.</h1><p>Review recent runs, manage your strategies, and pick up where your research left off.</p></div>
            <button className="dash-button dash-button-primary" type="button" onClick={() => setDialogOpen(true)}><Icon name="plus" /> New backtest</button>
          </section>

          {notice && <div className="dash-notice" role="status">{notice}</div>}

          <section className="dash-metrics" aria-label="Workspace summary">
            <MetricCard label="Recent runs" value={runsLoading || runsError ? "—" : normalizedRuns.length} note="Saved simulation sessions" tone="accent" />
            <MetricCard label="Saved strategies" value={scriptsLoading || scriptsError ? "—" : normalizedScripts.length} note="In your strategy library" tone="violet" />
            <MetricCard label="Strategy trades" value={resultsLoading || resultsError ? "—" : totalTrades.toLocaleString()} note="Across tracked strategies" tone="blue" />
            <MetricCard label="Latest strategy P&L" value={resultsLoading || resultsError || latestPnl === null ? "—" : formatCurrency(latestPnl)} note={latestPnl === null ? "No strategy results yet" : "Most recently started strategy"} tone={latestPnl === null || latestPnl >= 0 ? "positive" : "negative"} />
          </section>

          <section className="dash-panel dash-runs-panel" aria-labelledby="recent-runs-title">
            <SectionHeading eyebrow="SIMULATION HISTORY" title="Recent runs" id="recent-runs-title" action={<button className="dash-icon-button" type="button" onClick={refreshAll} aria-label="Refresh dashboard data" title="Refresh"><Icon name="refresh" /></button>} />
            {runsLoading ? <LoadingRows /> : runsError ? <ErrorState message={runsError.message} onRetry={refreshRuns} /> : recentRuns.length === 0 ? (
              <EmptyState title="Your first run starts here" detail="Start a simulation or replay a CSV to see run history and results in this workspace." action={<button className="dash-link-button" type="button" onClick={() => setDialogOpen(true)}>Create a backtest <Icon name="arrow" size={14} /></button>} />
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead><tr><th scope="col">Run</th><th scope="col">Status</th><th scope="col">Symbol</th><th scope="col">Mode</th><th scope="col">Seed</th><th scope="col">Started</th></tr></thead>
                  <tbody>{recentRuns.map((run) => <tr key={run.run_id}>
                    <td><span className="dash-run-id"><Icon name="clock" size={15} />{shortId(run.run_id)}</span></td>
                    <td><span className="dash-status is-recorded"><i aria-hidden="true" />Recorded</span></td>
                    <td className="dash-symbol">{run.symbol || "—"}</td>
                    <td><span className={`dash-mode ${String(run.mode || "").toLowerCase()}`}>{run.mode || "Simulation"}</span></td>
                    <td className="dash-mono">{run.seed ?? "—"}</td>
                    <td className="dash-date">{formatDate(run.started_at)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            )}
            {!runsLoading && !runsError && recentRuns.length > 0 && <div className="dash-panel-footer"><span>Showing {recentRuns.length} of {normalizedRuns.length} recent sessions</span><a href={`${API}/#/runs`}>View run explorer <Icon name="arrow" size={14} /></a></div>}
          </section>

          <div className="dash-lower-grid">
            <section className="dash-panel" aria-labelledby="strategies-title">
              <SectionHeading eyebrow="YOUR TOOLKIT" title="Saved strategies" id="strategies-title" action={<a className="dash-inline-link" href={`${API}/#/strategies`}>Manage <Icon name="arrow" size={14} /></a>} />
              {scriptsLoading ? <LoadingRows count={2} /> : scriptsError ? <ErrorState message={scriptsError.message} onRetry={refreshScripts} /> : recentScripts.length === 0 ? (
                <EmptyState title="No strategies saved yet" detail="Create a strategy in the editor and save it to your library." action={<a className="dash-link-button" href={`${API}/#/strategies`}>Open strategy editor <Icon name="arrow" size={14} /></a>} />
              ) : <div className="dash-asset-list">{recentScripts.map((script) => {
                const active = runningByScript.get(script.script_id);
                return <div className="dash-asset-row" key={script.script_id}>
                  <span className="dash-asset-icon"><Icon name="layers" size={17} /></span>
                  <span className="dash-asset-copy"><strong>{script.name}</strong><small>{script.language || "Python"} · Updated {formatDate(script.updated_at || script.saved_at)}</small></span>
                  <span className={`dash-status ${active?.status === "running" ? "is-live" : "is-saved"}`}><i aria-hidden="true" />{active?.status === "running" ? "Running" : "Saved"}</span>
                </div>;
              })}</div>}
            </section>

            <section className="dash-panel" id="datasets" aria-labelledby="datasets-title">
              <SectionHeading eyebrow="REPLAY DATA" title="Your datasets" id="datasets-title" action={<label className={`dash-button dash-button-small ${uploading ? "is-disabled" : ""}`}>
                <input className="dash-visually-hidden" type="file" accept=".csv,text/csv" aria-label="Upload a replay CSV" disabled={uploading} onChange={handleUpload} />
                <Icon name="upload" size={15} />{uploading ? "Uploading…" : "Upload CSV"}
              </label>} />
              {uploadError && <div className="dash-inline-error" role="alert">{uploadError}</div>}
              {datasets.length === 0 ? <EmptyState title="No datasets imported in this session" detail="Upload a validated OHLCV CSV to make it available for a historical replay." /> : (
                <>
                  <div className="dash-asset-list">{datasets.slice(0, 4).map((dataset) => <div className="dash-asset-row" key={dataset.file_id}>
                    <span className="dash-asset-icon csv"><Icon name="database" size={17} /></span>
                    <span className="dash-asset-copy"><strong title={dataset.filename}>{dataset.filename}</strong><small>{Number(dataset.bars || 0).toLocaleString()} bars · {(Number(dataset.size_bytes || 0) / 1024).toFixed(1)} KB</small></span>
                    <span className="dash-status is-saved"><i aria-hidden="true" />Ready</span>
                  </div>)}</div>
                  <p className="dash-dataset-note">Imported in this session · upload records are stored by the Chronos replay service.</p>
                </>
              )}
            </section>
          </div>

          <section className="dash-results-strip" aria-label="Strategy result highlights">
            <div className="dash-results-copy"><span className="dash-eyebrow">PERFORMANCE</span><strong>Strategy results</strong><span>Live results tracked from the market tape.</span></div>
            {resultsLoading ? <LoadingRows count={2} /> : resultsError ? <ErrorState message={resultsError.message} onRetry={refreshResults} /> : normalizedResults.length === 0 ? (
              <div className="dash-results-empty">No tracked strategy results yet. Save and run a strategy to see trade counts and P&L here.</div>
            ) : <div className="dash-result-list">{orderedResults.slice(0, 3).map((item) => <div className="dash-result-row" key={item.strategy_id}>
              <span className={`dash-status ${item.status === "running" ? "is-live" : "is-saved"}`}><i aria-hidden="true" />{item.status || "Tracked"}</span>
              <strong>{item.name}</strong><span className="dash-result-trades">{Number(item.total_trades || 0).toLocaleString()} trades</span>
              <b className={Number(item.total_pnl) >= 0 ? "is-positive" : "is-negative"}>{formatCurrency(item.total_pnl)}</b>
            </div>)}</div>}
          </section>

          <footer className="dash-footer"><span>Chronos · Reactive market research</span><span>Data shown is returned by your connected Chronos engine.</span></footer>
        </div>
      </main>

      {dialogOpen && <NewBacktestDialog datasets={datasets} getToken={getToken} onClose={() => setDialogOpen(false)} onStarted={handleStarted} />}
    </div>
  );
}

export default Dashboard;
