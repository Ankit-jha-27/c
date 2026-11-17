import { useEffect, useRef, useState } from "react";

const T = 0.05, N = 6, QTY = 3000;
const sz = () => Math.round((300 + Math.random() * 1200) / 100) * 100;
const f = (n) => n.toFixed(2);
const seed = (px) => ({
  asks: Array.from({ length: N }, (_, i) => ({ p: px + T * (i + 1), s: sz() })),
  bids: Array.from({ length: N }, (_, i) => ({ p: px - T * (i + 1), s: sz() })),
});

function Side({ rows, cls }) {
  return rows.map((r) => (
    <div className={`row ${cls}`} key={r.p.toFixed(2)}>
      <span>{f(r.p)}</span>
      <span>{r.s.toLocaleString()}</span>
      <s style={{ width: `${Math.min(100, (r.s / 1600) * 100)}%` }} />
    </div>
  ));
}

export default function OrderBook() {
  const open = useRef(184.2);
  const busy = useRef(false);
  const [px, setPx] = useState(184.2);
  const [book, setBook] = useState(() => seed(184.2));
  const [hist, setHist] = useState([184.2]);
  const [log, setLog] = useState("Try it — send an order and watch the price move.");
  const live = useRef({ px, book });
  live.current = { px, book };

  const push = (p, b) => {
    setPx(p);
    setBook(b);
    setHist((h) => [...h, p].slice(-60));
  };

  // idle drift
  useEffect(() => {
    const id = setInterval(() => {
      if (busy.current) return;
      let { px: p, book: b } = live.current;
      b = { asks: b.asks.map((x) => ({ ...x })), bids: b.bids.map((x) => ({ ...x })) };
      [b.asks, b.bids].forEach((s) => (s[Math.floor(Math.random() * s.length)].s = sz()));
      if (Math.random() < 0.3) {
        p += Math.random() < 0.5 ? -T : T;
        b = seed(p);
      }
      push(p, b);
    }, 900);
    return () => clearInterval(id);
  }, []);

  const hit = (buy) => {
    if (busy.current) return;
    busy.current = true;
    let { px: p, book: b } = live.current;
    const list = (buy ? b.asks : b.bids).map((x) => ({ ...x }));
    let rem = QTY, cost = 0;
    while (rem > 0 && list.length) {
      const l = list[0], t = Math.min(rem, l.s);
      l.s -= t; rem -= t; cost += t * l.p; p = l.p;
      if (l.s <= 0) list.shift(); else break;
    }
    const filled = QTY - rem;
    push(p, buy ? { ...b, asks: list } : { ...b, bids: list });
    setLog(`${buy ? "BUY" : "SELL"} ${filled.toLocaleString()} filled, avg ${f(filled ? cost / filled : p)}, last price ${f(p)}. Agents are re-quoting…`);
    setTimeout(() => {
      push(p, seed(p));
      setLog(`Book re-quoted around ${f(p)}. The market reacted to you.`);
      busy.current = false;
    }, 1100);
  };

  const d = px - open.current;
  const lo = Math.min(...hist), hi = Math.max(...hist), r = hi - lo || 1;
  const pts = hist.map((v, i) => `${((i / 59) * 300).toFixed(1)},${(52 - ((v - lo) / r) * 48).toFixed(1)}`).join(" ");
  const spread = (book.asks[0]?.p ?? px + T) - (book.bids[0]?.p ?? px - T);

  return (
    <div className="term" aria-label="Live order book demo">
      <div className="th"><b>CHRONOS-X · LIVE BOOK</b><span>simulated</span></div>
      <div className="px"><span>{f(px)}</span><small className={d >= 0 ? "b" : "a"}>{d >= 0 ? "+" : ""}{f(d)}</small></div>
      <svg id="spark" viewBox="0 0 300 56" preserveAspectRatio="none" aria-hidden="true">
        <polyline fill="none" stroke="var(--acc)" strokeWidth="1.8" points={pts} />
      </svg>
      <div className="book">
        <div><Side rows={[...book.asks].reverse()} cls="a" /></div>
        <div className="mid"><span>SPREAD {f(spread)}</span><span>PRICE · SIZE</span></div>
        <div><Side rows={book.bids} cls="b" /></div>
      </div>
      <div className="acts">
        <button className="buy" onClick={() => hit(true)}>MARKET BUY 3,000</button>
        <button className="sell" onClick={() => hit(false)}>MARKET SELL 3,000</button>
      </div>
      <div id="log">{log}</div>
    </div>
  );
}
