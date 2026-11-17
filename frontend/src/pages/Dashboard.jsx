import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { UserButton, useAuth, useUser } from "@clerk/react";
import { API, apiFetch } from "../lib/api.js";

export default function Dashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [out, setOut] = useState("");

  useEffect(() => {
    if (!isSignedIn) return;
    apiFetch(getToken, "/api/me").then(setMe).catch((e) => setErr(e.message));
  }, [isSignedIn, getToken]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/" replace />;

  const call = async (path, body) => {
    try {
      const r = await apiFetch(getToken, path, { method: "POST", body: JSON.stringify(body ?? {}) });
      setOut(JSON.stringify(r, null, 2));
    } catch (e) {
      setOut(e.message);
    }
  };

  return (
    <>
      <header><div className="wrap"><nav>
        <Link className="logo" to="/"><i />Chronos</Link>
        <span style={{ marginLeft: "auto" }} />
        <UserButton />
      </nav></div></header>

      <main className="wrap dash">
        <h1 style={{ fontSize: 36 }}>Welcome{user?.firstName ? `, ${user.firstName}` : ""}.</h1>
        <div className="grid g2">
          <div className="card">
            <span className="tag">BACKEND</span>
            <h3>{me ? "Connected" : err ? "Not connected" : "Connecting…"}</h3>
            <p>{me ? `Verified as ${me.user_id}` : err || `Calling ${API}/api/me`}</p>
          </div>
          <div className="card">
            <span className="tag">SIMULATION</span>
            <h3>Control the market</h3>
            <p style={{ marginBottom: 14 }}>Sends your Clerk token with every request.</p>
            <div className="cta">
              {/* Body must match swarm_orchestrator/PROTOCOL.md */}
              <button className="btn p" disabled={!me} onClick={() => call("/api/sim/start", { symbol: "CHRONOS-X", price: 184.2 })}>Start</button>
              <button className="btn" disabled={!me} onClick={() => call("/api/sim/stop")}>Stop</button>
              <a className="btn" href={API} target="_blank" rel="noopener noreferrer">Open terminal</a>
            </div>
          </div>
        </div>
        {out && <pre style={{ marginTop: 16 }}>{out}</pre>}
      </main>
    </>
  );
}
