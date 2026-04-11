import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Users } from 'lucide-react';

const API = import.meta.env.DEV ? 'http://localhost:3001' : '';

interface CheckinResult {
    success: boolean;
    already_checked_in?: boolean;
    guest?: {
        nome: string;
        apelido: string;
        dependentes: number;
        status: string;
        checkin_count: number;
    };
    message?: string;
    error?: string;
}

interface CheckinStats {
    total_esperado: number;
    total_com_deps: number;
    total_presentes: number;
    presentes_com_deps: number;
    ainda_ausentes: number;
}

interface CheckinLogEntry {
    created_at: string;
    scanned_by: string;
    nome: string;
    apelido: string;
    dependentes: number;
    status: string;
    checkin_count: number;
}

// ── Cartão de Resultado pós-scan ────────────────────────────────────────────
function ResultCard({
    result,
    onNext,
}: {
    result: CheckinResult;
    onNext: () => void;
}) {
    if (!result.success) {
        return (
            <div className="rounded-3xl p-8 text-center space-y-4 bg-rose-50 border border-rose-200">
                <XCircle size={56} className="text-rose-500 mx-auto" />
                <div>
                    <p className="font-black text-xl text-rose-700">QR inválido</p>
                    <p className="text-rose-600 font-bold text-sm mt-1">{result.error}</p>
                </div>
                <button onClick={onNext}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                    Tentar novamente →
                </button>
            </div>
        );
    }

    const { guest } = result;
    const totalPessoas = (guest?.dependentes ?? 0) + 1;
    const temDependentes = (guest?.dependentes ?? 0) > 0;
    const reentrada = result.already_checked_in;

    return (
        <div className={`rounded-3xl overflow-hidden border-2 ${reentrada ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'
            }`}>
            {/* Header de status */}
            <div className={`px-6 py-4 flex items-center gap-3 ${reentrada ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>
                {reentrada
                    ? <AlertTriangle size={24} className="text-white shrink-0" />
                    : <CheckCircle size={24} className="text-white shrink-0" />}
                <div className="text-white">
                    <p className="font-black text-base leading-tight">
                        {reentrada ? '⚠️ Reentrada registada' : '✅ Entrada confirmada'}
                    </p>
                    {reentrada && (
                        <p className="text-white/80 text-xs font-bold">
                            Esta pessoa já entrou {(guest?.checkin_count ?? 1) - 1}× antes
                        </p>
                    )}
                </div>
            </div>

            {/* Corpo */}
            <div className="p-6 space-y-4">
                {/* Nome */}
                <div className="text-center space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Convidado</p>
                    <p className="text-3xl font-black text-slate-900 leading-tight">
                        {guest?.apelido || guest?.nome}
                    </p>
                    {guest?.apelido && guest?.nome !== guest?.apelido && (
                        <p className="text-slate-500 text-sm font-bold">{guest?.nome}</p>
                    )}
                </div>

                {/* ── DESTAQUE DE PESSOAS ── */}
                <div className={`rounded-2xl p-5 text-center ${temDependentes ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Users size={20} className="text-white/70" />
                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">
                            TOTAL DE PESSOAS NESTE QR
                        </p>
                    </div>

                    {/* Número gigante de pessoas */}
                    <p className="text-7xl font-black text-white leading-none">
                        {totalPessoas}
                    </p>
                    <p className="text-white/60 text-sm font-bold mt-1">
                        pessoa{totalPessoas > 1 ? 's' : ''} na entrada
                    </p>

                    {/* Breakdown se tem dependentes */}
                    {temDependentes && (
                        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                            <span className="bg-white/20 text-white px-3 py-1 rounded-xl text-xs font-black">
                                👤 1 titular
                            </span>
                            <span className="text-white/40 text-xs">+</span>
                            <span className="bg-white/20 text-white px-3 py-1 rounded-xl text-xs font-black">
                                👥 {guest?.dependentes} acompanhante{(guest?.dependentes ?? 0) > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>

                {/* RSVP status */}
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white rounded-2xl p-3 border border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">RSVP</p>
                        <p className="font-black text-slate-700 text-sm mt-0.5">{guest?.status}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 border border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Check-ins</p>
                        <p className="font-black text-slate-700 text-sm mt-0.5">#{guest?.checkin_count}</p>
                    </div>
                </div>

                {/* Botão próximo */}
                <button onClick={onNext}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all active:scale-95 ${reentrada ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
                        }`}>
                    Próximo →
                </button>
            </div>
        </div>
    );
}

// ── Módulo Principal Check-in ────────────────────────────────────────────────
export default function ModuloCheckin() {
    const [tab, setTab] = useState<'scanner' | 'painel'>('painel');
    const [stats, setStats] = useState<CheckinStats | null>(null);
    const [log, setLog] = useState<CheckinLogEntry[]>([]);
    const [scanResult, setScanResult] = useState<CheckinResult | null>(null);
    const [scanning, setScanning] = useState(false);
    const [operador, setOperador] = useState('operador');
    const [loadingCheckin, setLoadingCheckin] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const token = localStorage.getItem('admin_token') || '';

    const fetchStats = useCallback(async () => {
        const [stRes, logRes] = await Promise.all([
            fetch(`${API}/api/checkin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/api/checkin/log?limit=20`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (stRes.ok) setStats(await stRes.json());
        if (logRes.ok) setLog(await logRes.json());
    }, [token]);

    useEffect(() => {
        fetchStats();
        const iv = setInterval(fetchStats, 5000);
        return () => clearInterval(iv);
    }, [fetchStats]);

    useEffect(() => {
        return () => {
            if (scannerRef.current) scannerRef.current.stop().catch(() => { });
        };
    }, []);

    const doCheckin = async (code: string) => {
        setLoadingCheckin(true);
        try {
            const res = await fetch(`${API}/api/checkin/${code}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ scanned_by: operador, device_info: navigator.userAgent }),
            });
            const data = await res.json();
            setScanResult(res.ok ? data : { success: false, error: data.error || 'Erro ao registar check-in.' });
            fetchStats();
        } catch {
            setScanResult({ success: false, error: 'Erro de conexão.' });
        }
        setLoadingCheckin(false);
    };

    const startScanner = async () => {
        setScanning(true);
        setScanResult(null);
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode('qr-reader');
                scannerRef.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 260, height: 260 } },
                    async (decodedText) => {
                        const parts = decodedText.split('/');
                        const code = parts[parts.length - 1].toUpperCase();
                        await scanner.stop();
                        scannerRef.current = null;
                        setScanning(false);
                        await doCheckin(code);
                    },
                    () => { }
                );
            } catch {
                setScanning(false);
                setScanResult({ success: false, error: 'Não foi possível aceder à câmera. Verifique as permissões.' });
            }
        }, 200);
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch { }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const handleNext = () => {
        setScanResult(null);
        startScanner();
    };

    const progressPercent = stats
        ? Math.round((Number(stats.total_presentes) / Math.max(Number(stats.total_esperado), 1)) * 100)
        : 0;

    return (
        <div className="space-y-5">
            {/* Sub-tabs */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
                {(['painel', 'scanner'] as const).map(t => (
                    <button key={t}
                        onClick={() => { setTab(t); if (t !== 'scanner') stopScanner(); }}
                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                        {t === 'painel' ? '📊 Painel ao Vivo' : '📷 Scanner QR'}
                    </button>
                ))}
            </div>

            {/* ─── Painel ao Vivo ─── */}
            {tab === 'painel' && (
                <div className="space-y-4">
                    {/* Mega KPI Dual */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 rounded-3xl p-6 text-white">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Convidados presentes</p>
                            <p className="text-6xl font-black leading-none mt-1">{stats?.total_presentes ?? '—'}</p>
                            <p className="text-white/40 text-xs font-bold mt-1">de {stats?.total_esperado ?? '—'} esperados</p>
                            <div className="h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                                    style={{ width: `${progressPercent}%` }} />
                            </div>
                            <p className="text-emerald-400 text-xs font-black mt-1">{progressPercent}% presença</p>
                        </div>

                        {/* Destaque: pessoas totais (com dependentes) */}
                        <div className="bg-indigo-600 rounded-3xl p-6 text-white">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60 flex items-center gap-1">
                                <Users size={11} /> Pessoas na festa
                            </p>
                            <p className="text-6xl font-black leading-none mt-1">{stats?.presentes_com_deps ?? '—'}</p>
                            <p className="text-white/60 text-xs font-bold mt-1">
                                titulares + acompanhantes
                            </p>
                            <div className="mt-3 text-xs font-black text-white/70">
                                Total esperado com acomp.: {stats?.total_com_deps ?? '—'}
                            </div>
                        </div>
                    </div>

                    {/* KPI Ausentes */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-amber-50 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Ainda ausentes</p>
                            <p className="text-3xl font-black text-amber-600">{stats?.ainda_ausentes ?? '—'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <RefreshCw size={11} className="text-slate-400" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Actualizado a cada 5s
                                </p>
                            </div>
                            <button onClick={fetchStats} className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-all">
                                Actualizar agora →
                            </button>
                        </div>
                    </div>

                    {/* Log recente */}
                    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Entradas Recentes</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {log.length === 0 ? (
                                <p className="p-6 text-center text-slate-400 text-sm">Nenhum check-in ainda.</p>
                            ) : log.map((entry, i) => {
                                const totalPessoas = 1 + (entry.dependentes || 0);
                                return (
                                    <div key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50/50 transition-all">
                                        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-black text-xs shrink-0">
                                            {(entry.apelido || entry.nome)[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-900 text-sm leading-tight">{entry.apelido || entry.nome}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">
                                                {new Date(entry.created_at).toLocaleTimeString('pt-BR', {
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                })}
                                            </p>
                                        </div>

                                        {/* Destaque de pessoas no log */}
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${entry.dependentes > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            <Users size={11} />
                                            <span className="text-xs font-black">{totalPessoas}</span>
                                            {entry.dependentes > 0 && (
                                                <span className="text-[9px] font-bold opacity-70">(+{entry.dependentes})</span>
                                            )}
                                        </div>

                                        {entry.checkin_count > 1 && (
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase">
                                                #{entry.checkin_count}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Scanner QR ─── */}
            {tab === 'scanner' && (
                <div className="space-y-4">
                    {/* Operador */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Operador</p>
                        <input value={operador} onChange={e => setOperador(e.target.value)}
                            placeholder="Nome do operador..."
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-400" />
                    </div>

                    {/* Câmera */}
                    {!scanResult && !loadingCheckin && (
                        <div className="bg-slate-900 rounded-3xl overflow-hidden">
                            <div id="qr-reader" className={scanning ? 'block' : 'hidden'} style={{ width: '100%' }} />
                            {!scanning && (
                                <div className="flex flex-col items-center justify-center py-16 space-y-4 text-white">
                                    <div className="w-24 h-24 border-4 border-dashed border-white/30 rounded-3xl flex items-center justify-center text-5xl">
                                        📷
                                    </div>
                                    <p className="text-white/50 text-sm font-bold">Câmera inativa</p>
                                    <button onClick={startScanner}
                                        className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95">
                                        Iniciar Scanner
                                    </button>
                                </div>
                            )}
                            {scanning && (
                                <div className="p-4 text-center">
                                    <p className="text-white/60 text-xs font-bold mb-3">Aponte a câmera ao QR Code do convite</p>
                                    <button onClick={stopScanner}
                                        className="px-6 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-black text-xs uppercase tracking-widest">
                                        Parar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading */}
                    {loadingCheckin && (
                        <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
                            <RefreshCw size={36} className="animate-spin text-slate-400 mx-auto" />
                            <p className="text-slate-500 text-sm font-bold mt-4">Registando check-in...</p>
                        </div>
                    )}

                    {/* Resultado */}
                    {scanResult && !loadingCheckin && (
                        <ResultCard result={scanResult} onNext={handleNext} />
                    )}
                </div>
            )}
        </div>
    );
}
