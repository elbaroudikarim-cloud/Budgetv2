import { useState, useEffect, useRef } from 'react';
import { Wallet, CreditCard, Plus, Trash2, ChevronDown, ChevronRight, Edit3, BarChart3, Calendar, Euro, Settings, AlertCircle, Check, Cloud, Clock, X, Copy, ClipboardPaste } from 'lucide-react';

const CATEGORIES = {
  'Transport': { icon: '🚗', color: '#3B82F6', sub: ['Location voiture', 'Essence', 'Péage', 'Parking', 'Bateau / Ferry', 'Taxi / VTC', 'Train', 'Funiculaire', 'Bus', 'Autre transport'] },
  'Alimentation': { icon: '🍝', color: '#F59E0B', sub: ['Restaurant', 'Pizzeria', 'Trattoria', 'Café / Thé', 'Pâtisserie / Glacier', 'Supérette / Marché', 'Buvette / Snack', 'Bar / Apéro', 'Street food', 'Autre alimentation'] },
  'Hébergement': { icon: '🏨', color: '#8B5CF6', sub: ['Hôtel', 'Supplément nuit', 'Extra mini-bar', 'Pourboire', 'Autre hébergement'] },
  'Visites & Culture': { icon: '🏛️', color: '#EF4444', sub: ['Billet musée', 'Billet site archéologique', 'Visite guidée', 'Audio-guide', 'Concert / Spectacle', 'Entrée jardin / villa', 'Autre visite'] },
  'Achats enfants': { icon: '🧸', color: '#EC4899', sub: ['Boutique souvenir', 'Jeu / Jouet', 'Gadget', 'Vêtement enfant', 'Livre / BD', 'Glace / Goûter', 'Autre achat enfant'] },
  'Shopping': { icon: '🛍️', color: '#10B981', sub: ['Vêtements', 'Maroquinerie', 'Souvenirs', 'Artisanat local', 'Parfumerie / Cosmétique', 'Limoncello / Produits locaux', 'Bijoux', 'Autre shopping'] },
  'Santé & Pharmacie': { icon: '💊', color: '#06B6D4', sub: ['Pharmacie', 'Consultation médicale', 'Parapharmacie', 'Autre santé'] },
  'Divers': { icon: '✨', color: '#6B7280', sub: ['Pourboire', 'Don / Église', 'Téléphone / eSIM', 'Toilettes publiques', 'Imprévu', 'Autre'] }
};

const STORAGE_KEY = 'travel_expenses_v3';
const LAST_EXPORT_KEY = 'travel_expenses_last_export_v3';
const EXPORT_REMINDER_THRESHOLD = 5;

const loadState = () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
};
const saveState = (state) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
};
const getLastExport = () => {
  try { return JSON.parse(localStorage.getItem(LAST_EXPORT_KEY) || 'null'); } catch (e) { return null; }
};
const setLastExport = (data) => {
  try { localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(data)); } catch (e) {}
};

export default function TravelExpenses() {
  const [tripName, setTripName] = useState('Côte Amalfitaine');
  const [budgetCash, setBudgetCash] = useState(0);
  const [budgetCard, setBudgetCard] = useState(0);
  const [topUps, setTopUps] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [days, setDays] = useState([{ id: 1, label: 'Jour 1', desc: '' }]);
  const [loading, setLoading] = useState(true);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showDayManager, setShowDayManager] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showTripNameModal, setShowTripNameModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [view, setView] = useState('dashboard');
  const [expandedCats, setExpandedCats] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const [lastExportInfo, setLastExportInfoState] = useState(null);

  useEffect(() => {
    const s = loadState();
    if (s) {
      setTripName(s.tripName || 'Côte Amalfitaine');
      setBudgetCash(s.budgetCash || 0);
      setBudgetCard(s.budgetCard || 0);
      setTopUps(s.topUps || []);
      setExpenses(s.expenses || []);
      setDays(s.days && s.days.length ? s.days : [{ id: 1, label: 'Jour 1', desc: '' }]);
    }
    setLastExportInfoState(getLastExport());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (saveState({ tripName, budgetCash, budgetCard, topUps, expenses, days })) flashSaved();
  }, [tripName, budgetCash, budgetCard, topUps, expenses, days, loading]);

  const flashSaved = () => {
    setSaveStatus('Sauvegardé');
    setTimeout(() => setSaveStatus(''), 1200);
  };

  const totalCashAvailable = budgetCash + topUps.filter(t => t.mode === 'cash').reduce((s, t) => s + t.amount, 0);
  const totalCardAvailable = budgetCard + topUps.filter(t => t.mode === 'card').reduce((s, t) => s + t.amount, 0);
  const spentCash = expenses.filter(e => e.mode === 'cash').reduce((s, e) => s + e.amount, 0);
  const spentCard = expenses.filter(e => e.mode === 'card').reduce((s, e) => s + e.amount, 0);
  const totalSpent = spentCash + spentCard;
  const totalBudget = totalCashAvailable + totalCardAvailable;
  const soldeCash = totalCashAvailable - spentCash;
  const soldeCard = totalCardAvailable - spentCard;

  const expensesSinceLastExport = lastExportInfo
    ? expenses.filter(e => e.id > (lastExportInfo.lastExpenseId || 0)).length
    : expenses.length;
  const needsBackup = expensesSinceLastExport >= EXPORT_REMINDER_THRESHOLD;

  const byCategory = {};
  Object.keys(CATEGORIES).forEach(cat => {
    byCategory[cat] = { total: 0, cash: 0, card: 0, sub: {} };
    CATEGORIES[cat].sub.forEach(s => { byCategory[cat].sub[s] = { total: 0, cash: 0, card: 0, count: 0 }; });
  });
  expenses.forEach(e => {
    if (byCategory[e.category]) {
      byCategory[e.category].total += e.amount;
      byCategory[e.category][e.mode] += e.amount;
      if (byCategory[e.category].sub[e.subcategory]) {
        byCategory[e.category].sub[e.subcategory].total += e.amount;
        byCategory[e.category].sub[e.subcategory][e.mode] += e.amount;
        byCategory[e.category].sub[e.subcategory].count += 1;
      }
    }
  });

  const byDay = {};
  days.forEach(d => { byDay[d.id] = { ...d, total: 0, cash: 0, card: 0, count: 0 }; });
  expenses.forEach(e => {
    if (byDay[e.dayId]) {
      byDay[e.dayId].total += e.amount;
      byDay[e.dayId][e.mode] += e.amount;
      byDay[e.dayId].count += 1;
    }
  });

  const addExpense = (exp) => setExpenses([{ ...exp, id: Date.now() + Math.random() }, ...expenses]);
  const updateExpense = (id, exp) => setExpenses(expenses.map(e => e.id === id ? { ...e, ...exp } : e));
  const deleteExpense = (id) => setExpenses(expenses.filter(e => e.id !== id));
  const addTopUp = (mode, amount, note) => setTopUps([{ id: Date.now() + Math.random(), mode, amount, note, date: new Date().toISOString() }, ...topUps]);
  const deleteTopUp = (id) => setTopUps(topUps.filter(t => t.id !== id));
  const addDay = (label, desc) => {
    const nextId = Math.max(0, ...days.map(d => d.id)) + 1;
    setDays([...days, { id: nextId, label: label || `Jour ${nextId}`, desc: desc || '' }]);
  };
  const updateDay = (id, label, desc) => setDays(days.map(d => d.id === id ? { ...d, label, desc } : d));
  const deleteDay = (id) => {
    if (expenses.some(e => e.dayId === id)) { alert('Ce jour contient des dépenses — impossible de le supprimer.'); return; }
    setDays(days.filter(d => d.id !== id));
  };

  const resetAll = () => {
    if (!confirm('Tout effacer ? Pense à sauvegarder avant !')) return;
    setTripName('Mon voyage'); setBudgetCash(0); setBudgetCard(0); setTopUps([]); setExpenses([]);
    setDays([{ id: 1, label: 'Jour 1', desc: '' }]);
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LAST_EXPORT_KEY); } catch (e) {}
    setLastExportInfoState(null);
  };

  // Génère le texte de sauvegarde
  const generateBackupText = () => {
    const now = new Date();
    const data = {
      appVersion: 3,
      exportDate: now.toISOString(),
      tripName, budgetCash, budgetCard, topUps, expenses, days,
      stats: { totalSpent, totalBudget, spentCash, spentCard, expenseCount: expenses.length }
    };
    return JSON.stringify(data, null, 2);
  };

  // Marque l'export comme fait
  const markAsExported = () => {
    const now = new Date();
    const lastExpenseId = expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) : 0;
    const info = { date: now.toISOString(), expenseCount: expenses.length, lastExpenseId, tripName, totalSpent };
    setLastExport(info);
    setLastExportInfoState(info);
  };

  // Import depuis texte collé
  const importFromText = (text) => {
    try {
      const data = JSON.parse(text);
      if (!data.expenses || !Array.isArray(data.expenses) || !data.days || !Array.isArray(data.days)) {
        return { ok: false, error: 'Format invalide — ce n\'est pas une sauvegarde du budget voyage.' };
      }
      setTripName(data.tripName || 'Mon voyage');
      setBudgetCash(data.budgetCash || 0);
      setBudgetCard(data.budgetCard || 0);
      setTopUps(data.topUps || []);
      setExpenses(data.expenses || []);
      setDays(data.days && data.days.length ? data.days : [{ id: 1, label: 'Jour 1', desc: '' }]);
      const lastExpenseId = data.expenses.length > 0 ? Math.max(...data.expenses.map(e => e.id)) : 0;
      const info = { date: data.exportDate, expenseCount: data.expenses.length, lastExpenseId, tripName: data.tripName };
      setLastExport(info);
      setLastExportInfoState(info);
      return { ok: true, summary: { count: data.expenses.length, name: data.tripName, date: data.exportDate, total: data.stats?.totalSpent } };
    } catch (err) {
      return { ok: false, error: 'Texte illisible. Vérifie que tu as bien collé le texte complet depuis Drive.' };
    }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';

  const formatLastExport = () => {
    if (!lastExportInfo) return null;
    const d = new Date(lastExportInfo.date);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH} h`;
    if (diffD < 7) return `Il y a ${diffD} j`;
    return d.toLocaleDateString('fr-FR');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500">Chargement…</div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-24" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header className="sticky top-0 z-40 bg-gradient-to-br from-slate-900 to-slate-800 text-white px-5 pt-5 pb-6 shadow-lg">
        <div className="flex items-start justify-between mb-5">
          <button onClick={() => setShowTripNameModal(true)} className="text-left">
            <div className="text-[10px] tracking-[0.25em] text-amber-300/80 uppercase font-medium">Budget voyage</div>
            <h1 className="text-2xl mt-1 flex items-center gap-2" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{tripName}<Edit3 size={14} className="opacity-50" /></h1>
          </button>
          <div className="flex gap-1">
            <button onClick={() => setShowBackupModal(true)} title="Sauvegardes" className={`p-2 rounded-full transition relative ${needsBackup ? 'bg-amber-500 hover:bg-amber-600 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}>
              <Cloud size={16} />
              {needsBackup && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">!</span>}
            </button>
            <button onClick={() => setShowBudgetModal(true)} title="Budgets" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
              <Settings size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-3 border ${soldeCash < 0 ? 'bg-red-500/20 border-red-400/40' : 'bg-white/10 border-white/15'}`}>
            <div className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase opacity-80"><Wallet size={12} /> Solde espèces</div>
            <div className="text-xl font-semibold mt-1" style={{ fontFamily: 'Georgia, serif' }}>{fmt(soldeCash)}</div>
            <div className="text-[11px] opacity-60 mt-0.5">sur {fmt(totalCashAvailable)}</div>
          </div>
          <div className={`rounded-xl p-3 border ${soldeCard < 0 ? 'bg-red-500/20 border-red-400/40' : 'bg-white/10 border-white/15'}`}>
            <div className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase opacity-80"><CreditCard size={12} /> Solde carte</div>
            <div className="text-xl font-semibold mt-1" style={{ fontFamily: 'Georgia, serif' }}>{fmt(soldeCard)}</div>
            <div className="text-[11px] opacity-60 mt-0.5">sur {fmt(totalCardAvailable)}</div>
          </div>
        </div>

        {totalBudget > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] opacity-80 mb-1"><span>Dépensé au total</span><span className="font-medium">{fmt(totalSpent)} / {fmt(totalBudget)}</span></div>
            <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div className={`h-full ${totalSpent > totalBudget ? 'bg-red-400' : 'bg-amber-300'} transition-all`} style={{ width: Math.min(100, (totalSpent/totalBudget)*100) + '%' }} />
            </div>
          </div>
        )}

        {saveStatus && <div className="absolute top-3 right-24 text-[10px] flex items-center gap-1 bg-emerald-500/90 text-white px-2 py-0.5 rounded-full"><Check size={10} /> {saveStatus}</div>}
      </header>

      <nav className="sticky top-[185px] z-30 bg-stone-50 border-b border-stone-200 flex overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Accueil', icon: BarChart3 },
          { id: 'expenses', label: 'Dépenses', icon: Euro },
          { id: 'categories', label: 'Rubriques', icon: ChevronRight },
          { id: 'days', label: 'Par jour', icon: Calendar },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setView(t.id)} className={`flex-1 min-w-[80px] flex flex-col items-center gap-0.5 py-3 text-[11px] font-medium transition ${view === t.id ? 'text-slate-900 border-b-2 border-amber-500' : 'text-stone-500 border-b-2 border-transparent'}`}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </nav>

      <main className="px-4 py-5">
        {needsBackup && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4 flex items-center gap-3">
            <Cloud className="text-amber-600 flex-shrink-0" size={18} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-900">{expensesSinceLastExport} dépenses non sauvegardées</div>
              <div className="text-[11px] text-amber-700">Sauvegarde vers Drive pour sécuriser</div>
            </div>
            <button onClick={() => setShowBackupModal(true)} className="bg-amber-600 text-white text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap">Sauvegarder</button>
          </div>
        )}

        {totalBudget === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <div className="font-medium text-amber-900 text-sm">Définir les budgets</div>
              <div className="text-xs text-amber-800 mt-0.5 mb-2">Saisis le montant emmené en espèces et celui disponible sur carte.</div>
              <button onClick={() => setShowBudgetModal(true)} className="bg-amber-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">Saisir les budgets</button>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowTopUpModal(true)} className="bg-white border border-stone-200 rounded-xl p-3 text-left hover:border-amber-300 transition">
                <div className="text-[10px] uppercase tracking-wide text-amber-700 font-medium flex items-center gap-1"><Plus size={11} /> Recharger</div>
                <div className="text-xs text-stone-600 mt-0.5">Ajouter cash ou virement</div>
              </button>
              <button onClick={() => setShowBackupModal(true)} className="bg-white border border-stone-200 rounded-xl p-3 text-left hover:border-amber-300 transition">
                <div className="text-[10px] uppercase tracking-wide text-slate-700 font-medium flex items-center gap-1"><Cloud size={11} /> Sauvegarde</div>
                <div className="text-xs text-stone-600 mt-0.5">{lastExportInfo ? formatLastExport() : 'Jamais sauvegardé'}</div>
              </button>
            </div>

            <section className="bg-white rounded-xl p-4 border border-stone-200">
              <h3 className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-3 font-medium">Dépensé</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-stone-600"><Wallet size={12} /> Espèces</div>
                  <div className="text-lg font-semibold text-slate-900 mt-1" style={{ fontFamily: 'Georgia, serif' }}>{fmt(spentCash)}</div>
                  <div className="text-[10px] text-stone-500">{expenses.filter(e => e.mode === 'cash').length} dépenses</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-stone-600"><CreditCard size={12} /> Carte</div>
                  <div className="text-lg font-semibold text-slate-900 mt-1" style={{ fontFamily: 'Georgia, serif' }}>{fmt(spentCard)}</div>
                  <div className="text-[10px] text-stone-500">{expenses.filter(e => e.mode === 'card').length} dépenses</div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl p-4 border border-stone-200">
              <h3 className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-3 font-medium">Top rubriques</h3>
              {Object.entries(byCategory).filter(([, v]) => v.total > 0).sort((a, b) => b[1].total - a[1].total).slice(0, 5).map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: CATEGORIES[cat].color + '15' }}>{CATEGORIES[cat].icon}</div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{cat}</div>
                      <div className="text-[11px] text-stone-500">{totalSpent > 0 ? Math.round((data.total/totalSpent)*100) : 0}%</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>{fmt(data.total)}</div>
                </div>
              ))}
              {expenses.length === 0 && <div className="text-sm text-stone-400 text-center py-3">Aucune dépense</div>}
            </section>

            {topUps.length > 0 && (
              <section className="bg-white rounded-xl p-4 border border-stone-200">
                <h3 className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-3 font-medium">Recharges ({topUps.length})</h3>
                {topUps.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="text-base">{t.mode === 'cash' ? '💰' : '💳'}</div>
                      <div>
                        <div className="text-sm text-slate-900">{t.mode === 'cash' ? 'Espèces' : 'Carte'}</div>
                        {t.note && <div className="text-[11px] text-stone-500 italic">{t.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-emerald-700" style={{ fontFamily: 'Georgia, serif' }}>+{fmt(t.amount)}</div>
                      <button onClick={() => { if(confirm('Supprimer cette recharge ?')) deleteTopUp(t.id); }} className="p-1 text-stone-400 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section className="bg-white rounded-xl p-4 border border-stone-200">
              <h3 className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-3 font-medium">Récent</h3>
              {expenses.slice(0, 5).map(e => {
                const day = days.find(d => d.id === e.dayId);
                return (
                  <div key={e.id} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: (CATEGORIES[e.category]?.color || '#888') + '15' }}>{CATEGORIES[e.category]?.icon || '•'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{e.subcategory}</div>
                      <div className="text-[11px] text-stone-500 truncate">{day?.label} · {e.note || e.category}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold" style={{ fontFamily: 'Georgia, serif' }}>{fmt(e.amount)}</div>
                      <div className="text-[10px] text-stone-500 flex items-center gap-1 justify-end">
                        {e.mode === 'cash' ? <><Wallet size={9} /> Espèces</> : <><CreditCard size={9} /> Carte</>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {expenses.length === 0 && <div className="text-sm text-stone-400 text-center py-3">Aucune dépense</div>}
            </section>
          </div>
        )}

        {view === 'expenses' && (
          <div className="space-y-2">
            <div className="text-xs text-stone-500 mb-2">{expenses.length} dépense{expenses.length > 1 ? 's' : ''} · {fmt(totalSpent)}</div>
            {expenses.length === 0 && (
              <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
                <Euro className="mx-auto text-stone-300 mb-2" size={32} />
                <div className="text-sm text-stone-500">Aucune dépense pour le moment</div>
                <button onClick={() => setShowAddExpense(true)} className="mt-3 text-sm font-medium text-amber-700">+ Ajouter la première</button>
              </div>
            )}
            {expenses.map(e => {
              const day = days.find(d => d.id === e.dayId);
              return (
                <div key={e.id} className="bg-white rounded-xl p-3.5 border border-stone-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: (CATEGORIES[e.category]?.color || '#888') + '15' }}>{CATEGORIES[e.category]?.icon || '•'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{e.subcategory}</div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                      <span>{day?.label}</span><span>·</span>
                      <span className="flex items-center gap-0.5">{e.mode === 'cash' ? <><Wallet size={10} /> Espèces</> : <><CreditCard size={10} /> Carte</>}</span>
                    </div>
                    {e.note && <div className="text-[11px] text-stone-600 italic mt-0.5">{e.note}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-base font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>{fmt(e.amount)}</div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditExpense(e)} className="p-1 text-stone-400 hover:text-slate-900"><Edit3 size={13} /></button>
                      <button onClick={() => { if(confirm('Supprimer cette dépense ?')) deleteExpense(e.id); }} className="p-1 text-stone-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'categories' && (
          <div className="space-y-2">
            {Object.entries(byCategory).map(([cat, data]) => (
              <div key={cat} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <button onClick={() => setExpandedCats({ ...expandedCats, [cat]: !expandedCats[cat] })} className="w-full flex items-center gap-3 p-3.5 text-left">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: CATEGORIES[cat].color + '15' }}>{CATEGORIES[cat].icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{cat}</div>
                    <div className="text-[11px] text-stone-500"><Wallet size={9} className="inline" /> {fmt(data.cash)} · <CreditCard size={9} className="inline" /> {fmt(data.card)}</div>
                  </div>
                  <div className="text-right"><div className="text-base font-semibold" style={{ fontFamily: 'Georgia, serif' }}>{fmt(data.total)}</div></div>
                  {expandedCats[cat] ? <ChevronDown size={18} className="text-stone-400" /> : <ChevronRight size={18} className="text-stone-400" />}
                </button>
                {expandedCats[cat] && (
                  <div className="bg-stone-50 border-t border-stone-200">
                    {CATEGORIES[cat].sub.filter(s => data.sub[s].total > 0).map(s => (
                      <div key={s} className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200 last:border-0">
                        <div>
                          <div className="text-sm text-slate-900">{s}</div>
                          <div className="text-[10px] text-stone-500">{data.sub[s].count} × · Esp. {fmt(data.sub[s].cash)} · Carte {fmt(data.sub[s].card)}</div>
                        </div>
                        <div className="text-sm font-medium" style={{ fontFamily: 'Georgia, serif' }}>{fmt(data.sub[s].total)}</div>
                      </div>
                    ))}
                    {data.total === 0 && <div className="px-4 py-3 text-xs text-stone-400 italic">Aucune dépense</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'days' && (
          <div className="space-y-2">
            <button onClick={() => setShowDayManager(true)} className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-slate-900 font-medium flex items-center justify-center gap-2">
              <Calendar size={15} /> Gérer les jours ({days.length})
            </button>
            {days.map(d => {
              const dayData = byDay[d.id];
              const dayExp = expenses.filter(e => e.dayId === d.id);
              return (
                <div key={d.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="p-3.5 flex items-center justify-between border-b border-stone-100">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{d.label}</div>
                      {d.desc && <div className="text-[11px] text-stone-500 italic">{d.desc}</div>}
                      <div className="text-[11px] text-stone-500 mt-1">{dayExp.length} dépense{dayExp.length > 1 ? 's' : ''} · Esp. {fmt(dayData.cash)} · Carte {fmt(dayData.card)}</div>
                    </div>
                    <div className="text-base font-semibold" style={{ fontFamily: 'Georgia, serif' }}>{fmt(dayData.total)}</div>
                  </div>
                  {dayExp.length > 0 && (
                    <div className="bg-stone-50">
                      {dayExp.map(e => (
                        <div key={e.id} className="flex items-center gap-2.5 px-4 py-2 border-b border-stone-200 last:border-0">
                          <div className="text-base">{CATEGORIES[e.category]?.icon || '•'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-900">{e.subcategory}</div>
                            {e.note && <div className="text-[10px] text-stone-500 italic truncate">{e.note}</div>}
                          </div>
                          <div className="text-xs text-stone-500">{e.mode === 'cash' ? <Wallet size={10} className="inline" /> : <CreditCard size={10} className="inline" />}</div>
                          <div className="text-xs font-medium" style={{ fontFamily: 'Georgia, serif' }}>{fmt(e.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {view === 'dashboard' && (expenses.length > 0 || topUps.length > 0) && (
          <div className="mt-8 text-center">
            <button onClick={resetAll} className="text-[11px] text-stone-400 underline">Tout réinitialiser</button>
          </div>
        )}
      </main>

      <button onClick={() => setShowAddExpense(true)} className="fixed bottom-5 right-5 z-50 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-full w-14 h-14 shadow-xl flex items-center justify-center hover:scale-105 transition">
        <Plus size={26} />
      </button>

      {showTripNameModal && <TripNameModal current={tripName} onClose={() => setShowTripNameModal(false)} onSave={(n) => { setTripName(n); setShowTripNameModal(false); }} />}
      {showBudgetModal && <BudgetModal cash={budgetCash} card={budgetCard} onClose={() => setShowBudgetModal(false)} onSave={(c, cc) => { setBudgetCash(c); setBudgetCard(cc); setShowBudgetModal(false); }} />}
      {showTopUpModal && <TopUpModal onClose={() => setShowTopUpModal(false)} onSave={(mode, amount, note) => { addTopUp(mode, amount, note); setShowTopUpModal(false); }} />}
      {showAddExpense && <ExpenseModal days={days} onClose={() => setShowAddExpense(false)} onSave={(exp) => { addExpense(exp); setShowAddExpense(false); }} />}
      {editExpense && <ExpenseModal days={days} initial={editExpense} onClose={() => setEditExpense(null)} onSave={(exp) => { updateExpense(editExpense.id, exp); setEditExpense(null); }} />}
      {showDayManager && <DayManagerModal days={days} expenses={expenses} onClose={() => setShowDayManager(false)} onAdd={addDay} onUpdate={updateDay} onDelete={deleteDay} />}

      {showBackupModal && (
        <BackupModal
          lastExportInfo={lastExportInfo}
          formatLastExport={formatLastExport}
          unsavedCount={expensesSinceLastExport}
          tripName={tripName}
          generateBackupText={generateBackupText}
          markAsExported={markAsExported}
          importFromText={importFromText}
          onClose={() => setShowBackupModal(false)}
        />
      )}
    </div>
  );
}

// ============ BACKUP MODAL (copier/coller) ============
function BackupModal({ lastExportInfo, formatLastExport, unsavedCount, tripName, generateBackupText, markAsExported, importFromText, onClose }) {
  const [mode, setMode] = useState('menu'); // 'menu' | 'save' | 'restore'
  const [backupText, setBackupText] = useState('');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const textareaRef = useRef(null);

  const openSave = () => {
    setBackupText(generateBackupText());
    setMode('save');
    setCopied(false);
    setCopyError(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(backupText);
      setCopied(true);
      setCopyError(false);
      markAsExported();
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      // Fallback : sélectionner le texte dans la textarea
      setCopyError(true);
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }
  };

  const handleManualCopied = () => {
    markAsExported();
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setImportResult({ ok: false, error: 'Colle d\'abord le texte de sauvegarde' });
      return;
    }
    const res = importFromText(importText);
    setImportResult(res);
    if (res.ok) {
      setTimeout(() => { onClose(); }, 2000);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setImportText(text);
    } catch (e) {
      alert('Impossible d\'accéder au presse-papiers automatiquement. Colle manuellement (appui long dans la zone de texte → Coller).');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
              {mode === 'menu' ? 'Sauvegarde' : mode === 'save' ? 'Sauvegarder vers Drive' : 'Restaurer depuis Drive'}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {mode === 'menu' && 'Copie-colle ta sauvegarde dans Drive'}
              {mode === 'save' && 'Copie le texte et colle dans Google Drive'}
              {mode === 'restore' && 'Colle le texte depuis Drive'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400"><X size={18} /></button>
        </div>

        {/* ==== MENU ==== */}
        {mode === 'menu' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-2 flex items-center gap-1.5"><Clock size={11} /> Dernière sauvegarde</div>
              {lastExportInfo ? (
                <>
                  <div className="text-base font-medium text-slate-900">{formatLastExport()}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">{lastExportInfo.expenseCount} dépenses · {new Date(lastExportInfo.date).toLocaleString('fr-FR')}</div>
                  {unsavedCount > 0 && (
                    <div className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> {unsavedCount} nouvelle{unsavedCount > 1 ? 's' : ''} depuis
                    </div>
                  )}
                </>
              ) : <div className="text-sm text-stone-500">Aucune sauvegarde effectuée</div>}
            </div>

            <button onClick={openSave} className="w-full bg-slate-900 text-white rounded-xl p-4 flex items-center gap-3 hover:bg-slate-800 transition">
              <Copy size={20} />
              <div className="text-left flex-1">
                <div className="text-sm font-semibold">Sauvegarder (copier)</div>
                <div className="text-[11px] opacity-70">Copie le texte pour le coller dans Drive</div>
              </div>
            </button>

            <button onClick={() => { setMode('restore'); setImportResult(null); setImportText(''); }} className="w-full bg-white border-2 border-stone-200 text-slate-900 rounded-xl p-4 flex items-center gap-3 hover:border-slate-900 transition">
              <ClipboardPaste size={20} />
              <div className="text-left flex-1">
                <div className="text-sm font-semibold">Restaurer (coller)</div>
                <div className="text-[11px] text-stone-500">Recharge une sauvegarde depuis Drive</div>
              </div>
            </button>
          </div>
        )}

        {/* ==== SAVE ==== */}
        {mode === 'save' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5"><Cloud size={13} /> Mode d'emploi</div>
              <div><strong>1.</strong> Tape sur le bouton <strong>Copier le texte</strong> ci-dessous</div>
              <div><strong>2.</strong> Ouvre <strong>Google Drive</strong> sur ton iPhone</div>
              <div><strong>3.</strong> Tape sur <strong>+ Nouveau → Document Google Docs</strong></div>
              <div><strong>4.</strong> Appui long → <strong>Coller</strong></div>
              <div><strong>5.</strong> Nomme-le <em>"budget-{tripName}-{new Date().toISOString().slice(0,10)}"</em></div>
            </div>

            <button onClick={handleCopy} className={`w-full rounded-xl p-4 flex items-center gap-3 transition ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              {copied ? <><Check size={20} /> <span className="font-semibold">Copié ! Colle dans Drive</span></> : <><Copy size={20} /> <span className="font-semibold">Copier le texte</span></>}
            </button>

            {copyError && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900">
                Le presse-papiers automatique ne marche pas ici. <strong>Sélectionne tout le texte ci-dessous manuellement</strong> (appui long → Tout sélectionner → Copier), puis tape sur "J'ai copié".
              </div>
            )}

            <div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Texte à copier</div>
              <textarea
                ref={textareaRef}
                value={backupText}
                readOnly
                className="w-full h-48 bg-stone-50 border border-stone-200 rounded-xl p-3 text-[10px] font-mono resize-none"
                onClick={e => e.target.select()}
              />
              <div className="text-[10px] text-stone-400 mt-1">Tape dans la zone pour tout sélectionner</div>
            </div>

            {copyError && (
              <button onClick={handleManualCopied} className="w-full bg-emerald-600 text-white rounded-xl p-3 text-sm font-medium">
                J'ai copié le texte manuellement
              </button>
            )}

            <button onClick={() => setMode('menu')} className="w-full py-3 text-sm text-stone-600">← Retour</button>
          </div>
        )}

        {/* ==== RESTORE ==== */}
        {mode === 'restore' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5"><Cloud size={13} /> Mode d'emploi</div>
              <div><strong>1.</strong> Ouvre ton fichier de sauvegarde dans Google Drive</div>
              <div><strong>2.</strong> Sélectionne tout le texte → Copier</div>
              <div><strong>3.</strong> Reviens ici → Coller ci-dessous</div>
              <div><strong>4.</strong> Tape sur <strong>Restaurer</strong></div>
            </div>

            <button onClick={handlePaste} className="w-full bg-slate-900 text-white rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-medium">
              <ClipboardPaste size={16} /> Coller depuis presse-papiers
            </button>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500 font-medium mb-1.5">Ou colle manuellement (appui long → Coller)</div>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Colle ici le texte complet de ta sauvegarde..."
                className="w-full h-40 bg-stone-50 border border-stone-200 rounded-xl p-3 text-[10px] font-mono resize-none focus:border-amber-500 outline-none"
              />
            </div>

            {importResult && (
              <div className={`rounded-xl p-3 text-xs ${importResult.ok ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-red-50 border border-red-300 text-red-900'}`}>
                {importResult.ok ? (
                  <>
                    <div className="font-semibold flex items-center gap-1.5"><Check size={13} /> Import réussi !</div>
                    <div className="mt-1">
                      {importResult.summary.count} dépenses · {importResult.summary.name}<br/>
                      Du {new Date(importResult.summary.date).toLocaleString('fr-FR')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold flex items-center gap-1.5"><AlertCircle size={13} /> Erreur</div>
                    <div className="mt-1">{importResult.error}</div>
                  </>
                )}
              </div>
            )}

            {!importResult?.ok && (
              <button onClick={handleImport} disabled={!importText.trim()} className={`w-full rounded-xl p-4 text-sm font-semibold transition ${importText.trim() ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-400'}`}>
                Restaurer
              </button>
            )}

            <button onClick={() => setMode('menu')} className="w-full py-3 text-sm text-stone-600">← Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TripNameModal({ current, onClose, onSave }) {
  const [n, setN] = useState(current);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-100"><h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>Nom du voyage</h3></div>
        <div className="p-5">
          <input autoFocus type="text" value={n} onChange={e => setN(e.target.value)} placeholder="Côte Amalfitaine" className="w-full text-2xl border-b-2 border-stone-200 focus:border-amber-500 outline-none py-2" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }} />
        </div>
        <div className="p-4 bg-stone-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-stone-600">Annuler</button>
          <button onClick={() => onSave(n.trim() || 'Mon voyage')} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-900 text-white">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function BudgetModal({ cash, card, onClose, onSave }) {
  const [c, setC] = useState(cash); const [cc, setCc] = useState(card);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-100">
          <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>Budgets initiaux</h3>
          <p className="text-xs text-stone-500 mt-1">Modifiable à tout moment</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 flex items-center gap-1.5"><Wallet size={12} /> Emmené en espèces</label>
            <div className="relative">
              <input type="number" step="0.01" value={c === 0 ? '' : c} onChange={e => setC(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full text-2xl font-semibold border-b-2 border-stone-200 focus:border-amber-500 outline-none py-2 pr-10" style={{ fontFamily: 'Georgia, serif' }} />
              <span className="absolute right-0 top-3 text-stone-400">€</span>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 flex items-center gap-1.5"><CreditCard size={12} /> Disponible sur carte</label>
            <div className="relative">
              <input type="number" step="0.01" value={cc === 0 ? '' : cc} onChange={e => setCc(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full text-2xl font-semibold border-b-2 border-stone-200 focus:border-amber-500 outline-none py-2 pr-10" style={{ fontFamily: 'Georgia, serif' }} />
              <span className="absolute right-0 top-3 text-stone-400">€</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-stone-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-stone-600">Annuler</button>
          <button onClick={() => onSave(c, cc)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-slate-900 text-white">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function TopUpModal({ onClose, onSave }) {
  const [mode, setMode] = useState('cash'); const [amount, setAmount] = useState(''); const [note, setNote] = useState('');
  const canSave = amount && parseFloat(amount) > 0;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-100">
          <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>Recharger un solde</h3>
          <p className="text-xs text-stone-500 mt-1">Retrait DAB, virement reçu, autre ajout…</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Montant</label>
            <div className="relative">
              <input type="number" step="0.01" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-semibold border-b-2 border-stone-200 focus:border-amber-500 outline-none py-2 pr-10" style={{ fontFamily: 'Georgia, serif' }} />
              <span className="absolute right-0 top-3 text-stone-400 text-xl">€</span>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Ajouter à</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode('cash')} className={`py-3 rounded-xl border-2 transition flex items-center justify-center gap-2 text-sm font-medium ${mode === 'cash' ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-200 bg-white text-stone-600'}`}><Wallet size={16} /> Espèces</button>
              <button onClick={() => setMode('card')} className={`py-3 rounded-xl border-2 transition flex items-center justify-center gap-2 text-sm font-medium ${mode === 'card' ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-200 bg-white text-stone-600'}`}><CreditCard size={16} /> Carte</button>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Note (facultatif)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex : Retrait DAB Amalfi" className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-3 text-sm focus:border-amber-500 outline-none" />
          </div>
        </div>
        <div className="p-4 bg-stone-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-stone-600">Annuler</button>
          <button onClick={() => canSave && onSave(mode, parseFloat(amount), note.trim())} disabled={!canSave} className={`flex-1 py-3 rounded-xl text-sm font-medium text-white transition ${canSave ? 'bg-emerald-600' : 'bg-stone-300'}`}>Recharger</button>
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({ days, initial, onClose, onSave }) {
  const [amount, setAmount] = useState(initial?.amount || '');
  const [mode, setMode] = useState(initial?.mode || 'cash');
  const [category, setCategory] = useState(initial?.category || 'Alimentation');
  const [subcategory, setSubcategory] = useState(initial?.subcategory || CATEGORIES['Alimentation'].sub[0]);
  const [dayId, setDayId] = useState(initial?.dayId || days[0]?.id || 1);
  const [note, setNote] = useState(initial?.note || '');

  useEffect(() => {
    if (!CATEGORIES[category].sub.includes(subcategory)) setSubcategory(CATEGORIES[category].sub[0]);
  }, [category]);

  const canSave = amount && parseFloat(amount) > 0 && subcategory && dayId;
  const handleSave = () => { if (!canSave) return; onSave({ amount: parseFloat(amount), mode, category, subcategory, dayId, note: note.trim() }); };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-100 flex-shrink-0"><h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>{initial ? 'Modifier' : 'Nouvelle dépense'}</h3></div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Montant</label>
            <div className="relative">
              <input type="number" step="0.01" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full text-3xl font-semibold border-b-2 border-stone-200 focus:border-amber-500 outline-none py-2 pr-10" style={{ fontFamily: 'Georgia, serif' }} />
              <span className="absolute right-0 top-3 text-stone-400 text-xl">€</span>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Paiement</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode('cash')} className={`py-3 rounded-xl border-2 transition flex items-center justify-center gap-2 text-sm font-medium ${mode === 'cash' ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-200 bg-white text-stone-600'}`}><Wallet size={16} /> Espèces</button>
              <button onClick={() => setMode('card')} className={`py-3 rounded-xl border-2 transition flex items-center justify-center gap-2 text-sm font-medium ${mode === 'card' ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-200 bg-white text-stone-600'}`}><CreditCard size={16} /> Carte</button>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Rubrique</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-3 text-sm focus:border-amber-500 outline-none">
              {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{CATEGORIES[c].icon} {c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Sous-rubrique</label>
            <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-3 text-sm focus:border-amber-500 outline-none">
              {CATEGORIES[category].sub.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Jour</label>
            <select value={dayId} onChange={e => setDayId(parseInt(e.target.value))} className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-3 text-sm focus:border-amber-500 outline-none">
              {days.map(d => <option key={d.id} value={d.id}>{d.label}{d.desc ? ' · ' + d.desc : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-600 mb-1.5 block">Note (facultatif)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex : Pizzeria Da Michele" className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-3 text-sm focus:border-amber-500 outline-none" />
          </div>
        </div>
        <div className="p-4 bg-stone-50 flex gap-2 flex-shrink-0 border-t border-stone-100">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-stone-600">Annuler</button>
          <button onClick={handleSave} disabled={!canSave} className={`flex-1 py-3 rounded-xl text-sm font-medium text-white transition ${canSave ? 'bg-slate-900' : 'bg-stone-300'}`}>{initial ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}

function DayManagerModal({ days, expenses, onClose, onAdd, onUpdate, onDelete }) {
  const [newLabel, setNewLabel] = useState(''); const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState(null); const [editLabel, setEditLabel] = useState(''); const [editDesc, setEditDesc] = useState('');
  const handleAdd = () => { if (!newLabel.trim() && !newDesc.trim()) return; onAdd(newLabel.trim(), newDesc.trim()); setNewLabel(''); setNewDesc(''); };
  const startEdit = (d) => { setEditingId(d.id); setEditLabel(d.label); setEditDesc(d.desc); };
  const saveEdit = () => { onUpdate(editingId, editLabel, editDesc); setEditingId(null); };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-100 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>Jours du voyage</h3>
          <p className="text-xs text-stone-500 mt-1">Ajoute, modifie ou supprime un jour</p>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {days.map(d => {
            const count = expenses.filter(e => e.dayId === d.id).length;
            return (
              <div key={d.id} className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                {editingId === d.id ? (
                  <div className="space-y-2">
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Jour 1" className="w-full bg-white border border-stone-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-amber-500" />
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Arrivée à Naples" className="w-full bg-white border border-stone-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-amber-500" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 text-sm text-stone-600">Annuler</button>
                      <button onClick={saveEdit} className="flex-1 py-2 text-sm bg-slate-900 text-white rounded-lg">OK</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{d.label}</div>
                      {d.desc && <div className="text-xs text-stone-500 italic truncate">{d.desc}</div>}
                      <div className="text-[10px] text-stone-400">{count} dépense{count > 1 ? 's' : ''}</div>
                    </div>
                    <button onClick={() => startEdit(d)} className="p-2 text-stone-400"><Edit3 size={14} /></button>
                    {count === 0 && <button onClick={() => { if(confirm('Supprimer ce jour ?')) onDelete(d.id); }} className="p-2 text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
            );
          })}
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-3 space-y-2">
            <div className="text-xs uppercase tracking-wide text-stone-500 font-medium">Ajouter un jour</div>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Jour 3" className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-amber-500" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Visite Positano" className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-amber-500" />
            <button onClick={handleAdd} className="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Plus size={14} /> Ajouter</button>
          </div>
        </div>
        <div className="p-4 bg-stone-50 flex-shrink-0 border-t border-stone-100">
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-medium bg-slate-900 text-white">Fermer</button>
        </div>
      </div>
    </div>
  );
}
