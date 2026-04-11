import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const API = import.meta.env.DEV ? 'http://localhost:3001' : '';

interface InviteData {
    guest: {
        id: string;
        nome: string;
        apelido: string;
        dependentes: number;
        short_code: string;
        status_checkin: string;
        status_convite: string;
    };
    invite: {
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
    };
    qr_url: string;
}

type RsvpStatus = 'idle' | 'loading' | 'confirmado' | 'recusado' | 'erro';

function formatDate(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function App() {
    const [data, setData] = useState<InviteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rsvp, setRsvp] = useState<RsvpStatus>('idle');
    const [rsvpMsg, setRsvpMsg] = useState('');
    const qrRef = useRef<HTMLDivElement>(null);

    const code = window.location.pathname.split('/').filter(Boolean).pop() || '';

    useEffect(() => {
        if (!code) { setError('Link inválido.'); setLoading(false); return; }
        fetch(`${API}/api/convite/${code}`)
            .then(r => { if (!r.ok) throw new Error('Convite não encontrado.'); return r.json(); })
            .then(d => {
                setData(d);
                // Restaurar estado RSVP a partir do status guardado na DB
                const sc = d.guest?.status_convite || 'pendente';
                if (sc === 'confirmado') setRsvp('confirmado');
                else if (sc === 'recusado') setRsvp('recusado');
                setLoading(false);
            })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [code]);

    const responder = async (resposta: 'confirmado' | 'recusado') => {
        setRsvp('loading');
        try {
            const res = await fetch(`${API}/api/convite/${code}/rsvp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resposta }),
            });
            const d = await res.json();
            if (res.ok) {
                setRsvp(resposta);
                setRsvpMsg(d.msg || '');
            } else {
                setRsvp('erro');
                setRsvpMsg(d.error || 'Erro ao registar resposta.');
            }
        } catch {
            setRsvp('erro');
            setRsvpMsg('Erro de ligação. Tente novamente.');
        }
    };

    const downloadQR = () => {
        if (!qrRef.current) return;
        const svg = qrRef.current.querySelector('svg');
        if (!svg) return;
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx?.drawImage(img, 0, 0, 512, 512);
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `convite-${code}.png`;
            a.click();
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    };

    const primary = data?.invite?.color_primary || '#1e293b';
    const accent = data?.invite?.color_accent || '#f59e0b';

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: primary }}>
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-white/60 text-sm font-medium">Carregando seu convite...</p>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="text-center space-y-4 px-6">
                <div className="text-6xl">🎟️</div>
                <h1 className="text-white text-xl font-black">Convite não encontrado</h1>
                <p className="text-slate-400 text-sm">{error || 'Link inválido ou expirado.'}</p>
            </div>
        </div>
    );

    const { guest, invite, qr_url } = data;
    const jaFezCheckin = guest.status_checkin === 'presente';

    return (
        <div className="min-h-screen" style={{ background: `linear-gradient(160deg, ${primary} 0%, #000 100%)` }}>

            {/* Capa */}
            {invite.cover_image && (
                <div className="w-full h-56 overflow-hidden relative">
                    <img src={invite.cover_image} alt="capa" className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
                </div>
            )}

            <div className="max-w-md mx-auto px-5 pb-12 pt-8 space-y-6">

                {/* Header */}
                <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-50" style={{ color: accent }}>
                        {invite.honoree_name ? 'CONVITE ESPECIAL' : 'CONVITE PESSOAL'}
                    </p>
                    {invite.honoree_name && (
                        <h1 className="text-3xl font-black text-white tracking-tight leading-none mt-1 mb-2">
                            {invite.honoree_name}
                        </h1>
                    )}
                    <h2 className="text-xl font-black text-white/90 tracking-tight leading-none">
                        {invite.event_name || 'Evento Especial'}
                    </h2>
                    <p className="text-white/70 text-sm font-medium">
                        {invite.message || 'Você está convidado para este momento especial.'}
                    </p>
                </div>

                {/* Card convidado */}
                <div className="rounded-3xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0"
                            style={{ background: accent }}>
                            {guest.nome[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Convidado</p>
                            <p className="text-white font-black text-lg leading-tight">{guest.nome}</p>
                            {guest.dependentes > 0 && (
                                <p className="text-xs font-bold opacity-60 text-white mt-0.5">
                                    +{guest.dependentes} acompanhante{guest.dependentes > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Atenção: confirmação obrigatória para receber QR */}
                    {rsvp === 'idle' && (
                        <p className="text-[10px] text-yellow-300/80 font-bold text-center bg-yellow-400/10 rounded-xl py-2 px-3">
                            ⚠️ Confirme sua presença abaixo para receber o QR Code de entrada
                        </p>
                    )}
                </div>

                {/* Detalhes do evento */}
                <div className="grid grid-cols-1 gap-3">
                    {invite.event_date && (
                        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <span className="text-2xl">📅</span>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Data</p>
                                <p className="text-white font-bold text-sm">{formatDate(invite.event_date)}</p>
                                {invite.event_time && <p className="text-white/60 text-xs mt-0.5">às {invite.event_time}</p>}
                            </div>
                        </div>
                    )}
                    {invite.event_location && (
                        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <span className="text-2xl mt-1">📍</span>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Local</p>
                                <p className="text-white font-bold text-sm">{invite.event_location}</p>
                                {invite.event_address && (
                                    <p className="text-white/60 font-medium text-[11px] leading-tight mt-1">{invite.event_address}</p>
                                )}
                                {invite.event_location_map_url && (
                                    <a href={invite.event_location_map_url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs font-black mt-2 inline-block" style={{ color: accent }}>
                                        Ver no mapa →
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                    {invite.dress_code && (
                        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <span className="text-2xl">👗</span>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 text-white">Dress Code</p>
                                <p className="text-white font-bold text-sm">{invite.dress_code}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RSVP — Confirmar Presença ─────────────────────────────── */}
                {!jaFezCheckin && (
                    <div className="rounded-3xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-50 text-white text-center">
                            Confirme sua presença
                        </p>

                        {/* Idle / loading */}
                        {(rsvp === 'idle' || rsvp === 'loading' || rsvp === 'erro') && (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => responder('confirmado')}
                                    disabled={rsvp === 'loading'}
                                    className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-900 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                                    style={{ background: accent }}
                                >
                                    {rsvp === 'loading' ? (
                                        <><div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> Confirmando...</>
                                    ) : '✅ Confirmar Presença'}
                                </button>
                                <button
                                    onClick={() => responder('recusado')}
                                    disabled={rsvp === 'loading'}
                                    className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-white/50 transition-all hover:text-white/80 disabled:opacity-40"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                    Não poderei comparecer
                                </button>
                                {rsvp === 'erro' && (
                                    <p className="text-center text-rose-400 text-xs font-bold">{rsvpMsg}</p>
                                )}
                            </div>
                        )}

                        {/* Confirmado */}
                        {rsvp === 'confirmado' && (
                            <div className="text-center space-y-2 py-3">
                                <div className="text-4xl">🎉</div>
                                <p className="text-white font-black text-lg">Presença Confirmada!</p>
                                <p className="text-white/60 text-sm font-medium">{rsvpMsg || 'Até breve!'}</p>
                                <p className="text-white/40 text-xs">Guarde o QR Code abaixo para entrada no evento</p>
                            </div>
                        )}

                        {/* Recusado */}
                        {rsvp === 'recusado' && (
                            <div className="text-center space-y-2 py-3">
                                <div className="text-4xl">💙</div>
                                <p className="text-white font-black">Resposta registada</p>
                                <p className="text-white/60 text-sm font-medium">{rsvpMsg || 'Lamentamos que não possa vir.'}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Check-in já feito */}
                {jaFezCheckin && (
                    <div className="rounded-3xl p-5 text-center space-y-1" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <p className="text-3xl">✅</p>
                        <p className="text-emerald-400 font-black">Check-in já realizado!</p>
                        <p className="text-emerald-400/60 text-xs font-medium">Boa festa, {guest.nome.split(' ')[0]}!</p>
                    </div>
                )}

                {/* QR Code — aparece APENAS se confirmado ou já com check-in */}
                {(rsvp === 'confirmado' || jaFezCheckin) && (
                    <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="p-5 pb-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 text-white">
                                QR Code de Entrada
                            </p>
                            <p className="text-white/60 text-xs mt-1 font-medium">
                                Apresente este código na entrada do evento
                            </p>
                        </div>
                        <div ref={qrRef} className="flex items-center justify-center p-6">
                            <div className="bg-white p-4 rounded-2xl shadow-2xl">
                                <QRCodeSVG
                                    value={qr_url}
                                    size={200}
                                    bgColor="#ffffff"
                                    fgColor={primary}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                        </div>
                        <div className="px-5 pb-5">
                            <button
                                onClick={downloadQR}
                                className="qr-download-btn w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all"
                                style={{ background: accent }}
                            >
                                📥 Salvar QR Code
                            </button>
                        </div>
                    </div>
                )}

                <p className="text-center text-white/30 text-[10px] font-bold uppercase tracking-widest pb-4">
                    Este convite é pessoal e intransferível
                </p>
            </div>
        </div>
    );
}
