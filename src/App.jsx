import { useState, useEffect, useRef } from "react";

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", color: "#010101", accent: "#FE2C55", icon: "♪", maxCap: 2200, ratePerK: 0.03 },
  { id: "instagram", name: "Instagram", color: "#833AB4", accent: "#FD1D1D", icon: "◈", maxCap: 2200, ratePerK: 0.05 },
  { id: "youtube", name: "YouTube", color: "#FF0000", accent: "#FF0000", icon: "▶", maxCap: 5000, ratePerK: 0.18 },
  { id: "facebook", name: "Facebook", color: "#1877F2", accent: "#1877F2", icon: "f", maxCap: 63206, ratePerK: 0.02 },
  { id: "twitter", name: "X (Twitter)", color: "#000000", accent: "#1DA1F2", icon: "𝕏", maxCap: 280, ratePerK: 0.01 },
  { id: "snapchat", name: "Snapchat", color: "#FFFC00", accent: "#FFFC00", icon: "👻", maxCap: 1000, ratePerK: 0.02 },
];

const CHANNEL_COLORS = ["#a78bfa", "#22c55e", "#FD1D1D", "#f59e0b", "#1DA1F2", "#FE2C55", "#10b981", "#f97316"];
const CHANNEL_EMOJIS = ["⭐", "🎮", "✨", "🔥", "💡", "🎯", "🎬", "🌟", "💎", "🚀"];

const DEFAULT_CHANNELS = [
  {
    id: "ch_1",
    name: "Main Channel",
    color: "#a78bfa",
    emoji: "⭐",
    accounts: {
      tiktok:    { username: "@mainchannel",    connected: true  },
      instagram: { username: "@mainchannel",    connected: true  },
      youtube:   { username: "Main Channel",    connected: true  },
      facebook:  { username: "Main Channel",    connected: false },
      twitter:   { username: "@mainchannel",    connected: false },
      snapchat:  { username: "@mainchannel",    connected: false },
    }
  },
  {
    id: "ch_2",
    name: "Gaming Hub",
    color: "#22c55e",
    emoji: "🎮",
    accounts: {
      tiktok:    { username: "@gaminghub",  connected: true  },
      instagram: { username: "@gaminghub",  connected: true  },
      youtube:   { username: "Gaming Hub",  connected: true  },
      facebook:  { username: "Gaming Hub",  connected: false },
      twitter:   { username: "@gaminghub", connected: true  },
      snapchat:  { username: "@gaminghub", connected: false },
    }
  },
  {
    id: "ch_3",
    name: "Lifestyle",
    color: "#FD1D1D",
    emoji: "✨",
    accounts: {
      tiktok:    { username: "@lifestyle_tok", connected: true  },
      instagram: { username: "@lifestyle",     connected: true  },
      youtube:   { username: "Lifestyle",      connected: false },
      facebook:  { username: "Lifestyle",      connected: true  },
      twitter:   { username: "",               connected: false },
      snapchat:  { username: "@lifestyle",     connected: true  },
    }
  },
];

const makeEmptyChannel = () => ({
  id: "ch_" + Date.now(),
  name: "New Channel",
  color: CHANNEL_COLORS[Math.floor(Math.random() * CHANNEL_COLORS.length)],
  emoji: "🎬",
  accounts: PLATFORMS.reduce((acc, p) => {
    acc[p.id] = { username: "", connected: false };
    return acc;
  }, {}),
});

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

  const [channels, setChannels] = useState(() => {
    try { const s = localStorage.getItem("vaultpost_channels"); return s ? JSON.parse(s) : DEFAULT_CHANNELS; }
    catch { return DEFAULT_CHANNELS; }
  });
  const [activeChannelId, setActiveChannelId] = useState(() => {
    try { return localStorage.getItem("vaultpost_active_ch") || DEFAULT_CHANNELS[0].id; }
    catch { return DEFAULT_CHANNELS[0].id; }
  });
  const [editChannelId, setEditChannelId] = useState(DEFAULT_CHANNELS[0].id);
  const [selected, setSelected] = useState({});

  const [stats, setStats] = useState(INIT_STATS());
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postedChannel, setPostedChannel] = useState(null);
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

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
  const editChannel = channels.find(c => c.id === editChannelId) || channels[0];

  // Sync platform toggles when active channel changes
  useEffect(() => {
    if (!activeChannel) return;
    const sel = {};
    PLATFORMS.forEach(p => { sel[p.id] = activeChannel.accounts[p.id]?.connected || false; });
    setSelected(sel);
  }, [activeChannelId, channels]);

  // Persist channels
  useEffect(() => { localStorage.setItem("vaultpost_channels", JSON.stringify(channels)); }, [channels]);
  useEffect(() => { localStorage.setItem("vaultpost_active_ch", activeChannelId); }, [activeChannelId]);

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
      let c = base;
      if (tags) c += "\n\n" + tags;
      if (c.length > p.maxCap) c = c.substring(0, p.maxCap - 3) + "...";
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

    generateCaptions();
    setPosting(true);
    setPostedChannel(activeChannel);
    setPage("analytics");

    for (const p of activePlatforms) {
      setStats(s => ({ ...s, [p.id]: { ...s[p.id], posting: true } }));
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      setStats(s => ({ ...s, [p.id]: { ...s[p.id], posting: false, posted: true } }));
      const username = activeChannel?.accounts[p.id]?.username || p.name;
      addNotif(`Posted to ${p.name} as ${username}!`, "success");
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
    setPostedChannel(null); setLiveMode(false); setTotalViews(0); setTotalEarnings(0);
    setNotifications([]); setCaptions({}); setPage("upload"); setActiveTab("all");
  };

  const addChannel = () => {
    const ch = makeEmptyChannel();
    setChannels(c => [...c, ch]);
    setEditChannelId(ch.id);
  };

  const deleteChannel = (id) => {
    if (channels.length <= 1) return addNotif("You must have at least one channel", "error");
    const remaining = channels.filter(ch => ch.id !== id);
    setChannels(remaining);
    if (editChannelId === id) setEditChannelId(remaining[0].id);
    if (activeChannelId === id) setActiveChannelId(remaining[0].id);
  };

  const updateChannel = (id, updates) => {
    setChannels(c => c.map(ch => ch.id === id ? { ...ch, ...updates } : ch));
  };

  const updateAccount = (channelId, platformId, updates) => {
    setChannels(c => c.map(ch => ch.id === channelId ? {
      ...ch,
      accounts: { ...ch.accounts, [platformId]: { ...ch.accounts[platformId], ...updates } }
    } : ch));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#0a0a0f", minHeight: "100vh", color: "#e8e4d9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #333; }
        .btn-primary { background: #e8e4d9; color: #0a0a0f; border: none; padding: 12px 28px; font-family: 'DM Mono',monospace; font-size: 13px; font-weight: 500; cursor: pointer; letter-spacing: 0.05em; transition: all 0.15s; }
        .btn-primary:hover { background: #fff; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
        .btn-ghost { background: transparent; color: #e8e4d9; border: 1px solid #333; padding: 10px 20px; font-family: 'DM Mono',monospace; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #666; background: #111; }
        .btn-danger { background: transparent; color: #ef4444; border: 1px solid #ef444433; padding: 6px 14px; font-family: 'DM Mono',monospace; font-size: 11px; cursor: pointer; transition: all 0.15s; }
        .btn-danger:hover { background: #ef444411; border-color: #ef4444; }
        .platform-toggle { border: 1px solid #222; padding: 12px 14px; cursor: pointer; transition: all 0.2s; background: #111; text-align: left; width: 100%; }
        .platform-toggle.on { border-color: #e8e4d9; background: #1a1a1a; }
        .platform-toggle:hover { border-color: #444; }
        .stat-card { background: #111; border: 1px solid #1e1e1e; padding: 16px; }
        .notif { position: fixed; bottom: 20px; right: 20px; z-index: 999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
        .notif-item { background: #1a1a1a; border: 1px solid #333; padding: 10px 16px; font-size: 12px; animation: slideIn 0.2s ease; max-width: 260px; }
        .notif-item.success { border-color: #22c55e; color: #22c55e; }
        .notif-item.error { border-color: #ef4444; color: #ef4444; }
        .notif-item.milestone { border-color: #f59e0b; color: #f59e0b; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        .tab { background: none; border: none; color: #666; font-family: 'DM Mono',monospace; font-size: 11px; cursor: pointer; padding: 8px 16px; border-bottom: 1px solid transparent; letter-spacing: 0.08em; text-transform: uppercase; }
        .tab.active { color: #e8e4d9; border-bottom-color: #e8e4d9; }
        textarea, input[type=text] { background: #111; border: 1px solid #222; color: #e8e4d9; font-family: 'DM Mono',monospace; font-size: 13px; padding: 12px; width: 100%; outline: none; resize: vertical; }
        textarea:focus, input[type=text]:focus { border-color: #444; }
        input.inline-edit { background: transparent; border: none; border-bottom: 1px solid #2a2a2a; color: #e8e4d9; font-family: 'Unbounded',sans-serif; font-size: 18px; font-weight: 700; padding: 4px 0; outline: none; width: 100%; }
        input.inline-edit:focus { border-bottom-color: #555; }
        input.account-input { background: #0d0d0d; border: 1px solid #1a1a1a; color: #888; font-family: 'DM Mono',monospace; font-size: 12px; padding: 6px 10px; outline: none; width: 100%; }
        input.account-input:focus { border-color: #333; color: #e8e4d9; }
        .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block; animation: pulse 1s infinite; }
        .nav-item { background: none; border: none; color: #444; font-family: 'DM Mono',monospace; font-size: 11px; cursor: pointer; padding: 10px 20px; letter-spacing: 0.1em; text-transform: uppercase; transition: color 0.15s; }
        .nav-item.active { color: #e8e4d9; }
        .nav-item:hover { color: #888; }
        .bar-wrap { background: #1a1a1a; height: 4px; width: 100%; margin-top: 8px; }
        .bar-fill { height: 4px; transition: width 1s ease; }
        .posting-anim { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)} }
        .channel-pill { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 1px solid #1e1e1e; cursor: pointer; transition: all 0.15s; background: #0d0d0d; font-family: 'DM Mono',monospace; }
        .channel-pill:hover { border-color: #333; background: #111; }
        .channel-pill.active { border-color: #555; background: #141414; }
        .ch-sidebar-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; border-left: 2px solid transparent; transition: all 0.15s; }
        .ch-sidebar-item:hover { background: #111; }
        .ch-sidebar-item.active { background: #111; }
        .toggle-wrap { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .toggle-wrap input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #222; border-radius: 20px; transition: 0.2s; }
        .toggle-slider:before { content:""; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: #444; border-radius: 50%; transition: 0.2s; }
        input:checked + .toggle-slider { background: #22c55e22; }
        input:checked + .toggle-slider:before { background: #22c55e; transform: translateX(16px); }
        .emoji-btn { background: #111; border: 1px solid #1e1e1e; padding: 6px 9px; cursor: pointer; font-size: 15px; transition: border-color 0.15s; }
        .emoji-btn:hover { border-color: #444; }
        .emoji-btn.sel { border-color: #666; }
        .color-dot { width: 18px; height: 18px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s; flex-shrink: 0; }
        .color-dot:hover { border-color: #888; }
        .color-dot.sel { border-color: #e8e4d9; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "16px 0" }}>
          <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em" }}>VAULTPOST</span>
          <span style={{ fontSize: 10, color: "#444", letterSpacing: "0.15em" }}>MULTI-PLATFORM</span>
        </div>
        <div style={{ display: "flex" }}>
          <button className={`nav-item ${page === "upload" ? "active" : ""}`} onClick={() => setPage("upload")}>Upload</button>
          <button className={`nav-item ${page === "platforms" ? "active" : ""}`} onClick={() => setPage("platforms")}>Channels</button>
          <button className={`nav-item ${page === "analytics" ? "active" : ""}`} onClick={() => setPage("analytics")}>Analytics</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {liveMode && <><span className="live-dot"></span><span style={{ fontSize: 11, color: "#22c55e", letterSpacing: "0.1em" }}>LIVE</span></>}
          {posted && <button className="btn-ghost" style={{ fontSize: 11 }} onClick={resetAll}>New Post</button>}
        </div>
      </div>

      {/* ── UPLOAD PAGE ── */}
      {page === "upload" && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 32px" }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>
              One upload.<br />Every platform.
            </h1>
            <p style={{ color: "#555", fontSize: 13 }}>Post your video to all connected accounts simultaneously.</p>
          </div>

          {/* Channel selector */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Post as Channel</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {channels.map(ch => (
                <button key={ch.id} className={`channel-pill ${activeChannelId === ch.id ? "active" : ""}`}
                  onClick={() => setActiveChannelId(ch.id)}>
                  <span style={{ fontSize: 16 }}>{ch.emoji}</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: ch.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: activeChannelId === ch.id ? "#e8e4d9" : "#666" }}>{ch.name}</span>
                  {activeChannelId === ch.id && <span style={{ fontSize: 10, color: "#22c55e" }}>✓</span>}
                </button>
              ))}
              <button className="channel-pill" onClick={() => setPage("platforms")}>
                <span style={{ fontSize: 12, color: "#444" }}>+ Add Channel</span>
              </button>
            </div>
            {activeChannel && (
              <div style={{ marginTop: 10, fontSize: 11, color: "#444", display: "flex", flexWrap: "wrap", gap: 12 }}>
                {Object.entries(activeChannel.accounts).filter(([, v]) => v.connected).map(([pid, v]) => {
                  const p = PLATFORMS.find(pl => pl.id === pid);
                  return <span key={pid}><span style={{ color: p?.accent }}>{p?.icon}</span> {v.username}</span>;
                })}
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop} onClick={() => fileRef.current.click()}
            style={{ border: `1px dashed ${dragOver ? "#e8e4d9" : "#2a2a2a"}`, padding: "48px 32px", textAlign: "center",
              cursor: "pointer", background: dragOver ? "#141414" : "#0d0d0d", transition: "all 0.2s", marginBottom: 24 }}>
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
              placeholder="Write your caption — we'll adapt it for each platform's character limits..." />
            <div style={{ textAlign: "right", fontSize: 11, color: "#333", marginTop: 4 }}>{caption.length} characters</div>
          </div>

          {/* Hashtags */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Hashtags</label>
            <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)}
              placeholder="#ancientegypt #aiVideo #historyvlog #satisfying" />
          </div>

          {/* Platform toggles */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
              Platforms — <span style={{ color: "#333" }}>{selectedCount} selected</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PLATFORMS.map(p => {
                const acct = activeChannel?.accounts[p.id];
                const isOn = selected[p.id];
                return (
                  <button key={p.id} className={`platform-toggle ${isOn ? "on" : ""}`}
                    onClick={() => setSelected(s => ({ ...s, [p.id]: !s[p.id] }))}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16, color: isOn ? p.accent : "#333" }}>{p.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, color: isOn ? "#e8e4d9" : "#555" }}>{p.name}</div>
                          {acct?.username
                            ? <div style={{ fontSize: 10, color: isOn ? "#666" : "#2a2a2a", marginTop: 2 }}>{acct.username}</div>
                            : <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 2 }}>No account linked</div>}
                        </div>
                      </div>
                      {isOn && <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-primary" disabled={!video || !caption.trim() || posting}
              onClick={postAll} style={{ flex: 1, fontSize: 13 }}>
              {posting ? "Posting..." : `Post as ${activeChannel?.emoji} ${activeChannel?.name} → ${selectedCount} Platform${selectedCount !== 1 ? "s" : ""}`}
            </button>
            <button className="btn-ghost" onClick={() => setPage("platforms")}>Manage Channels</button>
          </div>
        </div>
      )}

      {/* ── CHANNELS PAGE ── */}
      {page === "platforms" && (
        <div style={{ display: "flex", minHeight: "calc(100vh - 53px)" }}>

          {/* Left sidebar */}
          <div style={{ width: 220, borderRight: "1px solid #1a1a1a", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 16px 12px", fontSize: 10, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Your Channels
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {channels.map(ch => (
                <div key={ch.id}
                  className={`ch-sidebar-item ${editChannelId === ch.id ? "active" : ""}`}
                  style={{ borderLeft: `2px solid ${editChannelId === ch.id ? ch.color : "transparent"}` }}
                  onClick={() => setEditChannelId(ch.id)}>
                  <span style={{ fontSize: 18 }}>{ch.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: editChannelId === ch.id ? "#e8e4d9" : "#666",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.name}</div>
                    <div style={{ fontSize: 10, color: "#333", marginTop: 2 }}>
                      {Object.values(ch.accounts).filter(a => a.connected).length} platforms active
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a1a" }}>
              <button className="btn-ghost" style={{ width: "100%", fontSize: 11, padding: "8px" }} onClick={addChannel}>
                + New Channel
              </button>
            </div>
          </div>

          {/* Right editor */}
          {editChannel && (
            <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto", maxWidth: 700 }}>
              {/* Channel header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: "50%", background: editChannel.color + "22",
                    border: `2px solid ${editChannel.color}55`, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                    {editChannel.emoji}
                  </div>
                  <div>
                    <input className="inline-edit" value={editChannel.name}
                      onChange={e => updateChannel(editChannel.id, { name: e.target.value })}
                      style={{ width: 240 }} />
                    <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>
                      {Object.values(editChannel.accounts).filter(a => a.connected).length} platforms connected
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn-ghost" style={{ fontSize: 11 }}
                    onClick={() => { setActiveChannelId(editChannel.id); setPage("upload"); }}>
                    Post as this →
                  </button>
                  <button className="btn-danger" onClick={() => deleteChannel(editChannel.id)}>Delete</button>
                </div>
              </div>

              {/* Emoji & Color pickers */}
              <div style={{ display: "flex", gap: 32, marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Icon</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 220 }}>
                    {CHANNEL_EMOJIS.map(em => (
                      <button key={em} className={`emoji-btn ${editChannel.emoji === em ? "sel" : ""}`}
                        onClick={() => updateChannel(editChannel.id, { emoji: em })}>{em}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Color</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {CHANNEL_COLORS.map(col => (
                      <div key={col} className={`color-dot ${editChannel.color === col ? "sel" : ""}`}
                        style={{ background: col }} onClick={() => updateChannel(editChannel.id, { color: col })} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Platform accounts */}
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                Platform Accounts
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {PLATFORMS.map(p => {
                  const acct = editChannel.accounts[p.id] || { username: "", connected: false };
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                      background: "#0d0d0d", border: `1px solid ${acct.connected ? "#1e1e1e" : "#141414"}` }}>
                      <span style={{ fontSize: 18, color: acct.connected ? p.accent : "#333", width: 24, textAlign: "center", flexShrink: 0 }}>{p.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: acct.connected ? "#888" : "#444", marginBottom: 6 }}>{p.name}</div>
                        <input className="account-input"
                          value={acct.username}
                          placeholder="@username or channel name"
                          onChange={e => updateAccount(editChannel.id, p.id, { username: e.target.value })} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: acct.connected ? "#22c55e" : "#333", minWidth: 28 }}>
                          {acct.connected ? "On" : "Off"}
                        </span>
                        <label className="toggle-wrap">
                          <input type="checkbox" checked={acct.connected}
                            onChange={e => updateAccount(editChannel.id, p.id, { connected: e.target.checked })} />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS PAGE ── */}
      {page === "analytics" && (
        <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>

          {/* Channel banner */}
          {postedChannel && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, padding: "14px 18px",
              background: "#111", border: `1px solid ${postedChannel.color}33`, borderLeft: `3px solid ${postedChannel.color}` }}>
              <span style={{ fontSize: 22 }}>{postedChannel.emoji}</span>
              <div>
                <div style={{ fontSize: 13, color: "#e8e4d9", marginBottom: 2 }}>{postedChannel.name}</div>
                <div style={{ fontSize: 11, color: "#555" }}>Posting as this channel across all platforms</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 14, flexWrap: "wrap" }}>
                {Object.entries(postedChannel.accounts).filter(([, v]) => v.connected).map(([pid, v]) => {
                  const pl = PLATFORMS.find(p => p.id === pid);
                  return <span key={pid} style={{ fontSize: 11, color: "#555" }}>
                    <span style={{ color: pl?.accent }}>{pl?.icon}</span> {v.username}
                  </span>;
                })}
              </div>
            </div>
          )}

          {/* Totals */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[
              { label: "Total Views", value: fmt(totalViews), color: "#e8e4d9" },
              { label: "Est. Earnings", value: fmtMoney(totalEarnings), color: "#22c55e" },
              { label: "Platforms Live", value: `${PLATFORMS.filter(p => stats[p.id].posted).length}/${selectedCount}`, color: "#f59e0b" },
              { label: "Total Engagement", value: fmt(PLATFORMS.reduce((s, p) => s + stats[p.id].likes + stats[p.id].comments + stats[p.id].shares, 0)), color: "#a78bfa" },
            ].map(m => (
              <div key={m.label} className="stat-card">
                <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{m.label}</div>
                <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 24, fontWeight: 700, color: m.color }}>
                  {liveMode ? m.value : "—"}
                </div>
                {liveMode && <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>updating live</div>}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", marginBottom: 24 }}>
            <button className={`tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>All Platforms</button>
            {PLATFORMS.filter(p => selected[p.id] || stats[p.id].posted).map(p => (
              <button key={p.id} className={`tab ${activeTab === p.id ? "active" : ""}`} onClick={() => setActiveTab(p.id)}>{p.name}</button>
            ))}
          </div>

          {/* Platform cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
            {PLATFORMS.filter(p => activeTab === "all" ? selected[p.id] || stats[p.id].posted : p.id === activeTab).map(p => {
              const s = stats[p.id];
              const maxViews = Math.max(...PLATFORMS.map(pl => stats[pl.id].views), 1);
              const pct = Math.min((s.views / maxViews) * 100, 100);
              const acct = postedChannel?.accounts[p.id];
              return (
                <div key={p.id} className="stat-card posting-anim">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20, color: p.accent }}>{p.icon}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                        {acct?.username && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{acct.username}</div>}
                      </div>
                    </div>
                    <div>
                      {s.posting && <span className="pulse" style={{ fontSize: 11, color: "#f59e0b" }}>Posting...</span>}
                      {s.posted && liveMode && <><span className="live-dot" style={{ marginRight: 6 }} /><span style={{ fontSize: 11, color: "#22c55e" }}>Live</span></>}
                      {!s.posted && !s.posting && <span style={{ fontSize: 11, color: "#333" }}>Pending</span>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[{ label: "Views", val: fmt(s.views) }, { label: "Likes", val: fmt(s.likes) },
                      { label: "Comments", val: fmt(s.comments) }, { label: "Shares", val: fmt(s.shares) }].map(m => (
                      <div key={m.label} style={{ background: "#0d0d0d", padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 16, fontWeight: 700 }}>{s.posted ? m.val : "—"}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#555" }}>Est. earnings</span>
                      <span style={{ fontSize: 13, color: "#22c55e", fontFamily: "'Unbounded',sans-serif", fontWeight: 700 }}>
                        {s.posted ? fmtMoney(s.earnings) : "—"}
                      </span>
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
            <div style={{ marginTop: 24, padding: "16px 20px", background: "#111", border: "1px solid #1e1e1e",
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                  {postedChannel?.emoji} {postedChannel?.name} · {PLATFORMS.filter(p => stats[p.id].posted).length} platforms posted
                </div>
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
