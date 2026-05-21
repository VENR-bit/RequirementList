// Rideekanda — admin page
const { useState, useEffect, useMemo, useRef } = React;
const SEED_ITEMS = window.RIDEEKANDA_ITEMS;
const ICONS = window.ICONS;
const fmtLKR = (n) => n.toLocaleString("en-LK", { maximumFractionDigits: 0 });
const pad2 = (n) => String(n).padStart(2, "0");

const STORE_KEY = "rk-items";
function loadItems() {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return SEED_ITEMS;
}
function saveItems(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch(e) {}
}

const PRIORITIES = [
  { id: "urgent", label: "Urgent" },
  { id: "need", label: "Needed" },
  { id: "routine", label: "Routine" },
];

const ICON_OPTIONS = ["robe","bowl","vial","stick","fan","grain","cup","lantern","lamp","candle","book","tile","brick","filter","leaf","net"];

function emptyDraft() {
  return { en: "", si: "", desc: "", price: 0, qty: 1, priority: "need", icon: "bowl", photo: "" };
}

function AdminApp() {
  const [items, setItems] = useState(loadItems);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const fileRef = useRef(null);

  // persist on every change
  useEffect(() => { saveItems(items); }, [items]);

  function startEdit(item) {
    setEditingId(item.id);
    setDraft({ ...emptyDraft(), ...item });
  }
  function startNew() {
    setEditingId("new");
    setDraft(emptyDraft());
  }
  function save() {
    if (!draft.en.trim()) return;
    if (editingId === "new") {
      const nextId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
      setItems([{ ...draft, id: nextId, pledged: 0, addedDays: 0 }, ...items]);
    } else {
      setItems(items.map(i => i.id === editingId ? { ...i, ...draft } : i));
    }
    setEditingId(null);
    setDraft(emptyDraft());
  }
  function cancel() { setEditingId(null); setDraft(emptyDraft()); }
  function remove(id) {
    if (!confirm("Remove this requirement?")) return;
    setItems(items.filter(i => i.id !== id));
    if (editingId === id) cancel();
  }
  function onPhotoPick(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // Downscale and store as data URL to keep localStorage manageable
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        setDraft(d => ({ ...d, photo: cv.toDataURL("image/jpeg", 0.82) }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  }
  function clearPhoto() { setDraft(d => ({ ...d, photo: "" })); }
  function resetSeed() {
    if (!confirm("Reset to the original sample list? Local edits will be lost.")) return;
    setItems(SEED_ITEMS);
    cancel();
  }

  const stats = useMemo(() => {
    let qty = 0, value = 0, pledgedValue = 0, urgent = 0;
    for (const it of items) {
      qty += it.qty;
      value += it.qty * it.price;
      pledgedValue += (it.pledged || 0) * it.price;
      if (it.priority === "urgent") urgent += 1;
    }
    return { qty, value, pledgedValue, urgent, count: items.length };
  }, [items]);

  return (
    <React.Fragment>
      <header className="masthead">
        <div className="masthead-inner">
          <a className="brand" href="./index.html">
            <img className="brand-mark" src="images/rideekanda-logo.png" alt="" />
            <div className="brand-text">
              <span className="en">Rideekanda Forest Monastery</span>
              <span className="si">රිදීකන්ද ආරණ්‍ය සේනාසනය</span>
            </div>
          </a>
          <nav className="masthead-nav">
            <a className="nav-link" href="./index.html">Requirements</a>
            <a className="nav-link" href="https://rideekanda.org">Monastery</a>
            <a className="nav-link active" href="./admin.html">Admin</a>
            <a className="donate-cta" href="https://venr-bit.github.io/RideekandaDonate/" target="_blank" rel="noopener">Donate</a>
          </nav>
        </div>
      </header>

      <main className="admin-shell">
        <div className="admin-header">
          <h2>Administration</h2>
          <span className="admin-sub">· internal · maintained by saṅgha office</span>
          <button className="btn-ghost" onClick={resetSeed} style={{marginLeft:"auto"}}>↺ Reset to sample</button>
        </div>

        <div className="admin-stats">
          <div className="stat-block">
            <div className="summary-label">Total items</div>
            <div className="summary-value mono">{pad2(stats.count)}</div>
          </div>
          <div className="stat-block">
            <div className="summary-label">Urgent flag</div>
            <div className="summary-value mono" style={{color:"var(--priority-urgent)"}}>{pad2(stats.urgent)}</div>
          </div>
          <div className="stat-block">
            <div className="summary-label">Total qty</div>
            <div className="summary-value mono">{stats.qty}</div>
          </div>
          <div className="stat-block">
            <div className="summary-label">Approx. value</div>
            <div className="summary-value">LKR {fmtLKR(stats.value)}</div>
          </div>
          <div className="stat-block">
            <div className="summary-label">Pledged</div>
            <div className="summary-value" style={{color:"var(--accent)"}}>LKR {fmtLKR(stats.pledgedValue)}</div>
          </div>
        </div>

        <div className="admin-grid">
          <aside>
            <div className="admin-card">
              <div className="eyebrow">{editingId === "new" ? "New Requirement" : editingId ? "Edit Requirement" : "Add a Requirement"}</div>
              <h3>{editingId === "new" ? "Add to the list" : editingId ? (draft.en || "Editing…") : "Begin a new entry"}</h3>
              {!editingId && (
                <React.Fragment>
                  <p style={{color:"var(--ink-soft)", fontSize:14, marginTop:8, lineHeight:1.5}}>
                    Use this form to publish a fresh item to the public requirements page, or click any row on the right to edit it.
                  </p>
                  <button className="btn-primary" style={{marginTop:18}} onClick={startNew}>+ New Item</button>
                </React.Fragment>
              )}
              {editingId !== null && (
                <div style={{marginTop:18}}>
                  {/* Photo uploader */}
                  <div className="field">
                    <label>Photo</label>
                    <div style={{display:"flex", gap:14, alignItems:"flex-start", marginTop:6}}>
                      <div className="thumb" style={{width:96, height:96, flexShrink:0, background: draft.photo ? "var(--rule-soft)" : "var(--accent-tint)"}}>
                        {draft.photo
                          ? <img src={draft.photo} alt="" />
                          : (ICONS[draft.icon] || ICONS.bowl)}
                      </div>
                      <div style={{flex:1, display:"flex", flexDirection:"column", gap:8}}>
                        <input ref={fileRef} type="file" accept="image/*" onChange={onPhotoPick} style={{display:"none"}} />
                        <button type="button" className="pledge-btn" style={{alignSelf:"flex-start"}} onClick={() => fileRef.current && fileRef.current.click()}>
                          {draft.photo ? "Replace photo" : "Upload photo"}
                        </button>
                        {draft.photo && (
                          <button type="button" className="btn-ghost" style={{padding:"6px 10px", alignSelf:"flex-start", fontSize:11}} onClick={clearPhoto}>Remove photo</button>
                        )}
                        <div style={{fontSize:11, color:"var(--muted)", lineHeight:1.5}}>
                          JPG or PNG · auto-resized to 480 px.<br/>If no photo, a glyph is shown.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label>Name (English)</label>
                    <input value={draft.en} onChange={(e) => setDraft({...draft, en: e.target.value})} placeholder="Outer robe (Cīvara)" />
                  </div>
                  <div className="field">
                    <label>Name (Sinhala)</label>
                    <input className="si" value={draft.si} onChange={(e) => setDraft({...draft, si: e.target.value})} placeholder="පිට සිවුර" />
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <textarea value={draft.desc} onChange={(e) => setDraft({...draft, desc: e.target.value})} placeholder="A short note for sponsors." />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Quantity</label>
                      <input type="number" min={1} value={draft.qty} onChange={(e) => setDraft({...draft, qty: +e.target.value || 1})} />
                    </div>
                    <div className="field">
                      <label>Per cost (LKR)</label>
                      <input type="number" min={0} value={draft.price} onChange={(e) => setDraft({...draft, price: +e.target.value || 0})} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Approx. total</label>
                    <div style={{fontFamily:"var(--serif)", fontSize:24, color:"var(--accent-deep)", fontFeatureSettings:'"tnum"', padding:"4px 0"}}>
                      LKR {fmtLKR((draft.qty || 0) * (draft.price || 0))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Priority</label>
                    <select value={draft.priority} onChange={(e) => setDraft({...draft, priority: e.target.value})}>
                      {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>

                  <div className="modal-actions" style={{marginTop:22, justifyContent:"flex-end"}}>
                    <button className="btn-ghost" onClick={cancel}>Cancel</button>
                    <button className="btn-primary" onClick={save}>{editingId === "new" ? "Publish" : "Save Changes"}</button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <section>
            <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:14}}>
              <h3 style={{fontFamily:"var(--serif)", fontWeight:500, fontSize:22, margin:0}}>
                Current Requirements
                <span style={{color:"var(--muted)", fontSize:14, letterSpacing:"0.12em", textTransform:"uppercase", marginLeft:8}}>{items.length} items</span>
              </h3>
              {editingId === null && (
                <button className="btn-primary" onClick={startNew}>+ New</button>
              )}
            </div>
            <div>
              {items.length === 0 && (
                <div className="empty" style={{padding:"40px 0"}}>No items yet. Add one using the form on the left.</div>
              )}
              {items.map(it => (
                <div className="admin-list-row" key={it.id}
                  style={editingId === it.id ? {background:"var(--accent-tint)", padding:"14px 12px"} : null}>
                  <div className="thumb">
                    {it.photo ? <img src={it.photo} alt="" /> : (ICONS[it.icon] || ICONS.bowl)}
                  </div>
                  <div>
                    <div className="name">{it.en}</div>
                    <div className="name-si si">{it.si}</div>
                    <div style={{display:"flex", gap:8, marginTop:4, alignItems:"center"}}>
                      <span className={`priority-pill priority-${it.priority}`}>{it.priority === "urgent" ? "Urgent" : it.priority === "need" ? "Needed" : "Routine"}</span>
                      <span style={{fontSize:11, color:"var(--muted)", fontFeatureSettings:'"tnum"'}}>
                        · LKR {fmtLKR(it.price)} ea
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="mini-num">{it.qty}</div>
                    <div className="mini-label">Qty</div>
                  </div>
                  <div>
                    <div className="mini-num">LKR {fmtLKR(it.qty * it.price)}</div>
                    <div className="mini-label">Total</div>
                  </div>
                  <div className="admin-actions">
                    <button className="icon-btn" title="Edit" onClick={() => startEdit(it)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button className="icon-btn" title="Remove" onClick={() => remove(it.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6 M14 11v6 M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer>
        <div className="footer-inner">
          <div>
            <div className="footer-mark">Rideekanda Forest Monastery</div>
            <div className="footer-meta si" style={{marginTop:4}}>රිදීකන්ද ආරණ්‍ය සේනාසනය · උඩස්ගිරිය, මාතලේ</div>
          </div>
          <div className="footer-meta" style={{textAlign:"right"}}>
            <div>Admin · saṅgha office</div>
            <div><a href="./index.html">← Public requirements page</a></div>
          </div>
        </div>
      </footer>
    </React.Fragment>
  );
}

window.RideekandaAdmin = AdminApp;
