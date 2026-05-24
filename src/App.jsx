import { useState, useEffect, useRef } from "react";

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", color: "#010101", accent: "#FE2C55", icon: "♪", maxCap: 2200, ratePerK: 0.03 },
  { id: "instagram", name: "Instagram", color: "#833AB4", accent: "#FD1D1D", icon: "◈", maxCap: 2200, ratePerK: 0.05 },
  { id: "youtube", name: "YouTube", color: "#FF0000", accent: "#FF0000", icon: "▶", maxCap: 5000, ratePerK: 0.18 },
  { id: "facebook", name: "Facebook", color: "#1877F2", accent: "#1877F2", icon: "f", maxCap: 63206, ratePerK: 0.02 },
  { id: "twitter", name: "X (Twitter)", color: "#000000", accent: "#1DA1F2", icon: "𝕏", maxCap: 280, ratePerK: 0.01 },
  { id: "snapchat", name: "Snapchat", color: "#FFFC00", accent: "#FFFC00", icon: "👻", maxCap: 1000, ratePerK: 0.02 },
];

const INIT_STATS = () => PLATFORMS.reduce((acc, p) => {
  acc[p.id] = { views: 0, likes: 0, comments: 0, shares: 0, earnings: 0, posted: false, posting: false };
  return acc;
}, {});

const fmt = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toString();
const fmtMoney = (n) => "$" + n.toFixed(2);

export default function App() {
  const [page, setPage] = useState("upload");
  const [video, setVideo] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selected, setSelected] = useState({ tiktok: true, instagram: true, youtube: true, facebook: false, twitter: false, snapchat: false });
  const [stats, setStats] = useState(INIT_STATS());
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [totalViews, setTotalViews] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [captions, setCaptions] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const intervalRef = useRef(null);
  const fileRef = useRef(null);
  const notifId = useRef(0);

  const addNotif = (msg, type = "info") => {
    const id = notifId.current++;
    setNotifications(n => [...n.slice(-4), { id, msg, type }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 4000);
  };

  const handleFile = (file) => {
    if (!file) return;
    setVideo(file);
    setVideoURL(URL.createObjectURL(file));
    addNotif(`Video loaded: ${file.name}`, "success");
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) handleFile(f);
  };

  const generateCaptions = () => {
    const base = caption.trim();
    const tags = hashtags.trim();
    const caps = {};
    PLATFORMS.forEach(p => {
      const limit = p.maxCap;
      let c = base;
      if (tags) c += "\n\n" + tags;
      if (c.length > limit) c = c.substring(0, limit - 3) + "...";
      caps[p.id] = c;
    });
    setCaptions(caps);
    return caps;
  };

  const postAll = async () => {
    if (!video) return addNotif("Please upload a video first", "error");
    if (!caption.trim()) return addNotif("Please add a caption", "error");
    const activePlatforms = PLATFORMS.filter(p => selected[p.id]);
    if (!activePlatforms.length) return addNotif("Select at least one platform", "error");

    const caps = generateCaptions();
    setPosting(true);
    setPage("analytics");

    for (const p of activePlatforms) {
      setStats(s => ({ ...s, [p.id]: { ...s[p.id], posting: true } }));
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      setStats(s => ({ ...s, [p.id]: { ...s[p.id], posting: false, posted: true } }));
      addNotif(`Posted to ${p.name}!`, "success");
    }

    setPosting(false);
    setPosted(true);
    setLiveMode(true);
    addNotif("All platforms live! Tracking views...", "success");
  };

  useEffect(() => {
    if (!liveMode) return;
    intervalRef.current = setInterval(() => {
      setStats(prev => {
        const next = { ...prev };
        let tv = 0; let te = 0;
        PLATFORMS.forEach(p => {
          if (!next[p.id].posted) return;
          const bump = Math.floor(Math.random() * 120 * (p.id === "tiktok" ? 3 : p.id === "youtube" ? 2 : 1));
          const newViews = next[p.id].views + bump;
          const newLikes = next[p.id].likes + Math.floor(bump * (0.05 + Math.random() * 0.1));
          const newComments = next[p.id].comments + (Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0);
          const newShares = next[p.id].shares + (Math.random() > 0.8 ? Math.floor(Math.random() * 2) : 0);
          const earn = (newViews / 1000) * p.ratePerK;
          next[p.id] = { ...next[p.id], views: newViews, likes: newLikes, comments: newComments, shares: newShares, earnings: earn };
          tv += newViews; te += earn;

          if (newViews > 0 && newViews % 10000 < bump && newViews > 1000) {
            addNotif(`${p.name} hit ${fmt(newViews)} views!`, "milestone");
          }
        });
        setTotalViews(tv);
        setTotalEarnings(te);
        return next;
      });
    }, 1500);
    return () => clearInterval(intervalRef.current);
  }, [liveMode]);

  const resetAll = () => {
    clearInterval(intervalRef.current);
    setVideo(null); setVideoURL(null); setCaption(""); setHashtags("");
    setStats(INIT_STATS()); setPosting(false); setPosted(false);
    setLiveMode(false); setTotalViews(0); setTotalEarnings(0);
    setNotifications([]); setCaptions({}); setPage("upload");
    setSelected({ tiktok: true, instagram: true, youtube: true, facebook: false, twitter: false, snapchat: false });
  };

  const activePlatformStats = PLATFORMS.filter(p => stats[p.id].posted || selected[p.id]);

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#0a0a0f", minHeight: "100vh", color: "#e8e4d9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #333; }
        .btn-primary { background: #e8e4d9; color: #0a0a0f; border: none; padding: 12px 28px; font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; cursor: pointer; letter-spacing: 0.05em; transition: all 0.15s; }
        .btn-primary:hover { background: #fff; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
        .btn-ghost { background: transparent; color: #e8e4d9; border: 1px solid #333; padding: 10px 20px; font-family: 'DM Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #666; background: #111; }
        .platform-toggle { border: 1px solid #222; padding: 12px 16px; cursor: pointer; transition: all 0.2s; background: #111; }
        .platform-toggle.on { border-color: #e8e4d9; background: #1a1a1a; }
        .platform-toggle:hover { border-color: #444; }
        .stat-card { background: #111; border: 1px solid #1e1e1e; padding: 16px; }
        .notif { position: fixed; bottom: 20px; right: 20px; z-index: 999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
        .notif-item { background: #1a1a1a; border: 1px solid #333; padding: 10px 16px; font-size: 12px; animation: slideIn 0.2s ease; max-width: 260px; }
        .notif-item.success { border-color: #22c55e; color: #22c55e; }
        .notif-item.error { border-color: #ef4444; color: #ef4444; }
        .notif-item.milestone { border-color: #f59e0b; color: #f59e0b; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .tab { background: none; border: none; color: #666; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; padding: 8px 16px; border-bottom: 1px solid transparent; letter-spacing: 0.08em; text-transform: uppercase; }
        .tab.active { color: #e8e4d9; border-bottom-color: #e8e4d9; }
        textarea, input[type=text] { background: #111; border: 1px solid #222; color: #e8e4d9; font-family: 'DM Mono', monospace; font-size: 13px; padding: 12px; width: 100%; outline: none; resize: vertical; }
        textarea:focus, input[type=text]:focus { border-color: #444; }
        .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block; animation: pulse 1s infinite; }
        .nav-item { background: none; border: none; color: #444; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; padding: 10px 20px; letter-spacing: 0.1em; text-transform: uppercase; transition: color 0.15s; }
        .nav-item.active { color: #e8e4d9; }
        .nav-item:hover { color: #888; }
        .bar-wrap { background: #1a1a1a; height: 4px; width: 100%; margin-top: 8px; }
        .bar-fill { height: 4px; transition: width 1s ease; }
        .posting-anim { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "16px 0" }}>
          <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em" }}>VAULTPOST</span>
          <span style={{ fontSize: 10, color: "#444", letterSpacing: "0.15em" }}>MULTI-PLATFORM</span>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          <button className={`nav-item ${page === "upload" ? "active" : ""}`} onClick={() => setPage("upload")}>Upload</button>
          <button className={`nav-item ${page === "platforms" ? "active" : ""}`} onClick={() => setPage("platforms")}>Platforms</button>
          <button className={`nav-item ${page === "analytics" ? "active" : ""}`} onClick={() => setPage("analytics")}>Analytics</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {liveMode && <><span className="live-dot"></span><span style={{ fontSize: 11, color: "#22c55e", letterSpacing: "0.1em" }}>LIVE</span></>}
          {posted && <button className="btn-ghost" style={{ fontSize: 11 }} onClick={resetAll}>New Post</button>}
        </div>
      </div>

      {/* UPLOAD PAGE */}
      {page === "upload" && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 32px" }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>
              One upload.<br />Every platform.
            </h1>
            <p style={{ color: "#555", fontSize: 13 }}>Post your video to all connected accounts simultaneously.</p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            style={{
              border: `1px dashed ${dragOver ? "#e8e4d9" : "#2a2a2a"}`,
              padding: "48px 32px", textAlign: "center", cursor: "pointer",
              background: dragOver ? "#141414" : "#0d0d0d",
              transition: "all 0.2s", marginBottom: 24
            }}
          >
            <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            {videoURL ? (
              <div>
                <video src={videoURL} style={{ maxHeight: 180, maxWidth: "100%", marginBottom: 12 }} controls />
                <p style={{ color: "#22c55e", fontSize: 12 }}>{video?.name}</p>
                <p style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Click to replace</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⬆</div>
                <p style={{ fontSize: 13, color: "#666" }}>Drop video here or click to browse</p>
                <p style={{ fontSize: 11, color: "#333", marginTop: 8 }}>MP4, MOV, AVI — up to 4GB</p>
              </div>
            )}
          </div>

          {/* Caption */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Caption</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
              placeholder="Write your caption here — we'll adapt it for each platform's character limits automatically..." />
            <div style={{ textAlign: "right", fontSize: 11, color: "#333", marginTop: 4 }}>{caption.length} characters</div>
          </div>

          {/* Hashtags */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Hashtags</label>
            <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)}
              placeholder="#ancientegypt #aiVideo #historyvlog #satisfying" />
          </div>

          {/* Platform quick-select */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>Post to</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PLATFORMS.map(p => (
                <button key={p.id}
                  className={`platform-toggle ${selected[p.id] ? "on" : ""}`}
                  onClick={() => setSelected(s => ({ ...s, [p.id]: !s[p.id] }))}
                  style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}
                >
                  <span style={{ fontSize: 14, color: selected[p.id] ? p.accent : "#333" }}>{p.icon}</span>
                  <span style={{ fontSize: 12, color: selected[p.id] ? "#e8e4d9" : "#555" }}>{p.name}</span>
                  {selected[p.id] && <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 10 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-primary" disabled={!video || !caption.trim() || posting}
              onClick={postAll} style={{ flex: 1, fontSize: 14 }}>
              {posting ? "Posting..." : `Post to ${Object.values(selected).filter(Boolean).length} Platform${Object.values(selected).filter(Boolean).length !== 1 ? "s" : ""} →`}
            </button>
            <button className="btn-ghost" onClick={() => setPage("platforms")}>Manage Accounts</button>
          </div>
        </div>
      )}

      {/* PLATFORMS PAGE */}
      {page === "platforms" && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 32px" }}>
          <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Connected Accounts</h2>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 32 }}>Connect multiple accounts per platform to bulk-post across all of them.</p>

          {PLATFORMS.map(p => (
            <div key={p.id} style={{ borderBottom: "1px solid #1a1a1a", padding: "20px 0", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: p.accent }}>
                {p.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#555" }}>
                  {p.id === "youtube" ? "Revenue: ~$" + p.ratePerK + " per 1K views" : "Est. ~$" + p.ratePerK + " per 1K views"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }}></div>
                <span style={{ fontSize: 11, color: "#22c55e" }}>Connected</span>
              </div>
              <button className="btn-ghost" style={{ fontSize: 11 }}>+ Add Account</button>
            </div>
          ))}

          <div style={{ marginTop: 32, padding: "20px", background: "#111", border: "1px solid #1e1e1e" }}>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>API Status</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {["TikTok API", "Meta Graph API", "YouTube Data API", "Twitter API v2", "Snap Kit", "Analytics Engine"].map(api => (
                <div key={api} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}></div>
                  <span style={{ fontSize: 11, color: "#555" }}>{api}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS PAGE */}
      {page === "analytics" && (
        <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>

          {/* Total row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[
              { label: "Total Views", value: fmt(totalViews), color: "#e8e4d9" },
              { label: "Est. Earnings", value: fmtMoney(totalEarnings), color: "#22c55e" },
              { label: "Platforms Live", value: PLATFORMS.filter(p => stats[p.id].posted).length + "/" + PLATFORMS.filter(p => selected[p.id]).length, color: "#f59e0b" },
              { label: "Total Engagement", value: fmt(PLATFORMS.reduce((s, p) => s + stats[p.id].likes + stats[p.id].comments + stats[p.id].shares, 0)), color: "#a78bfa" },
            ].map(m => (
              <div key={m.label} className="stat-card">
                <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{m.label}</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 24, fontWeight: 700, color: m.color }}>
                  {liveMode ? m.value : "—"}
                </div>
                {liveMode && <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>updating live</div>}
              </div>
            ))}
          </div>

          {/* Tab filter */}
          <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", marginBottom: 24 }}>
            <button className={`tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>All Platforms</button>
            {PLATFORMS.filter(p => selected[p.id] || stats[p.id].posted).map(p => (
              <button key={p.id} className={`tab ${activeTab === p.id ? "active" : ""}`} onClick={() => setActiveTab(p.id)}>{p.name}</button>
            ))}
          </div>

          {/* Platform cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {PLATFORMS.filter(p => (activeTab === "all" ? selected[p.id] || stats[p.id].posted : p.id === activeTab)).map(p => {
              const s = stats[p.id];
              const maxViews = Math.max(...PLATFORMS.map(pl => stats[pl.id].views), 1);
              const pct = Math.min((s.views / maxViews) * 100, 100);
              return (
                <div key={p.id} className="stat-card posting-anim" style={{ borderColor: s.posted ? "#1e1e1e" : "#111" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20, color: p.accent }}>{p.icon}</span>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</span>
                    </div>
                    <div>
                      {s.posting && <span style={{ fontSize: 11, color: "#f59e0b" }} className="pulse">Posting...</span>}
                      {s.posted && liveMode && <><span className="live-dot" style={{ marginRight: 6 }}></span><span style={{ fontSize: 11, color: "#22c55e" }}>Live</span></>}
                      {!s.posted && !s.posting && <span style={{ fontSize: 11, color: "#333" }}>Pending</span>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {[
                      { label: "Views", val: fmt(s.views) },
                      { label: "Likes", val: fmt(s.likes) },
                      { label: "Comments", val: fmt(s.comments) },
                      { label: "Shares", val: fmt(s.shares) },
                    ].map(m => (
                      <div key={m.label} style={{ background: "#0d0d0d", padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 700 }}>{s.posted ? m.val : "—"}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#555" }}>Est. earnings</span>
                      <span style={{ fontSize: 13, color: "#22c55e", fontFamily: "'Unbounded', sans-serif", fontWeight: 700 }}>{s.posted ? fmtMoney(s.earnings) : "—"}</span>
                    </div>
                    <div className="bar-wrap">
                      <div className="bar-fill" style={{ width: s.posted ? pct + "%" : "0%", background: p.accent }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>${p.ratePerK} per 1K views · {p.name}</div>
                  </div>

                  {captions[p.id] && (
                    <div style={{ marginTop: 12, padding: "8px 10px", background: "#0d0d0d", fontSize: 11, color: "#555", lineHeight: 1.5 }}>
                      <div style={{ color: "#333", marginBottom: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Caption</div>
                      {captions[p.id].substring(0, 120)}{captions[p.id].length > 120 ? "..." : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!posted && !posting && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>◈</div>
              <p style={{ fontSize: 13 }}>No data yet. Upload and post a video to see analytics.</p>
              <button className="btn-ghost" style={{ marginTop: 20 }} onClick={() => setPage("upload")}>Go to Upload →</button>
            </div>
          )}

          {posted && (
            <div style={{ marginTop: 24, padding: "16px 20px", background: "#111", border: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Video posted to {PLATFORMS.filter(p => stats[p.id].posted).length} platform{PLATFORMS.filter(p => stats[p.id].posted).length !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{video?.name}</div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => setLiveMode(l => !l)}>
                  {liveMode ? "Pause Updates" : "Resume Updates"}
                </button>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={resetAll}>New Post</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      <div className="notif">
        {notifications.map(n => (
          <div key={n.id} className={`notif-item ${n.type}`}>{n.msg}</div>
        ))}
      </div>
    </div>
  );
}
