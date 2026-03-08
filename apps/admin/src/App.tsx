import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import {
  Settings, Users, Save, CheckCircle, Clock, Plus,
  Send, Phone, User as UserIcon, Heart, AlertCircle,
  Eye, X, Search, Edit3, RotateCcw, Zap, MessageCircle,
  QrCode, RefreshCw, RefreshCcw, Video, AlertTriangle,
  LayoutDashboard, Check, Trash2
} from 'lucide-react';

const API = import.meta.env.DEV ? 'http://localhost:3001' : '';

interface EventConfig {
  title: string;
  subtitle: string;
  video_file: string;
  btn_confirm_text: string;
  btn_doubt_text: string;
  btn_decline_text: string;
  msg_success_confirm: string;
  msg_success_doubt?: string;
  msg_success_decline?: string;
  footer_text?: string;
  event_name?: string;
  honorees?: string;
  slogan?: string;
  event_date?: string;
  confirmation_deadline?: string;
}

interface Guest {
  id: string;
  nome: string;
  apelido?: string;
  celular: string;
  idade: string;
  sexo: string;
  dependentes: number;
  status: string;
  status_envio?: string;
  data_resposta?: string;
  data_envio?: string;
}

// ── Simulador de iPhone ─────────────────────────────────────────────────────
function IPhoneSimulator({ config, onClose }: { config: EventConfig; onClose: () => void }) {
  const [simRsvp, setSimRsvp] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showRSVP, setShowRSVP] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
          <X size={16} /> Fechar Simulador
        </button>

        <div className="w-[375px] h-[750px] bg-white text-slate-800 rounded-[48px] border-[6px] border-slate-800 shadow-2xl overflow-hidden relative flex flex-col">
          <div className="absolute top-0 inset-x-0 h-7 bg-black z-30 flex justify-center">
            <div className="w-32 h-6 bg-black rounded-b-3xl"></div>
          </div>

          <div className={`bg-black relative flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-in-out shrink-0 ${config.video_file && !videoEnded ? 'h-[350px]' : 'aspect-video'}`}>
            {config.video_file ? (
              <video
                src={`${API}/uploads/videos/${config.video_file}`}
                className="absolute inset-0 w-full h-full object-cover z-0"
                controls autoPlay playsInline
                onEnded={() => setVideoEnded(true)}
                onError={() => setVideoEnded(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 z-10 w-full h-full justify-center bg-slate-100">
                <Eye size={32} />
                <span className="text-xs font-bold uppercase tracking-widest">Sem vídeo</span>
              </div>
            )}

            {config.video_file && (
              <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-12 pb-5 px-4 z-20 text-center transition-all duration-700 pointer-events-none ${!videoEnded ? 'animate-pulse' : 'opacity-0'}`}>
                <p className="text-white text-[10px] uppercase font-black tracking-widest drop-shadow-md">
                  Assista o vídeo até o final e confirme sua presença
                </p>
              </div>
            )}
          </div>

          <div className={`flex-1 p-6 space-y-4 overflow-y-auto transition-all duration-700 ${config.video_file && !videoEnded ? 'opacity-40 grayscale blur-[1px]' : 'opacity-100 grayscale-0 blur-0'}`}>
            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">Save the Date</p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{config.title || 'Título do Evento'}</h1>
              <p className="text-slate-500 text-sm leading-relaxed px-2 font-medium">{config.subtitle || 'Subtítulo aqui'}</p>
            </div>

            {!simRsvp ? (
              <div className="space-y-3 pt-4 flex flex-col">
                {!showRSVP ? (
                  <button onClick={() => setShowRSVP(true)} disabled={!!config.video_file && !videoEnded} className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${videoEnded || !config.video_file ? 'bg-slate-900 text-white shadow-xl hover:scale-[1.02] active:scale-95' : 'bg-slate-50 text-slate-400 border-2 border-dashed border-slate-200 disabled:opacity-50'}`}>
                    Por favor, confirme sua presença
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <button onClick={() => setSimRsvp('confirmado')} className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 text-white shadow-xl hover:scale-[1.02] active:scale-95">
                      <CheckCircle size={16} /> {config.btn_confirm_text || 'Confirmar Presença'}
                    </button>
                    <button onClick={() => setSimRsvp('duvida')} className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-amber-400 hover:bg-amber-500 shadow-amber-200 text-white shadow-xl hover:scale-[1.02] active:scale-95">
                      <AlertCircle size={16} /> {config.btn_doubt_text || 'Com dúvida'}
                    </button>
                    <button onClick={() => setSimRsvp('recusado')} className="w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-slate-900 hover:bg-black shadow-slate-300 text-white shadow-xl hover:scale-[1.02] active:scale-95">
                      <X size={16} /> {config.btn_decline_text || 'Não posso ir'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center pt-6 space-y-4 animate-in zoom-in duration-300">
                {simRsvp === 'confirmado' && <CheckCircle size={40} className="text-emerald-500 mx-auto" />}
                {simRsvp === 'duvida' && <AlertCircle size={40} className="text-amber-500 mx-auto" />}
                {simRsvp === 'recusado' && <X size={40} className="text-rose-500 mx-auto" />}

                <p className="font-bold text-slate-700 text-sm leading-relaxed px-4">
                  {simRsvp === 'confirmado' ? (config.msg_success_confirm || 'Confirmado!') :
                    simRsvp === 'duvida' ? (config.msg_success_doubt || 'Anotado!') :
                      (config.msg_success_decline || 'Que pena!')}
                </p>
                <button onClick={() => setSimRsvp(null)} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors pt-4 flex items-center gap-1 mx-auto">
                  <RefreshCw size={12} /> recomeçar
                </button>
              </div>
            )}
          </div>

          <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-40">
            <div className="w-32 h-1 bg-slate-900 rounded-full opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Linha editável na tabela ─────────────────────────────────────────────────
function GuestRow({ guest, onSendWhatsApp, onDelete, onRefresh }: { guest: Guest; onSendWhatsApp: (g: Guest) => void; onDelete: (g: Guest) => void; onRefresh: () => void; }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ nome: guest.nome, apelido: guest.apelido || '', celular: guest.celular });

  const saveEdit = async () => {
    try {
      await fetch(`${API}/api/guests/${guest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
    } catch { }
    setEditing(false);
    onRefresh();
  };

  const statusColor = guest.status === 'Confirmado' ? 'bg-emerald-100 text-emerald-700'
    : guest.status === 'Recusado' ? 'bg-rose-100 text-rose-700'
      : guest.status === 'Duvida' ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-500';

  const dispStatusColor = guest.status_envio === 'Erro' ? 'bg-rose-100 text-rose-700'
    : guest.status_envio === 'Enviado' ? 'bg-blue-100 text-blue-700'
      : 'bg-slate-100 text-slate-400';

  return (
    <tr className="hover:bg-slate-50/80 transition-all group border-b border-slate-100 last:border-0">
      <td className="px-6 py-5">
        {editing ? (
          <div className="flex flex-col md:flex-row bg-slate-50 p-3 rounded-2xl gap-3 items-center border border-slate-200">
            <div className="flex-1 w-full space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400 ml-1">Nome Completo</label>
              <input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} className="w-full px-4 py-2 bg-white rounded-xl text-sm font-bold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div className="w-full md:w-48 space-y-1">
              <label className="text-[9px] uppercase font-black text-rose-400 ml-1">Apelido Privado</label>
              <input value={draft.apelido} onChange={(e) => setDraft({ ...draft, apelido: e.target.value })} className="w-full px-4 py-2 bg-rose-50 rounded-xl text-sm font-bold border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 text-rose-600" />
            </div>
            <div className="w-full md:w-48 space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400 ml-1">WhatsApp</label>
              <input value={draft.celular} onChange={(e) => setDraft({ ...draft, celular: e.target.value })} className="w-full px-4 py-2 bg-white rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div className="flex gap-2 self-end">
              <button onClick={saveEdit} className="px-5 py-2 h-[38px] bg-slate-900 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-800 transition-colors">Salvar</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 h-[38px] bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-bold transition-colors">X</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <UserIcon size={18} />
            </div>
            <div>
              <div className="font-black text-slate-900 leading-tight flex items-center gap-2">
                {guest.nome}
                {guest.apelido && guest.apelido !== guest.nome && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[9px] rounded-lg tracking-widest uppercase italic">"{guest.apelido}"</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                <Phone size={9} className="text-emerald-500" /> {guest.celular}
                <span className="ml-1 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md">DEPS: {guest.dependentes || 0}</span>
              </div>
            </div>
          </div>
        )}
      </td>

      <td className="px-4 py-5 font-bold">
        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${statusColor}`}>
          RSVP: {guest.status}
        </span>
        {guest.data_resposta && (
          <div className="text-[8px] text-slate-400 font-bold mt-1 uppercase">
            {new Date(guest.data_resposta).toLocaleDateString()}
          </div>
        )}
      </td>

      <td className="px-4 py-5 font-bold hidden md:table-cell">
        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${dispStatusColor}`}>
          <Send size={10} /> {guest.status_envio || 'Pendente'}
        </div>
      </td>

      <td className="px-6 py-5 text-right w-32">
        {!editing && (
          <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all" title="Editar">
              <Edit3 size={14} />
            </button>
            <button onClick={() => onDelete(guest)} className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 transition-all" title="Excluir">
              <Trash2 size={14} />
            </button>
            <button onClick={() => onSendWhatsApp(guest)} className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition-all" title="Enviar Whats manually">
              <MessageCircle size={14} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Overlay de Disparo Global ─────────────────────────────────────────────────
function DisparoOverlay({ guests, onClose, onRefresh }: { guests: Guest[]; onClose: () => void; onRefresh: () => void; }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const pendentes = useMemo(() => guests.filter(g => (g.status_envio || 'Pendente') === 'Pendente' || g.status_envio === 'Erro'), [guests]);

  const [running, setRunning] = useState(false);

  const startBatch = async () => {
    if (running || done || pendentes.length === 0) return;
    setRunning(true);
    let currentStep = step;

    while (currentStep < pendentes.length) {
      const g = pendentes[currentStep];
      // O nome que vai no texto do excel é do apelido
      const apelido = g.apelido || g.nome;
      const textDep = g.dependentes && g.dependentes > 0 ? ` e leve seu(s) ${g.dependentes} dependente(s)` : '';
      const msg = `Olá *${apelido}*! 🎉\n\nTemos uma notícia especial para ti${textDep}.\n\n🎬 Assiste até ao fim e confirma a tua presença:\n👉 https://familia-rein.cloud/c/${g.id}`;

      try {
        await fetch(`${API}/api/whatsapp/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId: g.id, phone: g.celular, message: msg })
        });
      } catch { }

      currentStep++;
      setStep(currentStep);

      // Delay to avoid spamming the mocked API
      await new Promise(r => setTimeout(r, 1000));
    }

    setDone(true);
    setRunning(false);
  };

  const finish = () => { onRefresh(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm" onClick={finish}>
      <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-4 mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Zap size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Fila de Disparo</h3>
          <p className="text-slate-500 text-sm font-medium">
            {done ? 'Fila concluída.' : `Disparando para ${pendentes.length} pendentes`}
          </p>
        </div>

        <div className="h-3 bg-slate-100 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500 relative" style={{ width: pendentes.length ? `${(step / pendentes.length) * 100}%` : '100%' }}>
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {done || pendentes.length === 0 ? (
          <div className="text-center space-y-4 animate-in zoom-in duration-300">
            <CheckCircle size={48} className="text-emerald-500 mx-auto" />
            <p className="font-black text-slate-900 text-lg uppercase">Operação Concluída!</p>
            <button onClick={finish} className="mt-4 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Encerrar</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-200 text-indigo-700 rounded-xl flex items-center justify-center shrink-0 font-black text-lg">{step + 1}</div>
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Próximo envio</div>
                <div className="font-black text-slate-900 text-base">{pendentes[step]?.apelido || pendentes[step]?.nome}</div>
                <div className="text-xs text-slate-500 font-medium">{pendentes[step]?.celular}</div>
              </div>
            </div>
            {!running ? (
              <button onClick={startBatch} className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl">
                <MessageCircle size={20} /> Iniciar Disparo em Lote
              </button>
            ) : (
              <button disabled className="w-full py-6 bg-amber-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl opacity-80 cursor-not-allowed">
                <RefreshCw size={20} className="animate-spin" /> Disparando...
              </button>
            )}
            <button onClick={finish} disabled={running} className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 disabled:opacity-50">
              Pausar / Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── App Principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState<'dashboard' | 'convidados' | 'configuracoes'>('dashboard');
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: 'sucesso' | 'erro' } | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroEnvio, setFiltroEnvio] = useState('Todos');
  const [showSim, setShowSim] = useState(false);
  const [showDisparo, setShowDisparo] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('admin_token'));
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || 'Credenciais inválidas.');
      }
    } catch {
      setLoginError('Erro de conexão com o servidor.');
    } finally {
      setLoginLoading(false);
    }
  };

  // WPP Sync state
  const [wppStatus, setWppStatus] = useState<'DISCONNECTED' | 'QR_CODE' | 'CONNECTED'>('DISCONNECTED');
  const [qrCodeData, setQrCodeData] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const wppPollInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchWppStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/whatsapp/status`);
      const data = await res.json();
      setWppStatus(data.status);
      setQrCodeData(data.qrCode ? (data.qrCode.startsWith('data:image') ? data.qrCode : `data:image/png;base64,${data.qrCode}`) : '');
      setPairingCode(data.pairingCode || '');
      if (data.status === 'CONNECTED' && wppPollInterval.current) {
        clearInterval(wppPollInterval.current);
      }
    } catch { }
  }, []);

  useEffect(() => { fetchWppStatus(); }, [fetchWppStatus]);

  const connectWpp = async () => {
    try {
      const res = await fetch(`${API}/api/whatsapp/connect`, { method: 'POST' });
      const data = await res.json();
      setWppStatus(data.status);
      setQrCodeData(data.qrCode ? (data.qrCode.startsWith('data:image') ? data.qrCode : `data:image/png;base64,${data.qrCode}`) : '');
      setPairingCode(data.pairingCode || '');

      if (wppPollInterval.current) clearInterval(wppPollInterval.current);
      wppPollInterval.current = setInterval(fetchWppStatus, 3000);
    } catch {
      notify('Falha ao gerar QR Code', 'erro');
    }
  };

  const disconnectWpp = async () => {
    try {
      await fetch(`${API}/api/whatsapp/disconnect`, { method: 'POST' });
      setWppStatus('DISCONNECTED');
      setQrCodeData('');
      if (wppPollInterval.current) clearInterval(wppPollInterval.current);
    } catch { }
  };

  // Form State
  const [novoGuest, setNovoGuest] = useState({
    nome: '', apelido: '', celular: '', idade: 'Adulto', sexo: 'Masculino', dependentes: 0,
  });

  const notify = useCallback((msg: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, gstRes] = await Promise.all([
        fetch(`${API}/api/config`),
        fetch(`${API}/api/guests`),
      ]);
      setConfig(await cfgRes.json());
      const raw = await gstRes.json();
      setGuests(Array.isArray(raw) ? raw : []);
    } catch {
      notify('Erro ao conectar', 'erro');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const guestsFiltrados = useMemo(
    () => guests.filter(g => {
      const matchBusca = g.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (g.apelido || '').toLowerCase().includes(busca.toLowerCase()) ||
        g.celular.includes(busca);
      const matchStatus = filtroStatus === 'Todos' || g.status === filtroStatus;
      const matchEnvio = filtroEnvio === 'Todos' || g.status_envio === filtroEnvio;
      return matchBusca && matchStatus && matchEnvio;
    }),
    [guests, busca, filtroStatus, filtroEnvio]
  );

  const getCount = (filteredGuests: Guest[]) => filteredGuests.reduce((sum, g) => sum + 1 + Number(g.dependentes || 0), 0);

  const totalListaCount = useMemo(() => getCount(guests), [guests]);
  const confirmadosCount = useMemo(() => getCount(guests.filter(g => g.status === 'Confirmado')), [guests]);
  const recusadosCount = useMemo(() => getCount(guests.filter(g => g.status === 'Recusado')), [guests]);
  const rsvpPendentesCount = useMemo(() => getCount(guests.filter(g => g.status === 'Pendente')), [guests]);

  const dependentesCount = useMemo(() => guests.reduce((sum, g) => sum + Number(g.dependentes || 0), 0), [guests]);

  const disparoPendentesCount = useMemo(() => guests.filter(g => (g.status_envio || 'Pendente') === 'Pendente').length, [guests]);
  const failedGuests = useMemo(() => guests.filter(g => g.status_envio === 'Erro'), [guests]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
      });
      res.ok ? notify('Configurações salvas!') : notify('Erro ao salvar.', 'erro');
    } catch {
      notify('Erro de rede.', 'erro');
    } finally {
      setSaving(false);
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/guests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...novoGuest, apelido: novoGuest.apelido || novoGuest.nome }),
      });
      if (res.ok) {
        notify('VIP cadastrado!');
        fetchData();
        setNovoGuest({ nome: '', apelido: '', celular: '', idade: 'Adulto', sexo: 'Masculino', dependentes: 0 });
      } else {
        const err = await res.json();
        notify(err.error || 'Erro ao cadastrar.', 'erro');
      }
    } catch {
      notify('Erro de conexão.', 'erro');
    }
  };

  const handleDeleteGuest = async (g: Guest) => {
    if (!window.confirm(`Tem a certeza que deseja excluir ${g.nome}?`)) return;
    try {
      const res = await fetch(`${API}/api/guests/${g.id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('Convidado excluído!', 'sucesso');
        fetchData();
      } else {
        notify('Erro ao excluir convidado.', 'erro');
      }
    } catch {
      notify('Erro de conexão.', 'erro');
    }
  };

  const handleClearGuestList = async () => {
    if (!window.confirm('CUIDADO: Tem a certeza absoluta que deseja apagar TODOS os convidados da base? Esta ação é irreversível.')) return;
    try {
      const res = await fetch(`${API}/api/guests`, { method: 'DELETE' });
      if (res.ok) {
        notify('Base VIP limpa com sucesso!', 'sucesso');
        fetchData();
      } else {
        notify('Erro ao limpar a base.', 'erro');
      }
    } catch {
      notify('Erro de conexão.', 'erro');
    }
  };

  const handleSendWhatsApp = useCallback(async (g: Guest) => {
    const apelido = g.apelido || g.nome;
    const textDep = g.dependentes && g.dependentes > 0 ? ` e leve seu(s) ${g.dependentes} dependente(s)` : '';
    const msg = `Olá *${apelido}*! 🎉\n\nTemos uma notícia especial para ti${textDep}.\n\n🎬 Assiste até ao fim e confirma a tua presença:\n👉 https://familia-rein.cloud/c/${g.id}`;

    // Automação via API Evolution Substituindo o Popup:
    try {
      await fetch(`${API}/api/whatsapp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId: g.id, phone: g.celular, message: msg })
      });
      fetchData();
    } catch { }
  }, [fetchData]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);
    formData.append('updateConfig', 'true'); // Diga ao backend para atualizar config logo

    setUploadingVideo(true);
    notify('Enviando vídeo para a VPS...', 'sucesso');
    try {
      const res = await fetch(`${API}/api/upload/video`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => prev ? { ...prev, video_file: data.file } : null);
        notify('Vídeo sincronizado com sucesso!', 'sucesso');
      } else {
        notify('Falha ao enviar vídeo', 'erro');
      }
    } catch {
      notify('Erro de rede no upload', 'erro');
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        // Sanitizar chaves do Excel (remover espaços fantasmas e meter tudo minúsculo)
        const sanitizedData = rawData.map((row: any) => {
          const newRow: any = {};
          for (const key in row) {
            const cleanKey = key.trim().toLowerCase();
            newRow[cleanKey] = row[key];
          }
          return newRow;
        });

        // Mapear colunas do Excel para API
        const guestsArr = sanitizedData.map((row: any) => ({
          nome: row.nome || 'Sem Nome',
          apelido: row.apelido || row.nome || '',
          celular: String(row.whatsapp || row.celular || ''),
          dependentes: parseInt(String(row.acompanhantes || row.dependentes || row.depedentes || '0')) || 0
        })).filter(g => g.celular); // Ignora linhas sem telemóvel

        if (guestsArr.length === 0) {
          return notify('Nenhuma linha válida encontrada no Excel (verifique a coluna WhatsApp/Celular)', 'erro');
        }

        if (!window.confirm(`Confirmar cadastro/atualização de ${guestsArr.length} convidados do Excel?`)) {
          if (excelInputRef.current) excelInputRef.current.value = '';
          return;
        }

        notify(`Importando ${guestsArr.length} contatos...`);
        const res = await fetch(`${API}/api/guests/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guests: guestsArr })
        });

        if (res.ok) {
          const info = await res.json();
          notify(`Excel Importado: ${info.inseridos} salvos.`);
          fetchData();
        } else {
          notify('Erro ao salvar lote na VPS', 'erro');
        }

      } catch (err) {
        notify('Erro ao ler XLSX.', 'erro');
      } finally {
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const markErrorTest = async () => {
    if (guests.length === 0) return notify('Sem convidados para simular erro', 'erro');
    const g = guests[0];
    await fetch(`${API}/api/guests/${g.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status_envio: 'Erro' })
    });
    fetchData();
    notify('Simulado Erro de envio no 1º convidado', 'erro');
  };

  const handleBatchResend = async () => {
    if (failedGuests.length === 0) return;
    notify(`Iniciando reenvio para ${failedGuests.length} convidados...`);
    for (const fg of failedGuests) {
      // O handleSendWhatsApp abre janela nativamente e atualiza o estado para "Enviado"
      await handleSendWhatsApp(fg);
      // Delay de 1500ms para evitar bloqueios popup do browser e garantir carregamento do WhatsApp Web
      await new Promise(r => setTimeout(r, 1500));
    }
    notify('Sucesso: Todos os links de recuperação foram entregues ao roteador!', 'sucesso');
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/30">
            <Heart size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Arcogi Eventos</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Painel de Administração</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 space-y-5 shadow-2xl">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email</label>
            <input
              type="email" required autoFocus
              value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-slate-500 text-sm"
              placeholder="admin@admin.com"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required
                value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 pr-12 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-slate-500 text-sm"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showPassword ? <Eye size={16} /> : <Eye size={16} className="opacity-40" />}
              </button>
            </div>
          </div>
          {loginError && (
            <p className="text-rose-400 text-xs font-bold text-center bg-rose-500/10 py-2 px-4 rounded-lg">{loginError}</p>
          )}
          <button type="submit" disabled={loginLoading}
            className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-rose-500/30 disabled:opacity-50">
            {loginLoading ? 'A autenticar...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );

  if (loading && guests.length === 0) return (

    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Heart size={48} className="text-rose-500 animate-bounce" />
        <span className="uppercase tracking-[0.3em] text-[10px] font-black text-slate-400 animate-pulse">Iniciando Arcogi DaaS...</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {toast && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4 ${toast.tipo === 'sucesso' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
          {toast.tipo === 'sucesso' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="font-bold text-sm tracking-wide">{toast.msg}</span>
        </div>
      )}

      {showSim && config && <IPhoneSimulator config={config} onClose={() => setShowSim(false)} />}
      {showDisparo && <DisparoOverlay guests={guests} onClose={() => setShowDisparo(false)} onRefresh={fetchData} />}

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside className="w-[300px] bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-800">
          <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2 uppercase">
            <Heart size={24} className="text-rose-500 fill-rose-500" /> EVENTOS
          </h1>
          <p className="text-slate-500 text-[10px] uppercase font-black mt-2 tracking-widest">CRM de Elite</p>
        </div>

        <nav className="flex-1 p-5 space-y-2 mt-4">
          <button
            onClick={() => setAba('dashboard')}
            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${aba === 'dashboard' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={18} /> <span className="font-black text-xs uppercase tracking-widest">Dashboard</span>
          </button>

          <button
            onClick={() => setAba('convidados')}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 ${aba === 'convidados' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} /> <span className="font-black text-xs uppercase tracking-widest">Base VIP</span>
            </div>
            {guests.length > 0 && <span className={`text-[10px] font-black px-2 py-1 rounded-md ${aba === 'convidados' ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-300'}`}>{guests.length}</span>}
          </button>

          <button
            onClick={() => setAba('configuracoes')}
            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${aba === 'configuracoes' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings size={18} /> <span className="font-black text-xs uppercase tracking-widest">Narrativa</span>
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800 space-y-4">
          <button
            onClick={() => setShowDisparo(true)}
            disabled={disparoPendentesCount === 0 && failedGuests.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-20 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg"
          >
            <Zap size={16} /> Disparar Convites
          </button>
          <button
            onClick={async () => {
              if (!confirm('⚠️ Resetar status de envio para todos os convidados?\nIsso não apaga as respostas RSVP.')) return;
              const res = await fetch(`${API}/api/guests/reset-envios`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } });
              if (res.ok) alert('✅ Envios resetados!');
              else alert('❌ Erro ao resetar envios.');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            🔄 Reset Envios
          </button>
          <button
            onClick={async () => {
              if (!confirm('⚠️ Resetar TODAS as respostas RSVP dos convidados?\nEsta ação não pode ser desfeita!')) return;
              if (!confirm('🔴 Tens a certeza? Todos os status voltarão a "Pendente".')) return;
              const res = await fetch(`${API}/api/guests/reset-respostas`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } });
              if (res.ok) { alert('✅ Respostas resetadas!'); fetchData(); }
              else alert('❌ Erro ao resetar respostas.');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-rose-900/50 text-slate-500 hover:text-rose-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            🗑️ Reset Respostas
          </button>
        </div>
      </aside>

      {/* ── MAIN ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-12 bg-[#F8FAFC]">
        {/* DASHBOARD TAB (Analytics & Failures only) */}
        {aba === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Dashboard & Resiliência</h2>
              <div className="h-1 w-16 bg-rose-500 mt-3 rounded-full" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Stat label="Total Lista" value={totalListaCount} color="text-slate-800" />
              <Stat label="Confirmados" value={confirmadosCount} color="text-emerald-500" />
              <Stat label="Provisório" value={getCount(guests.filter(g => g.status === 'Duvida'))} color="text-blue-500" />
              <Stat label="Recusados" value={recusadosCount} color="text-slate-400" />
              <Stat label="Pendente" value={rsvpPendentesCount} color="text-amber-500" />
              <Stat label="Dependentes" value={dependentesCount} color="text-indigo-500" />
              <Stat label="Falhas" value={failedGuests.length} color="text-rose-600" alert={failedGuests.length > 0} />
            </div>

            {failedGuests.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3 text-rose-700">
                    <AlertTriangle size={24} />
                    <h3 className="font-black text-xl uppercase tracking-tighter">Monitor de Falhas de Envio</h3>
                    <span className="bg-rose-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{failedGuests.length} erro(s) vivo(s)</span>
                  </div>

                  <button onClick={handleBatchResend} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 w-fit">
                    <RefreshCcw size={14} /> Reenviar Todos ({failedGuests.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {failedGuests.map(fg => (
                    <div key={fg.id} className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm border border-rose-100">
                      <div>
                        <div className="font-black text-slate-900 text-sm flex items-center gap-2">{fg.apelido || fg.nome} <span className="bg-rose-100 text-rose-600 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Falhou</span></div>
                        <div className="text-xs text-slate-500 mt-1 font-medium">{fg.celular}</div>
                      </div>
                      <button onClick={() => handleSendWhatsApp(fg)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 flex-shrink-0 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 border border-emerald-100 shadow-sm relative group overflow-hidden">
                        <span className="absolute inset-0 w-full h-full bg-emerald-200 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                        <span className="relative z-10 flex items-center gap-2"><RefreshCw size={12} /> Reenviar</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DEBUG APENAS: Para o user conseguir testar o alerta de erro sem disparar whatsapp */}
            <div className="pt-20 opacity-30">
              <button onClick={markErrorTest} className="text-xs border px-3 py-1 rounded">DEBUG: Forçar Erro envio no Convidado 1</button>
            </div>
          </div>
        )}

        {/* BASE VIP (Operation & Lists only) */}
        {aba === 'convidados' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Operação da Base VIP</h2>
              <div className="h-1 w-16 bg-emerald-500 mt-3 rounded-full" />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 block sm:flex gap-4">
                <div className="flex items-center gap-2 text-slate-900 font-black uppercase text-xs tracking-widest shrink-0">
                  <Plus size={16} className="text-emerald-500" /> Cadastrar Novo VIP
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button onClick={handleClearGuestList} className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors border border-rose-200 shadow-sm">
                    <Trash2 size={14} /> Limpar Base
                  </button>
                  <input type="file" ref={excelInputRef} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />
                  <button onClick={() => excelInputRef.current?.click()} className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors border border-emerald-200 shadow-sm">
                    <Users size={14} /> Importar Excel
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddGuest} className="flex flex-col md:flex-row gap-4">
                <input required placeholder="Nome Completo" value={novoGuest.nome} onChange={e => setNovoGuest({ ...novoGuest, nome: e.target.value })} className="flex-1 bg-slate-50 rounded-xl px-5 py-3 font-bold text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400" />
                <div className="relative">
                  <input required placeholder="Apelido / Primário" value={novoGuest.apelido} onChange={e => setNovoGuest({ ...novoGuest, apelido: e.target.value })} className="w-full md:w-52 bg-rose-50 rounded-xl px-5 py-3 font-bold text-sm border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 text-rose-700 placeholder-rose-300" />
                </div>
                <input required type="tel" placeholder="WhatsApp (DDD)" value={novoGuest.celular} onChange={e => setNovoGuest({ ...novoGuest, celular: e.target.value })} className="w-full md:w-48 bg-slate-50 rounded-xl px-5 py-3 font-bold text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400" />

                <select value={novoGuest.idade} onChange={e => setNovoGuest({ ...novoGuest, idade: e.target.value })} className="bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm border border-slate-200">
                  <option>Adulto</option><option>Adolescente</option><option>Menor</option>
                </select>

                <div className="flex flex-col justify-center px-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">+ Deps</span>
                  <input type="number" min="0" value={novoGuest.dependentes} onChange={e => setNovoGuest({ ...novoGuest, dependentes: parseInt(e.target.value) || 0 })} className="w-12 bg-transparent border-none text-center font-black text-sm focus:outline-none p-0 h-5" />
                </div>

                <button type="submit" className="bg-slate-900 text-white px-8 rounded-xl hover:bg-slate-800 transition-colors font-black uppercase text-xs tracking-widest">
                  Salvar
                </button>
              </form>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Procurar nome ou apelido..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={filtroStatus}
                    onChange={e => setFiltroStatus(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                  >
                    <option value="Todos">Todos RSVP</option>
                    <option value="Pendente">⏳ Pendente</option>
                    <option value="Confirmado">✅ Confirmado</option>
                    <option value="Duvida">🤔 Dúvida</option>
                    <option value="Recusado">❌ Recusado</option>
                  </select>
                  <select
                    value={filtroEnvio}
                    onChange={e => setFiltroEnvio(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                  >
                    <option value="Todos">Todos Envios</option>
                    <option value="Pendente">📤 Não enviado</option>
                    <option value="Enviado">✉️ Enviado</option>
                    <option value="Erro">🔴 Com erro</option>
                  </select>
                  {(filtroStatus !== 'Todos' || filtroEnvio !== 'Todos') && (
                    <button
                      onClick={() => { setFiltroStatus('Todos'); setFiltroEnvio('Todos'); }}
                      className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-100 transition-all"
                    >
                      ✕ Limpar
                    </button>
                  )}
                </div>
                <button onClick={fetchData} className="text-slate-400 hover:text-slate-800 transition-colors p-2"><RefreshCw size={14} /></button>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left">
                  <tbody>
                    {guestsFiltrados.map(g => (
                      <GuestRow key={g.id} guest={g} onSendWhatsApp={handleSendWhatsApp} onDelete={handleDeleteGuest} onRefresh={fetchData} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* NARRATIVA (Config only) */}
        {aba === 'configuracoes' && (
          <div className="space-y-6 animate-in fade-in max-w-5xl">
            <header className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Setup do App Convidado</h2>
                <div className="h-1 w-16 bg-rose-500 mt-3 rounded-full" />
              </div>
              <button onClick={() => setShowSim(true)} className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-lg">
                <Eye size={16} /> Visualizar App
              </button>
            </header>

            <form onSubmit={handleSaveConfig} className="space-y-8">
              <Card>
                <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter"><QrCode size={20} className="text-emerald-500" /> Connect Evolution API</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Sincronize a instância WhatsApp para envio em massa.</p>

                    {wppStatus === 'QR_CODE' && (qrCodeData || pairingCode) && (
                      <div className="mt-6 flex flex-col items-center p-6 bg-slate-50 border border-slate-200 rounded-2xl w-[280px]">
                        {qrCodeData ? (
                          <img src={qrCodeData} alt="WhatsApp QR Code" className="w-48 h-48 mix-blend-multiply" />
                        ) : pairingCode ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">Código de Pareamento</span>
                            <span className="text-3xl font-black text-emerald-600 tracking-[0.2em]">{pairingCode}</span>
                          </div>
                        ) : null}
                        <span className="mt-4 text-[10px] font-black tracking-widest uppercase text-slate-400 animate-pulse">A aguardar conexão...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 text-right pt-2">
                    {wppStatus === 'CONNECTED' ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
                          <Check size={14} className="text-emerald-600" />
                          <span className="text-emerald-700 font-black text-xs uppercase tracking-widest">Sincronizado</span>
                        </div>
                        <button type="button" onClick={disconnectWpp} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors">Desconectar</button>
                      </div>
                    ) : wppStatus === 'QR_CODE' ? (
                      <button type="button" onClick={disconnectWpp} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors">Cancelar</button>
                    ) : (
                      <button type="button" onClick={connectWpp} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-xs tracking-widest px-5 py-3 rounded-xl transition-all shadow-sm">
                        <QrCode size={16} /> Gerar QR API
                      </button>
                    )}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-8">
                <Card>
                  <h3 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><Settings size={16} className="text-rose-500" /> Identidade do Evento</h3>
                  <Field label="Nome do Evento">
                    <input type="text" placeholder="Ex: Aniversário Família Rein" value={config?.event_name || ''} onChange={e => setConfig(p => p ? { ...p, event_name: e.target.value } : null)} className={inputCls} />
                  </Field>
                  <Field label="Aniversariantes / Homenageados">
                    <input type="text" placeholder="Ex: João & Maria" value={config?.honorees || ''} onChange={e => setConfig(p => p ? { ...p, honorees: e.target.value } : null)} className={inputCls} />
                  </Field>
                  <Field label="Slogan do Evento">
                    <input type="text" placeholder="Ex: 50 anos de amor" value={config?.slogan || ''} onChange={e => setConfig(p => p ? { ...p, slogan: e.target.value } : null)} className={inputCls} />
                  </Field>
                  <Field label="Título (Save the Date)">
                    <input type="text" value={config?.title || ''} onChange={e => setConfig(p => p ? { ...p, title: e.target.value } : null)} className={inputCls} />
                  </Field>
                  <Field label="Subtítulo">
                    <input type="text" value={config?.subtitle || ''} onChange={e => setConfig(p => p ? { ...p, subtitle: e.target.value } : null)} className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="📅 Data do Evento">
                      <input type="date" value={config?.event_date?.split('T')[0] || ''} onChange={e => setConfig(p => p ? { ...p, event_date: e.target.value } : null)} className={inputCls} />
                    </Field>
                    <Field label="⏰ Prazo de Confirmação">
                      <input type="date" value={config?.confirmation_deadline?.split('T')[0] || ''} onChange={e => setConfig(p => p ? { ...p, confirmation_deadline: e.target.value } : null)} className={inputCls} />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Video size={16} className="text-rose-500" /> Mídia VPS</h3>
                    <div className="bg-slate-100 px-3 py-1 rounded-lg text-slate-500 text-[9px] font-black uppercase">Vídeo Ativo: {config?.video_file || 'Nenhum'}</div>
                  </div>
                  <Field label="Ficheiro Local (.mp4)">
                    <input type="file" ref={videoInputRef} style={{ display: 'none' }} accept="video/mp4" onChange={handleVideoUpload} />
                    <button
                      type="button"
                      onClick={() => !uploadingVideo && videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className={`w-full px-5 py-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${uploadingVideo ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-50 border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
                    >
                      {uploadingVideo ? <><RefreshCw size={18} className="animate-spin" /> Upload em progresso...</> : <><Plus size={18} /> Enviar Vídeo (.mp4) para Servidor</>}
                    </button>
                  </Field>

                  <div className="grid grid-cols-3 gap-3 pt-4">
                    <Field label="Label SIM"><input type="text" value={config?.btn_confirm_text || ''} onChange={e => setConfig(p => p ? { ...p, btn_confirm_text: e.target.value } : null)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" /></Field>
                    <Field label="Label DÚVIDA"><input type="text" value={config?.btn_doubt_text || ''} onChange={e => setConfig(p => p ? { ...p, btn_doubt_text: e.target.value } : null)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" /></Field>
                    <Field label="Label NÃO"><input type="text" value={config?.btn_decline_text || ''} onChange={e => setConfig(p => p ? { ...p, btn_decline_text: e.target.value } : null)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" /></Field>
                  </div>
                </Card>
              </div>

              <Card>
                <h3 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><MessageCircle size={16} className="text-rose-500" /> Gatilhos de Sucesso RSVP</h3>
                <div className="grid grid-cols-3 gap-6">
                  <Field label="Confirmação de Presença">
                    <textarea value={config?.msg_success_confirm || ''} onChange={e => setConfig(p => p ? { ...p, msg_success_confirm: e.target.value } : null)} className="w-full px-5 py-4 bg-emerald-50 border border-emerald-100 rounded-xl resize-none h-28 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </Field>
                  <Field label="Marcou Dúvida">
                    <textarea value={config?.msg_success_doubt || ''} onChange={e => setConfig(p => p ? { ...p, msg_success_doubt: e.target.value } : null)} className="w-full px-5 py-4 bg-amber-50 border border-amber-100 rounded-xl resize-none h-28 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </Field>
                  <Field label="Recusou Convite">
                    <textarea value={config?.msg_success_decline || ''} onChange={e => setConfig(p => p ? { ...p, msg_success_decline: e.target.value } : null)} className="w-full px-5 py-4 bg-rose-50 border border-rose-100 rounded-xl resize-none h-28 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                  </Field>
                </div>
              </Card>

              <div className="flex justify-end pt-4 pb-12">
                <button type="submit" disabled={saving} className="px-10 py-5 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50">
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} Salvar Definições
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color, alert }: { label: string; value: number; color: string; alert?: boolean }) {
  return (
    <div className={`bg-white px-6 py-8 rounded-[2rem] shadow-sm border ${alert ? 'border-rose-300 bg-rose-50 scale-105 shadow-xl shadow-rose-100' : 'border-slate-200'} flex flex-col items-start`}>
      <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-2">{label}</span>
      <span className={`text-5xl font-black tracking-tighter ${color}`}>{value}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-2 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white text-sm font-bold text-slate-800 transition-all';
