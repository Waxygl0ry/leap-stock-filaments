import React, { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Trash2, Pencil, X, Check, Package, ClipboardList, Boxes, WifiOff } from "lucide-react";
import { supabase } from "./supabaseClient";

const MATERIAUX = ["PLA", "PETG", "ABS", "ASA", "TPU", "Nylon", "Autre"];

function pct(bobine) {
  if (!bobine.poids_initial) return 0;
  return Math.max(0, Math.min(1, bobine.poids_restant / bobine.poids_initial));
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function Spool({ bobine, size = 96 }) {
  const p = pct(bobine);
  const r = 38;
  const c = 2 * Math.PI * r;
  const low = p < 0.15;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={low ? "var(--rust)" : bobine.couleur_hex || "var(--accent)"}
        strokeWidth="9" strokeLinecap="butt"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        transform="rotate(-90 48 48)"
      />
      <circle cx="48" cy="48" r="21" fill="var(--panel)" stroke="var(--line)" strokeWidth="1" />
      <text x="48" y="45" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="14" fontWeight="600" fill="var(--ink)">
        {Math.round(p * 100)}%
      </text>
      <text x="48" y="59" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="var(--muted)">
        {Math.round(bobine.poids_restant)}g
      </text>
    </svg>
  );
}

export default function App() {
  const [bobines, setBobines] = useState([]);
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connErr, setConnErr] = useState(false);
  const [view, setView] = useState("stock");
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setConnErr(false);
    const [{ data: b, error: eb }, { data: u, error: eu }] = await Promise.all([
      supabase.from("bobines").select("*").order("marque"),
      supabase.from("usages").select("*").order("date", { ascending: false }),
    ]);
    if (eb || eu) {
      setConnErr(true);
    } else {
      setBobines(b || []);
      setUsages(u || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Realtime : toute modification faite par un autre membre arrive ici automatiquement.
    const channel = supabase
      .channel("leap-stock-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bobines" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "usages" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  const addBobine = async (b) => {
    const { error } = await supabase.from("bobines").insert({ ...b, poids_restant: b.poids_initial });
    if (error) setNotice({ type: "error", text: "Erreur : " + error.message });
    else { setNotice({ type: "ok", text: "Bobine ajoutée." }); load(); }
  };

  const updateBobine = async (id, patch) => {
    const { error } = await supabase.from("bobines").update(patch).eq("id", id);
    if (error) setNotice({ type: "error", text: "Erreur : " + error.message });
    else { setNotice({ type: "ok", text: "Bobine modifiée." }); load(); }
  };

  const deleteBobine = async (id) => {
    const { error } = await supabase.from("bobines").delete().eq("id", id);
    if (error) setNotice({ type: "error", text: "Erreur : " + error.message });
    else { setNotice({ type: "ok", text: "Bobine supprimée." }); load(); }
  };

  const addUsage = async (u) => {
    const bobine = bobines.find((b) => b.id === u.bobine_id);
    if (!bobine) return;
    const { error: e1 } = await supabase.from("usages").insert(u);
    if (e1) { setNotice({ type: "error", text: "Erreur : " + e1.message }); return; }
    const { error: e2 } = await supabase
      .from("bobines")
      .update({ poids_restant: Math.max(0, bobine.poids_restant - u.grammes) })
      .eq("id", u.bobine_id);
    if (e2) setNotice({ type: "error", text: "Erreur : " + e2.message });
    else setNotice({ type: "ok", text: "Utilisation enregistrée, stock mis à jour." });
    load();
  };

  return (
    <div className="leap-app">
      <div className="leap-shell">
        <div className="leap-head">
          <div>
            <h1 className="leap-title">Stock filaments — LEAP</h1>
            <div className="leap-sub">Suivi partagé des bobines et de leur utilisation</div>
          </div>
          <div className="leap-sync">
            <button onClick={load}><RefreshCw size={13} /> Actualiser</button>
          </div>
        </div>

        <nav className="leap-nav">
          <button className={view === "stock" ? "active" : ""} onClick={() => setView("stock")}>
            <Boxes size={15} /> Stock
          </button>
          <button className={view === "declarer" ? "active" : ""} onClick={() => setView("declarer")}>
            <Package size={15} /> Déclarer une utilisation
          </button>
          <button className={view === "historique" ? "active" : ""} onClick={() => setView("historique")}>
            <ClipboardList size={15} /> Historique
          </button>
        </nav>

        {connErr && (
          <div className="leap-notice error"><WifiOff size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Connexion à la base impossible. Vérifie VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY dans .env (voir README.md).
          </div>
        )}
        {notice && (
          <div className={`leap-notice ${notice.type}`} onClick={() => setNotice(null)}>{notice.text}</div>
        )}

        {loading ? (
          <div className="leap-empty">Chargement du stock…</div>
        ) : view === "stock" ? (
          <StockView bobines={bobines} onAdd={addBobine} onUpdate={updateBobine} onDelete={deleteBobine} />
        ) : view === "declarer" ? (
          <DeclarerView bobines={bobines} onSubmit={addUsage} />
        ) : (
          <HistoriqueView usages={usages} bobines={bobines} />
        )}
      </div>
    </div>
  );
}

function StockView({ bobines, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [filterMat, setFilterMat] = useState("");
  const [search, setSearch] = useState("");

  const totalRestant = bobines.reduce((s, b) => s + Number(b.poids_restant), 0);
  const enAlerte = bobines.filter((b) => pct(b) < 0.15).length;

  const filtered = bobines.filter((b) => {
    if (filterMat && b.materiau !== filterMat) return false;
    if (search && !(`${b.marque} ${b.couleur_nom}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <div className="leap-stats">
        <div><div className="leap-stat-num">{bobines.length}</div><div className="leap-stat-label">bobines suivies</div></div>
        <div><div className="leap-stat-num">{(totalRestant / 1000).toFixed(1)} kg</div><div className="leap-stat-label">restant au total</div></div>
        <div><div className="leap-stat-num" style={{ color: enAlerte ? "var(--rust)" : "var(--ink)" }}>{enAlerte}</div><div className="leap-stat-label">bobines en alerte (&lt;15%)</div></div>
      </div>

      <div className="leap-filters">
        <select value={filterMat} onChange={(e) => setFilterMat(e.target.value)}>
          <option value="">Tous les matériaux</option>
          {MATERIAUX.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input placeholder="Rechercher marque ou couleur…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showAdd && <BobineForm onCancel={() => setShowAdd(false)} onSubmit={(b) => { onAdd(b); setShowAdd(false); }} />}
      {editId && (
        <BobineForm
          initial={bobines.find((b) => b.id === editId)}
          isEdit
          onCancel={() => setEditId(null)}
          onSubmit={(patch) => { onUpdate(editId, patch); setEditId(null); }}
        />
      )}

      {!showAdd && !editId && (
        bobines.length === 0 ? (
          <div className="leap-empty">
            Aucune bobine enregistrée pour l'instant.<br />
            <button className="leap-btn" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>Ajouter la première bobine</button>
          </div>
        ) : (
          <div className="leap-grid">
            {filtered.map((b) => (
              <div key={b.id} className={`leap-card ${pct(b) < 0.15 ? "low" : ""}`}>
                <Spool bobine={b} />
                <div className="leap-card-body">
                  <div className="leap-card-title">{b.marque}</div>
                  <div className="leap-card-sub">
                    <span className="leap-swatch" style={{ background: b.couleur_hex }} />
                    {b.materiau} · {b.couleur_nom}
                  </div>
                  <div className="leap-card-weight">{Math.round(b.poids_restant)} g / {Math.round(b.poids_initial)} g</div>
                  <div className="leap-card-actions">
                    <button className="leap-icon-btn" onClick={() => setEditId(b.id)}><Pencil size={13} /></button>
                    {confirmDel === b.id ? (
                      <>
                        <button className="leap-icon-btn danger" onClick={() => { onDelete(b.id); setConfirmDel(null); }}><Check size={13} /></button>
                        <button className="leap-icon-btn" onClick={() => setConfirmDel(null)}><X size={13} /></button>
                      </>
                    ) : (
                      <button className="leap-icon-btn danger" onClick={() => setConfirmDel(b.id)}><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button className="leap-add-card" onClick={() => setShowAdd(true)}><Plus size={16} /> Nouvelle bobine</button>
          </div>
        )
      )}
    </div>
  );
}

function BobineForm({ initial, isEdit, onCancel, onSubmit }) {
  const [marque, setMarque] = useState(initial?.marque || "");
  const [materiau, setMateriau] = useState(initial?.materiau || MATERIAUX[0]);
  const [couleurNom, setCouleurNom] = useState(initial?.couleur_nom || "");
  const [couleurHex, setCouleurHex] = useState(initial?.couleur_hex || "#2C5F8A");
  const [poidsInitial, setPoidsInitial] = useState(initial?.poids_initial ?? 1000);
  const [poidsRestant, setPoidsRestant] = useState(initial?.poids_restant ?? initial?.poids_initial ?? 1000);
  const [err, setErr] = useState("");

  const submit = () => {
    if (!marque.trim() || !couleurNom.trim()) { setErr("Marque et couleur sont obligatoires."); return; }
    if (poidsInitial <= 0) { setErr("Le poids initial doit être supérieur à 0."); return; }
    const payload = { marque: marque.trim(), materiau, couleur_nom: couleurNom.trim(), couleur_hex: couleurHex, poids_initial: Number(poidsInitial) };
    if (isEdit) payload.poids_restant = Number(poidsRestant);
    onSubmit(payload);
  };

  return (
    <div className="leap-panel" style={{ marginBottom: 18 }}>
      <div className="leap-field"><label>Marque</label><input value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Prusament, eSun, Polymaker…" /></div>
      <div className="leap-row-2">
        <div className="leap-field"><label>Matériau</label>
          <select value={materiau} onChange={(e) => setMateriau(e.target.value)}>{MATERIAUX.map((m) => <option key={m} value={m}>{m}</option>)}</select>
        </div>
        <div className="leap-field"><label>Couleur (nom)</label><input value={couleurNom} onChange={(e) => setCouleurNom(e.target.value)} placeholder="Rouge translucide" /></div>
      </div>
      <div className="leap-row-2">
        <div className="leap-field"><label>Teinte affichée</label><input type="color" value={couleurHex} onChange={(e) => setCouleurHex(e.target.value)} style={{ padding: 2, height: 38 }} /></div>
        <div className="leap-field"><label>Poids initial (g)</label><input type="number" value={poidsInitial} onChange={(e) => setPoidsInitial(e.target.value)} /></div>
      </div>
      {isEdit && (
        <div className="leap-field"><label>Poids restant (g) — à corriger après inventaire si besoin</label>
          <input type="number" value={poidsRestant} onChange={(e) => setPoidsRestant(e.target.value)} />
        </div>
      )}
      {err && <div className="leap-err">{err}</div>}
      <div className="leap-form-actions">
        <button className="leap-btn" onClick={submit}>{isEdit ? "Enregistrer" : "Ajouter la bobine"}</button>
        <button className="leap-btn ghost" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

function DeclarerView({ bobines, onSubmit }) {
  const [bobineId, setBobineId] = useState("");
  const [membre, setMembre] = useState("");
  const [impression, setImpression] = useState("");
  const [grammes, setGrammes] = useState("");
  const [err, setErr] = useState("");

  const bobine = bobines.find((b) => b.id === bobineId);
  const byMateriau = MATERIAUX.map((m) => ({ m, list: bobines.filter((b) => b.materiau === m) })).filter((g) => g.list.length);

  const submit = () => {
    setErr("");
    if (!bobineId) { setErr("Choisis une bobine."); return; }
    if (!membre.trim()) { setErr("Indique qui a fait l'impression."); return; }
    const g = Number(grammes);
    if (!g || g <= 0) { setErr("Indique un poids utilisé valide."); return; }
    if (bobine && g > bobine.poids_restant) { setErr(`Il ne reste que ${Math.round(bobine.poids_restant)} g sur cette bobine.`); return; }
    onSubmit({ bobine_id: bobineId, membre: membre.trim(), impression: impression.trim() || "Sans titre", grammes: g });
    setBobineId(""); setMembre(""); setImpression(""); setGrammes("");
  };

  if (bobines.length === 0) {
    return <div className="leap-empty">Ajoute d'abord une bobine dans l'onglet Stock avant de déclarer une utilisation.</div>;
  }

  return (
    <div className="leap-panel">
      <div className="leap-field">
        <label>Bobine utilisée</label>
        <select value={bobineId} onChange={(e) => setBobineId(e.target.value)}>
          <option value="">— Choisir —</option>
          {byMateriau.map((g) => (
            <optgroup key={g.m} label={g.m}>
              {g.list.map((b) => (
                <option key={b.id} value={b.id}>{b.marque} · {b.couleur_nom} ({Math.round(b.poids_restant)} g restants)</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="leap-field"><label>Membre</label><input value={membre} onChange={(e) => setMembre(e.target.value)} placeholder="Ton prénom" /></div>
      <div className="leap-field"><label>Impression (projet, pièce…)</label><input value={impression} onChange={(e) => setImpression(e.target.value)} placeholder="Ex. support caméra drone" /></div>
      <div className="leap-field"><label>Poids utilisé (g)</label><input type="number" value={grammes} onChange={(e) => setGrammes(e.target.value)} /></div>
      {err && <div className="leap-err">{err}</div>}
      <button className="leap-btn" onClick={submit}>Enregistrer l'utilisation</button>
    </div>
  );
}

function HistoriqueView({ usages, bobines }) {
  const [filterMembre, setFilterMembre] = useState("");
  const membres = [...new Set(usages.map((u) => u.membre))];
  const rows = usages.filter((u) => !filterMembre || u.membre === filterMembre);

  if (usages.length === 0) return <div className="leap-empty">Aucune utilisation déclarée pour l'instant.</div>;

  return (
    <div>
      <div className="leap-filters">
        <select value={filterMembre} onChange={(e) => setFilterMembre(e.target.value)}>
          <option value="">Tous les membres</option>
          {membres.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <table className="leap-table">
        <thead><tr><th>Date</th><th>Membre</th><th>Bobine</th><th>Impression</th><th>Poids</th></tr></thead>
        <tbody>
          {rows.map((u) => {
            const b = bobines.find((x) => x.id === u.bobine_id);
            return (
              <tr key={u.id}>
                <td>{fmtDate(u.date)}</td>
                <td>{u.membre}</td>
                <td>{b ? <><span className="leap-swatch" style={{ background: b.couleur_hex }} />{b.marque} · {b.couleur_nom}</> : "(bobine supprimée)"}</td>
                <td>{u.impression}</td>
                <td className="num">{Math.round(u.grammes)} g</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
