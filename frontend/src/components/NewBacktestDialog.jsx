import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api.js";

export default function NewBacktestDialog({ datasets, getToken, onClose, onStarted }) {
  const dialogRef = useRef(null);
  const [mode, setMode] = useState("simulation");
  const [symbol, setSymbol] = useState("");
  const [price, setPrice] = useState("");
  const [seed, setSeed] = useState("");
  const [datasetId, setDatasetId] = useState(datasets[0]?.file_id || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body = mode === "simulation"
        ? { symbol: symbol.trim(), price: Number(price), ...(seed ? { seed: Number(seed) } : {}) }
        : { csv_path: datasets.find((item) => item.file_id === datasetId)?.csv_path, ...(symbol.trim() ? { symbol: symbol.trim() } : {}), ...(seed ? { seed: Number(seed) } : {}) };
      if (mode === "replay" && !body.csv_path) throw new Error("Upload a CSV dataset before starting a replay.");
      const result = await apiFetch(getToken, mode === "simulation" ? "/api/sim/start" : "/api/replay/start", { method: "POST", body: JSON.stringify(body) });
      await onStarted(result);
    } catch (submitError) {
      setError(submitError.message || "The backtest could not be started.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog className="backtest-dialog" ref={dialogRef} aria-labelledby="backtest-dialog-title" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <form className="backtest-form" onSubmit={submit}>
        <div className="backtest-dialog-head">
          <div><span className="backtest-kicker">CHRONOS SIMULATION</span><h2 id="backtest-dialog-title">New backtest</h2><p>Choose a market and configure how the run starts.</p></div>
          <button className="backtest-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close dialog">×</button>
        </div>

        <fieldset className="backtest-mode-picker">
          <legend>Backtest type</legend>
          <label className={mode === "simulation" ? "selected" : ""}><input type="radio" name="backtest-mode" value="simulation" checked={mode === "simulation"} onChange={() => setMode("simulation")} /><span><strong>Simulation</strong><small>Start a fresh synthetic market</small></span></label>
          <label className={mode === "replay" ? "selected" : ""}><input type="radio" name="backtest-mode" value="replay" checked={mode === "replay"} onChange={() => setMode("replay")} /><span><strong>Historical replay</strong><small>Replay an imported OHLCV dataset</small></span></label>
        </fieldset>

        {mode === "simulation" ? <div className="backtest-fields">
          <label className="backtest-field">Symbol<input required value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="e.g. TCS" autoComplete="off" /></label>
          <label className="backtest-field">Starting price<input required type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Enter starting price" /></label>
        </div> : <label className="backtest-field">Dataset
          <select value={datasetId} onChange={(event) => setDatasetId(event.target.value)} required disabled={datasets.length === 0}>
            <option value="">{datasets.length ? "Select a dataset" : "Upload a CSV from the dashboard first"}</option>
            {datasets.map((dataset) => <option key={dataset.file_id} value={dataset.file_id}>{dataset.filename} · {Number(dataset.bars || 0).toLocaleString()} bars</option>)}
          </select>
        </label>}

        <label className="backtest-field">Seed <span className="backtest-optional">Optional · for repeatable runs</span><input type="number" min="0" step="1" value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="Leave blank for automatic" /></label>
        {error && <div className="backtest-error" role="alert">{error}</div>}
        <div className="backtest-actions"><button className="backtest-cancel" type="button" onClick={() => dialogRef.current?.close()}>Cancel</button><button className="backtest-submit" type="submit" disabled={submitting || (mode === "replay" && datasets.length === 0)}>{submitting ? "Starting…" : "Start backtest"}</button></div>
      </form>
    </dialog>
  );
}
