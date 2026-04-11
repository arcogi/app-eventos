import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    Send, MessageCircle, RefreshCw, Eye, Search, X, MapPin, Calendar,
    Shirt, AlertCircle, Users, ChevronDown, UserPlus, CheckCircle2,
    HelpCircle, XCircle, Clock, Ticket
} from 'lucide-react';

const API = import.meta.env.DEV ? 'http://localhost:3001' : '';
const BASE_URL = typeof window !== 'undefined'
    ? (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin)
    : 'https://familia-rein.cloud';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface Guest {
    id: string;
    nome: string;
    apelido?: string;
    celular: string;
    sexo?: string;
    idade?: number;
    dependentes: number;
    status: string;           // STD: Confirmado | Recusado | Dúvida | Pendente
    status_envio?: string;    // STD envio: Enviado | Pendente | Erro
    status_convite?: string;  // Convite: pendente | enviado | aberto
    short_code?: string;
    sender_name?: string;
    artigo?: string;
    data_convite_enviado?: string;
}

interface InviteConfig {
    event_name?: string;
    event_date?: string;
    event_time?: string;
    event_location?: string;
    event_address?: string;
    event_location_map_url?: string;
    honoree_name?: string;
    dress_code?: string;
    message?: string;
    cover_image?: string;
    color_primary?: string;
    color_accent?: string;
    whatsapp_msg_template?: string;
}

// Cores e labels por status STD
const STD_STATUS: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    'Confirmado': { label: 'Confirmado', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 size={11} /> },
    'Dúvida': { label: 'Dúvida', bg: 'bg-amber-100', text: 'text-amber-700', icon: <HelpCircle size={11} /> },
    'Recusado': { label: 'Recusado', bg: 'bg-rose-100', text: 'text-rose-700', icon: <XCircle size={11} /> },
    'Pendente': { label: 'Pendente', bg: 'bg-slate-100', text: 'text-slate-500', icon: <Clock size={11} /> },
};

const CONVITE_STATUS: Record<string, { label: string; bg: string; text: string }> = {
    'pendente': { label: 'Não enviado', bg: 'bg-slate-100', text: 'text-slate-400' },
    'enviado': { label: 'Enviado', bg: 'bg-blue-100', text: 'text-blue-700' },
    'aberto': { label: 'Aberto', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    'confirmado': { label: '🎉 Confirmado', bg: 'bg-purple-100', text: 'text-purple-700' },
    'recusado': { label: '❌ Recusado', bg: 'bg-rose-100', text: 'text-rose-600' },
};

type FiltroSTD = 'todos' | 'Confirmado' | 'Dúvida' | 'Pendente' | 'Recusado' | 'nao_enviado_convite' | 'confirmado_convite';
type Tab = 'lista' | 'config' | 'festa';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PREVIEW IPHONE
// ─────────────────────────────────────────────────────────────────────────────
function ConvitePreview({ config }: { config: InviteConfig }) {
    const primary = config.color_primary || '#1e293b';
    const accent = config.color_accent || '#f59e0b';
    const formatDate = (d?: string) => d
        ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' })
        : '';

    return (
        <div className="flex flex-col items-center gap-3 sticky top-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Preview ao Vivo</p>
            <div className="w-[260px] h-[540px] bg-white rounded-[44px] border-[6px] border-slate-800 shadow-2xl overflow-hidden relative flex flex-col shrink-0">
                <div className="absolute top-0 inset-x-0 h-6 bg-black z-30 flex justify-center">
                    <div className="w-24 h-5 bg-black rounded-b-3xl" />
                </div>
                <div className="flex-1 overflow-y-auto mt-6" style={{ background: `linear-gradient(160deg, ${primary} 0%, #000 100%)` }}>
                    {config.cover_image
                        ? <div className="w-full h-24 overflow-hidden relative shrink-0">
                            <img src={`${API}/uploads/covers/${config.cover_image}`} alt="" className="w-full h-full object-cover opacity-75" />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />
                        </div>
                        : <div className="w-full h-12 shrink-0" style={{ background: `linear-gradient(135deg,${primary}99,${accent}44)` }} />}
                    <div className="px-4 pb-5 pt-3 space-y-3">
                        <div className="text-center">
                            <p className="text-[8px] font-black uppercase tracking-[0.25em] opacity-50" style={{ color: accent }}>
                                {config.honoree_name ? 'CONVITE ESPECIAL' : 'CONVITE PESSOAL'}
                            </p>
                            {config.honoree_name && (
                                <h1 className="text-xl font-black text-white tracking-tight mt-1 mb-1">{config.honoree_name}</h1>
                            )}
                            <h2 className="text-sm font-black text-white/80 tracking-tight">{config.event_name || 'Nome do Evento'}</h2>
                            <p className="text-white/50 text-[9px] px-2 leading-relaxed mt-0.5">{config.message || 'Sua mensagem aparece aqui...'}</p>
                        </div>
                        <div className="space-y-1.5">
                            {(config.event_date || config.event_time) && (
                                <div className="rounded-xl p-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <Calendar size={10} style={{ color: accent }} />
                                    <p className="text-white font-bold text-[9px]">
                                        {formatDate(config.event_date) || '—'}{config.event_time ? ` · ${config.event_time}` : ''}
                                    </p>
                                </div>
                            )}
                            {config.event_location && (
                                <div className="rounded-xl p-2 flex items-start gap-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <MapPin size={10} style={{ color: accent }} className="mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-white font-bold text-[9px] truncate">{config.event_location}</p>
                                        {config.event_address && (
                                            <p className="text-white/60 font-medium text-[8px] leading-tight mt-0.5">{config.event_address}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {config.dress_code && (
                                <div className="rounded-xl p-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <Shirt size={10} style={{ color: accent }} />
                                    <p className="text-white font-bold text-[9px]">{config.dress_code}</p>
                                </div>
                            )}
                        </div>
                        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-center text-[7px] font-black uppercase text-white/40 pt-1.5">QR Code de Entrada</p>
                            <div className="flex justify-center py-2">
                                <div className="bg-white p-1.5 rounded-lg">
                                    <QRCodeSVG value={`${BASE_URL}/convite/PREVIEW`} size={70} fgColor={primary} level="L" />
                                </div>
                            </div>
                            <div className="mx-2 mb-2 rounded-xl py-1.5 text-center text-[8px] font-black uppercase text-slate-900" style={{ background: accent }}>
                                📥 Salvar QR Code
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL NOVO CONVIDADO
// ─────────────────────────────────────────────────────────────────────────────
function ModalNovoConvidado({ onClose, onSaved, senders }: {
    onClose: () => void;
    onSaved: () => void;
    senders: string[];
}) {
    const token = localStorage.getItem('admin_token') || '';
    const [form, setForm] = useState({
        nome: '', apelido: '', celular: '', sexo: '', idade: '',
        dependentes: '0', sender_name: '', artigo: 'o'
    });
    const [saving, setSaving] = useState(false);
    const [erro, setErro] = useState('');

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/guests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    dependentes: Number(form.dependentes) || 0,
                    idade: form.idade ? Number(form.idade) : null,
                }),
            });
            const d = await res.json();
            if (res.ok) { onSaved(); onClose(); }
            else setErro(d.error || 'Erro ao cadastrar.');
        } catch { setErro('Erro de rede.'); }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Novo Convidado</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Entra directo na lista de convites</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Nome completo *', key: 'nome', ph: 'Ex: Maria Silva' },
                            { label: 'Como chamar', key: 'apelido', ph: 'Ex: Mari' },
                            { label: 'Celular (WhatsApp) *', key: 'celular', ph: 'Ex: 11999999999' },
                            { label: 'Idade', key: 'idade', ph: 'Ex: 35' },
                        ].map(f => (
                            <div key={f.key} className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</label>
                                <input value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)}
                                    placeholder={f.ph}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                            </div>
                        ))}

                        {/* Sexo */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sexo</label>
                            <select value={form.sexo} onChange={e => set('sexo', e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                                <option value="">Não informado</option>
                                <option value="M">Masculino</option>
                                <option value="F">Feminino</option>
                            </select>
                        </div>

                        {/* Dependentes */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dependentes</label>
                            <input type="number" min="0" max="10" value={form.dependentes} onChange={e => set('dependentes', e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                        </div>

                        {/* Remetente */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remetente (quem convida)</label>
                            {senders.length > 0
                                ? <select value={form.sender_name} onChange={e => set('sender_name', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                                    <option value="">Sem remetente</option>
                                    {senders.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                : <input value={form.sender_name} onChange={e => set('sender_name', e.target.value)}
                                    placeholder="Ex: Adriana"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />}
                        </div>

                        {/* Artigo */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Artigo do remetente</label>
                            <select value={form.artigo} onChange={e => set('artigo', e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                                <option value="o">o (masculino)</option>
                                <option value="a">a (feminino)</option>
                            </select>
                        </div>
                    </div>

                    {erro && <p className="text-sm text-rose-600 font-bold">{erro}</p>}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <><RefreshCw size={13} className="animate-spin" /> Salvando...</> : '✅ Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const FILTROS: { key: FiltroSTD; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'Confirmado', label: '✅ Confirmados STD' },
    { key: 'Dúvida', label: '🤔 Em Dúvida' },
    { key: 'Pendente', label: '⏳ Sem Resposta' },
    { key: 'Recusado', label: '❌ Recusados' },
    { key: 'nao_enviado_convite', label: '🎟️ Sem Convite' },
    { key: 'confirmado_convite', label: '🎉 Confirmaram Convite' },
];

export default function ModuloConvite() {
    const token = localStorage.getItem('admin_token') || '';
    const [tab, setTab] = useState<Tab>('lista');
    const [guests, setGuests] = useState<Guest[]>([]);
    const [config, setConfig] = useState<InviteConfig>({});
    const [senders, setSenders] = useState<string[]>([]);
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState<FiltroSTD>('Confirmado');
    const [filtroSender, setFiltroSender] = useState('');
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [showQR, setShowQR] = useState<Guest | null>(null);
    const [showNovoConvidado, setShowNovoConvidado] = useState(false);
    const [toast, setToast] = useState<{ msg: string; tipo: 'sucesso' | 'erro' | 'aviso' } | null>(null);
    const [saving, setSaving] = useState(false);
    const coverRef = useRef<HTMLInputElement>(null);
    // Festa ao Vivo
    const [festaData, setFestaData] = useState<{ presentes: any[]; totalPessoas: number; total: number } | null>(null);
    const festaInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    // Polling lista
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const listaInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const notify = useCallback((msg: string, tipo: 'sucesso' | 'erro' | 'aviso' = 'sucesso') => {
        setToast({ msg, tipo });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const fetchAll = useCallback(async () => {
        const [gRes, cfgRes, saRes] = await Promise.all([
            fetch(`${API}/api/guests`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/api/invite/config`),
            fetch(`${API}/api/sender-accounts`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (gRes.ok) setGuests(await gRes.json());
        if (cfgRes.ok) setConfig(await cfgRes.json());
        if (saRes.ok) {
            const sa = await saRes.json();
            setSenders([...new Set<string>(sa.map((s: { nome: string }) => s.nome).filter(Boolean))]);
        }
        setLastUpdated(new Date());
    }, [token]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Polling lista (60s enquanto na aba lista)
    useEffect(() => {
        if (tab === 'lista') {
            listaInterval.current = setInterval(fetchAll, 60000);
        } else {
            if (listaInterval.current) clearInterval(listaInterval.current);
        }
        return () => { if (listaInterval.current) clearInterval(listaInterval.current); };
    }, [tab, fetchAll]);

    // Polling Festa ao Vivo (30s enquanto tab festa estiver activa)
    const fetchFesta = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/checkin/presentes`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setFestaData(await res.json());
        } catch { /* silencioso */ }
    }, [token]);

    useEffect(() => {
        if (tab === 'festa') {
            fetchFesta();
            festaInterval.current = setInterval(fetchFesta, 30000);
        } else {
            if (festaInterval.current) clearInterval(festaInterval.current);
        }
        return () => { if (festaInterval.current) clearInterval(festaInterval.current); };
    }, [tab, fetchFesta]);

    // Filtros
    const guestsFiltrados = guests.filter(g => {
        const matchBusca = !busca
            || g.nome.toLowerCase().includes(busca.toLowerCase())
            || g.celular.includes(busca);
        const matchSender = !filtroSender || g.sender_name === filtroSender;
        let matchFiltro = true;
        if (filtro === 'Confirmado') matchFiltro = g.status === 'Confirmado';
        else if (filtro === 'Dúvida') matchFiltro = g.status === 'Dúvida';
        else if (filtro === 'Pendente') matchFiltro = g.status === 'Pendente' || !g.status;
        else if (filtro === 'Recusado') matchFiltro = g.status === 'Recusado';
        else if (filtro === 'nao_enviado_convite') matchFiltro = !g.status_convite || g.status_convite === 'pendente';
        else if (filtro === 'confirmado_convite') matchFiltro = g.status_convite === 'confirmado';
        return matchBusca && matchSender && matchFiltro;
    });

    // Contagens
    const counts: Record<FiltroSTD, number> = {
        todos: guests.length,
        Confirmado: guests.filter(g => g.status === 'Confirmado').length,
        Dúvida: guests.filter(g => g.status === 'Dúvida').length,
        Pendente: guests.filter(g => !g.status || g.status === 'Pendente').length,
        Recusado: guests.filter(g => g.status === 'Recusado').length,
        nao_enviado_convite: guests.filter(g => !g.status_convite || g.status_convite === 'pendente').length,
        confirmado_convite: guests.filter(g => g.status_convite === 'confirmado').length,
    };

    const sendInvite = async (guest: Guest) => {
        if (!guest.short_code) { notify('Convidado sem código. Actualize a lista.', 'erro'); return; }
        setSendingId(guest.id);
        try {
            const res = await fetch(`${API}/api/invite/send/${guest.id}`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` },
            });
            const d = await res.json();
            if (res.ok) {
                notify(d.message || `Convite enviado!`);
                // Actualiza localmente sem re-fetch completo
                setGuests(prev => prev.map(g => g.id === guest.id
                    ? { ...g, status_convite: 'enviado', data_convite_enviado: new Date().toISOString() }
                    : g));
            } else notify(d.error || 'Erro ao enviar.', res.status === 429 ? 'aviso' : 'erro');
        } catch { notify('Erro de rede.', 'erro'); }
        setSendingId(null);
    };

    const saveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/invite/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(config),
            });
            res.ok ? notify('Configurações salvas!') : notify('Erro ao salvar.', 'erro');
        } catch { notify('Erro de rede.', 'erro'); }
        setSaving(false);
    };

    const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('cover', file);
        try {
            const res = await fetch(`${API}/api/invite/cover`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
            });
            if (res.ok) { const d = await res.json(); setConfig(p => ({ ...p, cover_image: d.file })); notify('Capa actualizada!'); }
        } catch { notify('Erro no upload.', 'erro'); }
    };

    const stdInfo = (s?: string) => STD_STATUS[s || 'Pendente'] || STD_STATUS['Pendente'];
    const conviteInfo = (s?: string) => CONVITE_STATUS[s || 'pendente'] || CONVITE_STATUS['pendente'];

    // KPIs rápidos
    const kpis = [
        { label: 'Total', val: guests.length, cor: 'text-slate-700' },
        { label: 'Confirmados STD', val: counts['Confirmado'], cor: 'text-emerald-600' },
        { label: 'Em Dúvida', val: counts['Dúvida'], cor: 'text-amber-600' },
        { label: 'Sem Convite', val: counts['nao_enviado_convite'], cor: 'text-rose-600' },
        { label: '🎉 Confirmaram', val: counts['confirmado_convite'], cor: 'text-purple-600' },
        { label: '✅ Presentes', val: festaData?.total ?? 0, cor: 'text-emerald-700' },
    ];

    return (
        <div className="space-y-5">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl text-white text-sm font-black shadow-2xl animate-in slide-in-from-top-2 max-w-sm ${toast.tipo === 'erro' ? 'bg-rose-500' : toast.tipo === 'aviso' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Modais */}
            {showNovoConvidado && (
                <ModalNovoConvidado
                    onClose={() => setShowNovoConvidado(false)}
                    onSaved={fetchAll}
                    senders={senders}
                />
            )}
            {showQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowQR(null)}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center space-y-4 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowQR(null)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">QR Code do Convite</p>
                        <p className="font-black text-slate-900 text-xl">{showQR.nome}</p>
                        {showQR.sender_name && (
                            <span className="text-xs text-indigo-600 font-black bg-indigo-50 px-3 py-1 rounded-full inline-block">via {showQR.sender_name}</span>
                        )}
                        <div className="flex justify-center">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <QRCodeSVG value={`${BASE_URL}/convite/${showQR.short_code}`} size={180}
                                    fgColor={config.color_primary || '#1e293b'} level="M" />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono break-all bg-slate-50 p-2 rounded-lg">
                            {BASE_URL}/convite/{showQR.short_code}
                        </p>
                    </div>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {kpis.map(k => (
                    <div key={k.label} className="bg-white rounded-2xl p-3 shadow-sm">
                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest leading-tight">{k.label}</p>
                        <p className={`text-2xl font-black ${k.cor}`}>{k.val}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
                {([
                    { key: 'lista' as Tab, label: '🎟️ Lista de Convidados' },
                    { key: 'config' as Tab, label: '⚙️ Configurar Convite' },
                    { key: 'festa' as Tab, label: '🎉 Festa ao Vivo' },
                ] as const).map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === t.key
                            ? t.key === 'festa' ? 'bg-purple-600 shadow text-white' : 'bg-white shadow text-slate-900'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}>
                        {t.label}
                        {t.key === 'festa' && festaData && festaData.total > 0 && (
                            <span className="ml-1.5 bg-white/30 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black">
                                {festaData.total}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ─── TAB LISTA ─── */}
            {tab === 'lista' && (
                <div className="space-y-3">
                    {/* Alerta STD sem convite */}
                    {counts['nao_enviado_convite'] > 0 && filtro !== 'nao_enviado_convite' && (
                        <button onClick={() => setFiltro('nao_enviado_convite')}
                            className="w-full flex items-center gap-3 px-5 py-3.5 bg-rose-50 border border-rose-200 rounded-2xl hover:bg-rose-100 transition-all text-left">
                            <AlertCircle size={18} className="text-rose-500 shrink-0" />
                            <p className="font-black text-rose-700 text-sm flex-1">
                                {counts['nao_enviado_convite']} convidado{counts['nao_enviado_convite'] > 1 ? 's' : ''} ainda sem convite enviado
                            </p>
                            <span className="bg-rose-500 text-white px-3 py-1 rounded-xl text-xs font-black shrink-0">Ver →</span>
                        </button>
                    )}

                    {/* Controles */}
                    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                        {/* Filtros STD */}
                        <div className="flex items-center gap-1.5 p-3 border-b border-slate-100 overflow-x-auto no-scrollbar">
                            {FILTROS.map(f => (
                                <button key={f.key} onClick={() => setFiltro(f.key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filtro === f.key
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}>
                                    {f.label}
                                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${filtro === f.key ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                                        {counts[f.key]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Busca + sender + botão novo */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
                            <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                                <Search size={13} className="text-slate-400 shrink-0" />
                                <input value={busca} onChange={e => setBusca(e.target.value)}
                                    placeholder="Buscar por nome ou celular..."
                                    className="bg-transparent text-sm w-full outline-none" />
                                {busca && <button onClick={() => setBusca('')} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>}
                            </div>
                            {senders.length > 0 && (
                                <div className="relative">
                                    <select value={filtroSender} onChange={e => setFiltroSender(e.target.value)}
                                        className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-black text-slate-600 outline-none cursor-pointer">
                                        <option value="">Todos</option>
                                        {senders.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                {lastUpdated && (
                                    <span className="text-[9px] text-slate-400 font-bold hidden sm:block">
                                        🔄 {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                )}
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse hidden sm:block" title="Actualização automática a cada 60s" />
                                <button onClick={() => fetchAll()} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all" title="Actualizar agora">
                                    <RefreshCw size={13} />
                                </button>
                            </div>
                            <button onClick={() => setShowNovoConvidado(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all shrink-0">
                                <UserPlus size={13} /> Novo
                            </button>
                        </div>

                        {/* Header da tabela */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-5 py-2 bg-slate-50 border-b border-slate-100">
                            {['Convidado', 'STD', 'Convite', 'Remetente', ''].map(h => (
                                <span key={h} className="text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</span>
                            ))}
                        </div>

                        {/* Linhas */}
                        <div className="divide-y divide-slate-50">
                            {guestsFiltrados.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-sm font-bold">
                                    {guests.length === 0
                                        ? 'Nenhum convidado na base. Importe o Excel no módulo STD.'
                                        : 'Nenhum convidado para este filtro.'}
                                </div>
                            ) : guestsFiltrados.map(g => {
                                const std = stdInfo(g.status);
                                const conv = conviteInfo(g.status_convite);
                                const isSending = sendingId === g.id;
                                return (
                                    <div key={g.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-5 py-3 hover:bg-slate-50/60 transition-all group">

                                        {/* Nome */}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-black text-slate-900 text-sm leading-tight truncate">{g.nome}</p>
                                                {g.dependentes > 0 && (
                                                    <span className="text-[9px] font-black text-slate-400 flex items-center gap-0.5 shrink-0">
                                                        <Users size={9} />+{g.dependentes}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold truncate">{g.celular}</p>
                                        </div>

                                        {/* Badge STD */}
                                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide shrink-0 ${std.bg} ${std.text}`}>
                                            {std.icon} {std.label}
                                        </span>

                                        {/* Badge Convite */}
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide shrink-0 ${conv.bg} ${conv.text}`}>
                                            {conv.label}
                                        </span>

                                        {/* Remetente */}
                                        <span className="text-[9px] font-black text-indigo-500 shrink-0 min-w-0 max-w-[80px] truncate">
                                            {g.sender_name || '—'}
                                        </span>

                                        {/* Acções */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {g.short_code && (
                                                <button onClick={() => setShowQR(g)} title="Ver QR Code"
                                                    className="p-1.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all opacity-0 group-hover:opacity-100">
                                                    <Eye size={12} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => sendInvite(g)}
                                                disabled={!!sendingId}
                                                title={`Enviar convite via ${g.sender_name || 'WhatsApp'}`}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-[10px] font-black disabled:opacity-40 ${g.status_convite === 'enviado' || g.status_convite === 'aberto'
                                                    ? 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700'
                                                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                    }`}
                                            >
                                                {isSending
                                                    ? <RefreshCw size={11} className="animate-spin" />
                                                    : g.status_convite === 'enviado' || g.status_convite === 'aberto'
                                                        ? <><Send size={11} /> Reenviar</>
                                                        : <><MessageCircle size={11} /> {g.sender_name ? g.sender_name.split(' ')[0] : 'Enviar'}</>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        {guestsFiltrados.length > 0 && (
                            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                                <p className="text-[10px] text-slate-400 font-bold">{guestsFiltrados.length} convidado{guestsFiltrados.length > 1 ? 's' : ''}</p>
                                <p className="text-[10px] text-slate-400 font-bold">Hover → botão de envio aparece</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB FESTA AO VIVO ─── */}
            {tab === 'festa' && (
                <div className="space-y-4">
                    {/* KPIs presença */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Presentes', val: festaData?.total ?? 0, cor: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Total c/ Deps', val: festaData?.totalPessoas ?? 0, cor: 'text-purple-600', bg: 'bg-purple-50' },
                            { label: 'Confirmaram', val: counts['confirmado_convite'], cor: 'text-indigo-600', bg: 'bg-indigo-50' },
                        ].map(k => (
                            <div key={k.label} className={`${k.bg} rounded-2xl p-4 shadow-sm`}>
                                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{k.label}</p>
                                <p className={`text-3xl font-black ${k.cor}`}>{k.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Painel ao vivo */}
                    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                <p className="font-black text-slate-900 text-sm uppercase tracking-widest">Em Tempo Real</p>
                                <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">actualiza a cada 30s</span>
                            </div>
                            <button onClick={fetchFesta} className="p-1.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all">
                                <RefreshCw size={13} />
                            </button>
                        </div>

                        {/* Header */}
                        <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-6 py-2 bg-slate-50 border-b border-slate-100">
                            {['Convidado', 'Pessoas', 'Entrada'].map(h => (
                                <span key={h} className="text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</span>
                            ))}
                        </div>

                        {/* Linhas */}
                        <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                            {!festaData || festaData.presentes.length === 0 ? (
                                <div className="py-16 text-center space-y-2">
                                    <p className="text-4xl">🎪</p>
                                    <p className="text-slate-400 text-sm font-bold">Nenhum check-in ainda</p>
                                    <p className="text-slate-300 text-xs">Os convidados aparecerão aqui ao serem escaneados na entrada</p>
                                </div>
                            ) : festaData.presentes.map((p: any, i: number) => (
                                <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-6 py-3 hover:bg-slate-50/60 transition-all">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-black text-slate-300 w-5 shrink-0">#{i + 1}</span>
                                            <p className="font-black text-slate-900 text-sm truncate">{p.nome}</p>
                                        </div>
                                        {p.sender_name && (
                                            <p className="text-[10px] text-indigo-400 font-bold ml-6">via {p.sender_name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black">
                                            {p.total_pessoas} pessoa{p.total_pessoas > 1 ? 's' : ''}
                                        </span>
                                        {p.dependentes > 0 && (
                                            <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                                                <Users size={9} />+{p.dependentes}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold shrink-0 text-right">
                                        {p.data_checkin
                                            ? new Date(p.data_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                            : '—'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {festaData && festaData.presentes.length > 0 && (
                            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                                <p className="text-[10px] text-slate-400 font-bold">{festaData.total} convidado{festaData.total > 1 ? 's' : ''} presentes</p>
                                <p className="text-[10px] font-black text-emerald-600">{festaData.totalPessoas} pessoas no total</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB CONFIG ─── */}
            {tab === 'config' && (
                <div className="flex gap-6 items-start">
                    <div className="flex-1 bg-white rounded-3xl p-8 shadow-sm min-w-0">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Configurar Convite</h2>
                        <form onSubmit={saveConfig} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'Nome do Evento', field: 'event_name', type: 'text', ph: 'Ex: Festa de 50 Anos' },
                                    { label: 'Nome do Aniversariante (Destaque)', field: 'honoree_name', type: 'text', ph: 'Ex: João Silva' },
                                    { label: 'Data', field: 'event_date', type: 'date' },
                                    { label: 'Horário', field: 'event_time', type: 'text', ph: 'Ex: 20:00' },
                                    { label: 'Local (Nome)', field: 'event_location', type: 'text', ph: 'Ex: Salão Imperial' },
                                    { label: 'Endereço Completo', field: 'event_address', type: 'text', ph: 'Ex: Rua das Flores, 123 - Centro' },
                                    { label: 'Link Google Maps', field: 'event_location_map_url', type: 'url', ph: 'https://maps.google.com/...' },
                                    { label: 'Dress Code', field: 'dress_code', type: 'text', ph: 'Ex: Social / Black Tie' },
                                ].map(f => (
                                    <div key={f.field} className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</label>
                                        <input type={f.type} placeholder={(f as any).ph || ''}
                                            value={(config as any)[f.field] || ''}
                                            onChange={e => setConfig(p => ({ ...p, [f.field]: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400" />
                                    </div>
                                ))}
                                {(['color_primary', 'color_accent'] as const).map(f => (
                                    <div key={f} className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {f === 'color_primary' ? 'Cor Primária (fundo)' : 'Cor Destaque'}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={config[f] || (f === 'color_primary' ? '#1e293b' : '#f59e0b')}
                                                onChange={e => setConfig(p => ({ ...p, [f]: e.target.value }))}
                                                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                                            <span className="text-sm font-mono text-slate-500">{config[f] || (f === 'color_primary' ? '#1e293b' : '#f59e0b')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mensagem do Convite</label>
                                <textarea value={config.message || ''} rows={3}
                                    onChange={e => setConfig(p => ({ ...p, message: e.target.value }))}
                                    placeholder="Texto que aparece na página do convidado..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template WhatsApp</label>
                                <textarea value={config.whatsapp_msg_template || ''} rows={5}
                                    onChange={e => setConfig(p => ({ ...p, whatsapp_msg_template: e.target.value }))}
                                    placeholder="Deixe vazio para usar o template padrão&#10;Variáveis: {{nome}} {{intro}} {{event_name}} {{event_location}} {{event_date}} {{dress_code}} {{link}}"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
                                <p className="text-[10px] text-indigo-500 font-bold">
                                    {'{{intro}}'} → "a Adriana tem" / "o Carlos tem" (preenchido automaticamente pelo remetente do convidado)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagem de Capa</label>
                                <div className="flex items-center gap-3">
                                    {config.cover_image && (
                                        <img src={`${API}/uploads/covers/${config.cover_image}`} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                                    )}
                                    <div className="space-y-1">
                                        <button type="button" onClick={() => coverRef.current?.click()}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase transition-all">
                                            📷 {config.cover_image ? 'Trocar' : 'Selecionar'} imagem
                                        </button>
                                        <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                                            Horizontal · 1200×600 px · proporção 2:1<br />
                                            JPG ou WebP · máx 2 MB · evite texto nas bordas
                                        </p>
                                    </div>
                                    <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} className="hidden" />
                                </div>
                            </div>

                            <button type="submit" disabled={saving}
                                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2">
                                {saving ? <><RefreshCw size={13} className="animate-spin" />Salvando...</> : '💾 Salvar Configurações'}
                            </button>
                        </form>
                    </div>
                    <ConvitePreview config={config} />
                </div>
            )}
        </div>
    );
}
