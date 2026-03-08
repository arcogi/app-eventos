import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, Calendar, CheckCircle, HelpCircle, XCircle, Lock, Phone } from 'lucide-react';

const API = import.meta.env.DEV ? 'http://localhost:3001' : '';

export default function App() {
  const [iniciado, setIniciado] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const [teleInput, setTeleInput] = useState('');
  const [teleErro, setTeleErro] = useState('');
  const [teleCarregando, setTeleCarregando] = useState(false);

  // Lookup por telemóvel (sem guest_id — WhatsApp Web / browser desktop)
  const [lookupMode, setLookupMode] = useState(false);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupErro, setLookupErro] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const [statusRSVP, setStatusRSVP] = useState<'pendente' | 'enviando' | 'sucesso' | 'erro'>('pendente');
  const [respostaDada, setRespostaDada] = useState<'Confirmado' | 'Duvida' | 'Recusado' | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestData, setGuestData] = useState<{ nome: string, celular: string, status?: string } | null>(null);
  const [draftNome, setDraftNome] = useState('');

  const [videoEnded, setVideoEnded] = useState(false);
  const [showRSVP, setShowRSVP] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('guest_id');
    setGuestId(id);

    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API}/api/config`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          if (!data.video_file) setVideoEnded(true);
        }
      } catch (error) {
        console.error('Erro ao conectar com a API:', error);
      }
    };

    const fetchGuestData = async (gId: string) => {
      try {
        const res = await fetch(`${API}/api/guests/${gId}`);
        if (res.ok) {
          const data = await res.json();
          setGuestData(data);
          setDraftNome(data.nome || '');
          if (data.status && data.status !== 'Pendente') {
            setRespostaDada(data.status);
            setStatusRSVP('sucesso');
          }
        }
      } catch (err) { }
    };

    fetchConfig();
    if (id) fetchGuestData(id);
  }, []);

  // Verificação de telemóvel — funciona com ou sem guest_id
  const handleVerify = async () => {
    if (!teleInput.trim()) { setTeleErro('Digite seu celular com DDD.'); return; }
    setTeleCarregando(true);
    setTeleErro('');
    try {
      if (guestId) {
        // COM guest_id: verifica se o telemóvel corresponde ao registo
        const res = await fetch(`${API}/api/guests/${guestId}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ celular: teleInput })
        });
        if (res.ok) {
          setVerificado(true);
        } else {
          setTeleErro('❌ Número não confere com o convite. Tente novamente.');
        }
      } else {
        // SEM guest_id: procura pelo telemóvel (lookup)
        const res = await fetch(`${API}/api/guests/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ celular: teleInput })
        });
        if (res.ok) {
          const data = await res.json();
          setGuestId(data.id);
          setDraftNome(data.nome || '');
          setGuestData({ nome: data.nome, celular: teleInput, status: data.status });
          setVerificado(true);
          if (data.status && data.status !== 'Pendente') {
            setRespostaDada(data.status);
            setStatusRSVP('sucesso');
          }
        } else {
          setTeleErro('❌ Nenhum convite encontrado com esse número. Verifique o DDD.');
        }
      }
    } catch (e) {
      setTeleErro('Erro de conexão. Verifique sua internet.');
    } finally {
      setTeleCarregando(false);
    }
  };

  // Lookup de convite por telemóvel (para WhatsApp Web / browser desktop)
  const handleLookup = async () => {
    if (!lookupInput.trim()) { setLookupErro('Digite seu número com DDD.'); return; }
    setLookupLoading(true);
    setLookupErro('');
    try {
      const res = await fetch(`${API}/api/guests/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celular: lookupInput })
      });
      if (res.ok) {
        const data = await res.json();
        setGuestId(data.id);
        setDraftNome(data.nome || '');
        setGuestData({ nome: data.nome, celular: lookupInput, status: data.status });
        setLookupMode(false);
        setVerificado(true); // já verificou pelo telemóvel
        if (data.status && data.status !== 'Pendente') {
          setRespostaDada(data.status);
          setStatusRSVP('sucesso');
        }
      } else {
        const d = await res.json();
        setLookupErro(d.error || 'Número não encontrado. Verifique o DDD e tente novamente.');
      }
    } catch (e) {
      setLookupErro('Erro de conexão. Verifique sua internet.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRSVP = async (status: 'Confirmado' | 'Duvida' | 'Recusado') => {
    if (!guestId) {
      alert('Atenção: modo visualização ativo. Use o link do WhatsApp para confirmar sua presença.');
      return;
    }
    setStatusRSVP('enviando');
    setRespostaDada(status);
    try {
      const response = await fetch(`${API}/api/guests/${guestId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, nome: draftNome })
      });
      if (response.ok) {
        setStatusRSVP('sucesso');
      } else if (response.status === 409) {
        const data = await response.json();
        setRespostaDada(data.status || status);
        setStatusRSVP('sucesso');
      } else {
        setStatusRSVP('erro');
        alert('Erro: não foi possível localizar seu registro de convidado.');
      }
    } catch (error) {
      setStatusRSVP('erro');
    }
  };

  // Formata data de prazo em formato legível
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (!config) return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center">
      <div className="text-white/20 uppercase tracking-[0.5em] text-[10px] animate-pulse font-black">
        Carregando...
      </div>
    </div>
  );

  const hasVideo = !!config.video_file;
  // SEGURANÇA: sempre exigir verificação antes de qualquer conteúdo
  const precisaVerificar = iniciado && !verificado;
  const showingVideo = iniciado && verificado && hasVideo && !videoEnded;
  const showingRSVP = iniciado && verificado && (!hasVideo || videoEnded);

  return (
    <div className="bg-slate-900 text-white flex flex-col items-center justify-center min-h-screen font-sans">

      {/* ══════════════════════════════════════
          ESTADO 01 — SAVE THE DATE (SPLASH)
      ══════════════════════════════════════ */}
      {!iniciado && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 space-y-10 animate-in fade-in duration-1000">
          <div className="text-center space-y-3">
            {config.event_name && (
              <p className="text-rose-400/80 text-[9px] uppercase tracking-[0.4em] font-black">{config.event_name}</p>
            )}
            <h1 className="text-5xl font-extralight tracking-[0.4em] uppercase text-white/90">
              {config.title || 'SAVE THE DATE'}
            </h1>
            {config.honorees && (
              <p className="text-white/80 text-2xl font-light tracking-wider">{config.honorees}</p>
            )}
            <p className="text-slate-400 tracking-[0.3em] text-[10px] uppercase font-bold">
              {config.slogan || config.subtitle || 'Um momento especial se aproxima'}
            </p>
            {config.confirmation_deadline && (
              <div className="inline-flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 rounded-full px-4 py-1.5 mt-2">
                <Calendar size={12} className="text-rose-400" />
                <span className="text-rose-300 text-[10px] font-black uppercase tracking-widest">
                  Confirme até {formatDate(config.confirmation_deadline)}
                </span>
              </div>
            )}
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all duration-500 animate-pulse" />
            <button
              onClick={() => setIniciado(true)}
              className="relative w-28 h-28 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-500 shadow-2xl active:scale-95"
            >
              <Play size={44} fill="currentColor" className="ml-2" />
            </button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black animate-bounce opacity-70">
              Toque para assistir
            </p>
            {hasVideo && (
              <p className="text-rose-400/80 text-[9px] uppercase tracking-[0.2em] font-black">
                🎬 Assista até o final para confirmar sua presença
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ESTADO 1.5 — VERIFICAÇÃO TELEMÓVEL
      ══════════════════════════════════════ */}
      {iniciado && precisaVerificar && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 animate-in fade-in duration-500 max-w-sm w-full mx-auto">
          <div className="text-center space-y-4 mb-10">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-white/70" />
            </div>
            <h2 className="text-xl font-bold text-white">Verificação de Identidade</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Para acessar seu convite exclusivo, confirme o celular com o qual foi convidado.
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="flex items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-4 gap-3 focus-within:border-white/40 transition-all">
              <Phone size={18} className="text-slate-400 shrink-0" />
              <input
                type="tel"
                placeholder="DDD + Número (ex: 11 99999-9999)"
                value={teleInput}
                onChange={(e) => setTeleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="bg-transparent text-white placeholder-slate-500 text-sm font-medium w-full focus:outline-none"
                autoFocus
              />
            </div>

            {teleErro && (
              <p className="text-rose-400 text-xs font-bold text-center animate-in fade-in">{teleErro}</p>
            )}

            <button
              onClick={handleVerify}
              disabled={teleCarregando}
              className="w-full py-4 rounded-2xl bg-white text-slate-900 font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {teleCarregando ? 'Verificando...' : 'Confirmar e Assistir'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ESTADO 02 — VÍDEO FULLSCREEN LIVRE
      ══════════════════════════════════════ */}
      {showingVideo && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-in fade-in duration-500">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
            onEnded={() => setVideoEnded(true)}
            onError={() => setVideoEnded(true)}
            src={`${API}/uploads/videos/${config.video_file}`}
          />
        </div>
      )}

      {/* ══════════════════════════════════════
          ESTADO 03 — RSVP CARD
      ══════════════════════════════════════ */}
      {showingRSVP && (
        <div className="flex items-center justify-center min-h-screen p-4 w-full">
          <div className="max-w-md w-full bg-white text-slate-800 rounded-[3.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-700 flex flex-col">

            {!hasVideo && (
              <div className="bg-black aspect-video relative flex items-center justify-center">
                <div className="bg-gradient-to-t from-black/80 to-transparent absolute inset-0" />
                <div className="z-10 text-white text-center p-6 space-y-2">
                  <Heart className="mx-auto mb-2 text-rose-500 fill-rose-500 opacity-50" size={32} />
                </div>
              </div>
            )}

            <div className="p-8 md:p-10 pb-12 text-center flex-1 overflow-y-auto">
              <div className="flex justify-center gap-6 text-slate-200 mb-6">
                <Heart size={20} className="fill-slate-100" />
                <Calendar size={20} className="text-slate-300" />
                <Heart size={20} className="fill-slate-100" />
              </div>

              <div className="space-y-2 mb-6">
                {config.honorees && (
                  <p className="text-rose-400 text-xs font-black uppercase tracking-widest">{config.honorees}</p>
                )}
                <h2 className="text-4xl font-serif tracking-tight text-slate-900">
                  {config.event_name || 'Família Rein'}
                </h2>
                {config.slogan && (
                  <p className="text-slate-600 text-sm italic">"{config.slogan}"</p>
                )}
                <p className="text-slate-500 text-sm leading-relaxed px-2 font-medium">
                  Estamos preparando algo inesquecível e sua presença é o que torna tudo real.
                </p>
                {config.confirmation_deadline && (
                  <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-4 py-1.5 mt-1">
                    <Calendar size={11} className="text-rose-500" />
                    <span className="text-rose-600 text-[10px] font-black uppercase tracking-widest">
                      Confirme até {formatDate(config.confirmation_deadline)}
                    </span>
                  </div>
                )}
              </div>

              {statusRSVP === 'sucesso' ? (
                /* ── MENSAGEM DE SUCESSO COM DESTAQUE ── */
                <div className="animate-in zoom-in-95 fade-in duration-500">
                  <div className={`p-8 rounded-[2rem] border ${respostaDada === 'Confirmado' ? 'bg-emerald-50 border-emerald-200' : respostaDada === 'Duvida' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div className={`w-20 h-20 text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl animate-bounce ${respostaDada === 'Confirmado' ? 'bg-emerald-500 shadow-emerald-200' : respostaDada === 'Duvida' ? 'bg-amber-500 shadow-amber-200' : 'bg-rose-400 shadow-rose-200'}`}>
                      {respostaDada === 'Confirmado' ? <CheckCircle size={40} /> : respostaDada === 'Duvida' ? <HelpCircle size={40} /> : <XCircle size={40} />}
                    </div>
                    <h3 className={`font-black uppercase text-lg tracking-widest mb-3 ${respostaDada === 'Confirmado' ? 'text-emerald-700' : respostaDada === 'Duvida' ? 'text-amber-700' : 'text-rose-600'}`}>
                      {respostaDada === 'Confirmado' ? 'Presença Confirmada!' : respostaDada === 'Duvida' ? 'Anotado!' : 'Resposta Registrada'}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                      {respostaDada === 'Confirmado' ? (config.msg_success_confirm || 'Obrigado pela confirmação! Contamos com você.') :
                        respostaDada === 'Duvida' ? (config.msg_success_doubt || 'Esperamos que consiga vir!') :
                          (config.msg_success_decline || 'Que pena, você vai fazer muita falta!')}
                    </p>
                    {config.event_date && (
                      <div className="mt-4 bg-white/60 rounded-2xl px-4 py-3 border border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Data do Evento</p>
                        <p className="text-slate-700 font-black text-sm">{formatDate(config.event_date)}</p>
                      </div>
                    )}
                  </div>
                  {hasVideo && (
                    <button
                      onClick={() => { setVideoEnded(false); setVerificado(false); }}
                      className="mt-4 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 text-slate-500 hover:bg-slate-100 transition-all"
                    >
                      🎬 Rever o vídeo
                    </button>
                  )}
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-3">
                    Pode fechar esta página
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ── Sem guest_id: permite identificação por telemóvel ── */}
                  {!guestId && (
                    lookupMode ? (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-300">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                          <Phone size={13} /> Identifique-se pelo celular
                        </p>
                        <input
                          type="tel"
                          placeholder="DDD + Número (ex: 11 99999-9999)"
                          value={lookupInput}
                          onChange={(e) => setLookupInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-300"
                          autoFocus
                        />
                        {lookupErro && <p className="text-rose-500 text-xs font-bold">{lookupErro}</p>}
                        <div className="flex gap-2">
                          <button onClick={handleLookup} disabled={lookupLoading}
                            className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50">
                            {lookupLoading ? 'Buscando...' : 'Encontrar Convite'}
                          </button>
                          <button onClick={() => setLookupMode(false)}
                            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                          📱 Recebeu o convite pelo WhatsApp?
                        </p>
                        <button onClick={() => setLookupMode(true)}
                          className="w-full py-3 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95">
                          🎟️ Tenho um convite
                        </button>
                      </div>
                    )
                  )}

                  {!showRSVP ? (
                    <button
                      onClick={() => setShowRSVP(true)}
                      className="w-full py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all bg-slate-900 hover:bg-black shadow-slate-300 text-white shadow-xl hover:scale-[1.02] active:scale-95"
                    >
                      Por favor, confirme sua presença
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {guestData && (
                        <div className="space-y-4 mb-2 pt-4 border-t border-slate-100">
                          <div className="flex flex-col">
                            <input
                              value={draftNome}
                              onChange={(e) => setDraftNome(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-[1rem] px-5 py-4 font-black focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all text-sm shadow-inner text-center"
                            />
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-2 text-center">Nome no Convite</span>
                          </div>
                        </div>
                      )}
                      <button onClick={() => handleRSVP('Confirmado')} disabled={statusRSVP === 'enviando'}
                        className="w-full py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 text-white shadow-xl hover:scale-[1.02] active:scale-95">
                        <CheckCircle size={20} /> {config.btn_confirm_text || 'Confirmar'}
                      </button>
                      <button onClick={() => handleRSVP('Duvida')} disabled={statusRSVP === 'enviando'}
                        className="w-full py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all bg-amber-400 hover:bg-amber-500 shadow-amber-200 text-white shadow-xl hover:scale-[1.02] active:scale-95">
                        <HelpCircle size={20} /> {config.btn_doubt_text || 'Dúvida'}
                      </button>
                      <button onClick={() => handleRSVP('Recusado')} disabled={statusRSVP === 'enviando'}
                        className="w-full py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all bg-slate-900 hover:bg-black shadow-slate-300 text-white shadow-xl hover:scale-[1.02] active:scale-95">
                        <XCircle size={20} /> {config.btn_decline_text || 'Recusar'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <footer className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] pt-8 border-t border-slate-50 mt-6">
                {config.footer_text || 'familia-rein.cloud • 2026'}
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}