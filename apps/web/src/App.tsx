import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, Calendar, CheckCircle, HelpCircle, XCircle } from 'lucide-react';

const API = import.meta.env.DEV ? 'http://localhost:3001' : '';

export default function App() {
  const [iniciado, setIniciado] = useState(false);
  const [statusRSVP, setStatusRSVP] = useState<'pendente' | 'enviando' | 'sucesso' | 'erro'>('pendente');
  const [respostaDada, setRespostaDada] = useState<'Confirmado' | 'Duvida' | 'Recusado' | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestData, setGuestData] = useState<{ nome: string, celular: string, status?: string } | null>(null);
  const [draftNome, setDraftNome] = useState('');

  // Controle de Visualização do Vídeo
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
          // Se já respondeu anteriormente, mostrar mensagem direto
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

  const handleRSVP = async (status: 'Confirmado' | 'Duvida' | 'Recusado') => {
    if (!guestId) {
      alert('Atenção: Modo visualização ativo. Utilize o link do WhatsApp para confirmar presença.');
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
        // Já respondeu antes
        const data = await response.json();
        setRespostaDada(data.status || status);
        setStatusRSVP('sucesso');
      } else {
        setStatusRSVP('erro');
        alert('Erro: Não foi possível localizar o seu registro de convidado.');
      }
    } catch (error) {
      console.error('Erro ao enviar RSVP:', error);
      setStatusRSVP('erro');
    }
  };

  if (!config) return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center">
      <div className="text-white/20 uppercase tracking-[0.5em] text-[10px] animate-pulse font-black">
        A carregar momento especial...
      </div>
    </div>
  );

  // ─── ESTADOS ───────────────────────────────────────────
  const showingVideo = iniciado && !!config.video_file && !videoEnded;
  const showingRSVP = iniciado && (!config.video_file || videoEnded);

  return (
    <div className="bg-slate-900 text-white flex flex-col items-center justify-center min-h-screen font-sans">

      {/* ══════════════════════════════════════
          ESTADO 01 — SAVE THE DATE (SPLASH)
      ══════════════════════════════════════ */}
      {!iniciado && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 space-y-10 animate-in fade-in duration-1000">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-extralight tracking-[0.4em] uppercase text-white/90">
              {config.title || 'SAVE THE DATE'}
            </h1>
            <p className="text-slate-400 tracking-[0.3em] text-[10px] uppercase font-bold">
              {config.subtitle || 'Um momento especial aproxima-se'}
            </p>
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
              Toca para assistir
            </p>
            {config.video_file && (
              <p className="text-rose-400/80 text-[9px] uppercase tracking-[0.2em] font-black">
                🎬 Assiste até ao final para confirmar a tua presença
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ESTADO 02 — VÍDEO FULLSCREEN LIVRE
          (sem card, ocupa o ecrã todo,
           funciona em paisagem e retrato)
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

            {/* Decoração topo (só aparece quando não há vídeo) */}
            {!config.video_file && (
              <div className="bg-black aspect-video relative flex items-center justify-center">
                <div className="bg-gradient-to-t from-black/80 to-transparent absolute inset-0" />
                <div className="z-10 text-white text-center p-6 space-y-2">
                  <Heart className="mx-auto mb-2 text-rose-500 fill-rose-500 opacity-50" size={32} />
                  <p className="text-[10px] uppercase tracking-[0.3em] font-black opacity-80">
                    'A nossa história continua contigo...'
                  </p>
                </div>
              </div>
            )}

            <div className="p-8 md:p-10 pb-12 text-center flex-1 overflow-y-auto">
              <div className="flex justify-center gap-6 text-slate-200 mb-6">
                <Heart size={20} className="fill-slate-100" />
                <Calendar size={20} className="text-slate-300" />
                <Heart size={20} className="fill-slate-100" />
              </div>

              <div className="space-y-3 mb-6">
                <h2 className="text-4xl font-serif tracking-tight text-slate-900">Família Rein</h2>
                <p className="text-slate-500 text-sm leading-relaxed px-2 font-medium">
                  Estamos a preparar algo inesquecível e a tua presença é o que torna tudo real.
                </p>
              </div>

              {statusRSVP === 'sucesso' ? (
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-emerald-100 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
                  <div className={`w-16 h-16 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl ${respostaDada === 'Confirmado' ? 'bg-emerald-500 shadow-emerald-200' : respostaDada === 'Duvida' ? 'bg-amber-500 shadow-amber-200' : 'bg-rose-500 shadow-rose-200'}`}>
                    {respostaDada === 'Confirmado' ? <CheckCircle size={32} /> : respostaDada === 'Duvida' ? <HelpCircle size={32} /> : <XCircle size={32} />}
                  </div>
                  <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest mb-2">Resposta Registada</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-bold">
                    {respostaDada === 'Confirmado' ? (config.msg_success_confirm || 'Obrigado pela tua confirmação!') :
                      respostaDada === 'Duvida' ? (config.msg_success_doubt || 'Anotado!') :
                        (config.msg_success_decline || 'Que pena!')}
                  </p>
                  {config.video_file && (
                    <button
                      onClick={() => { setVideoEnded(false); }}
                      className="mt-4 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 text-slate-500 hover:bg-slate-100 transition-all"
                    >
                      🎬 Assistir vídeo novamente
                    </button>
                  )}
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-3">
                    Podes fechar esta página
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {!guestId && (
                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-tighter leading-tight flex items-center gap-3 text-left">
                      <HelpCircle size={20} className="shrink-0" />
                      <span>Modo visualização restrito.<br />Usa o link do WhatsApp para votar.</span>
                    </div>
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
                          <div className="flex flex-col text-left group">
                            <input
                              value={draftNome}
                              onChange={(e) => setDraftNome(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-[1rem] px-5 py-4 font-black focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all text-sm shadow-inner text-center"
                            />
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-2 text-center">Nome do Convite</span>
                          </div>
                          <div className="flex flex-col text-left">
                            <input
                              value={guestData.celular}
                              disabled
                              className="w-full bg-slate-100 border border-slate-200 text-slate-400 rounded-[1rem] px-5 py-4 font-black cursor-not-allowed opacity-60 text-sm text-center"
                            />
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-2 text-center">Telemóvel (Bloqueado)</span>
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