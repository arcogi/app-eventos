const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eventos_db',
    password: process.env.DB_PASSWORD || 'senha_dev_123',
    port: process.env.DB_PORT || 5432,
});

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3003', 'http://localhost:3004']
}));
app.use(express.json());

// Garantir diretório de uploads
const uploadDir = path.join(__dirname, 'uploads', 'videos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Servir arquivos estáticos (VPS)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Em produção, o Express atua como servidor Web para os SPAs (React/Vite)
app.use(express.static(path.join(__dirname, '../apps/web/dist')));
app.use('/admin', express.static(path.join(__dirname, '../apps/admin/dist')));

// Rota de Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'API do CRM Online e Operante!', versão: '1.0' });
});


// Configurar armazenamento (Multer) para Vídeos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Gera um nome de arquivo robusto sem sobrescrever desnecessariamente
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'vps_' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Inicialização do Banco de Dados
async function initDB() {
    try {
        const client = await pool.connect();

        // Extensão para UUID (Opcional, mas boa prática)
        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        // Tabela de Configurações
        await client.query(`
      CREATE TABLE IF NOT EXISTS event_configs (
        id SERIAL PRIMARY KEY,
        title TEXT,
        subtitle TEXT,
        video_url TEXT,
        btn_confirm_text TEXT,
        btn_doubt_text TEXT,
        btn_decline_text TEXT,
        success_message TEXT,
        footer_text TEXT
      );
    `);

        // Tabela de Convidados (CRM) - NOVO MODELO
        await client.query(`
      CREATE TABLE IF NOT EXISTS guests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        apelido TEXT,
        celular TEXT UNIQUE NOT NULL,
        idade TEXT CHECK (idade IN ('Menor', 'Adolescente', 'Adulto')),
        sexo TEXT CHECK (sexo IN ('Masculino', 'Feminino')),
        dependentes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Confirmado', 'Duvida', 'Recusado')),
        data_resposta TIMESTAMP,
        tipo_evento TEXT DEFAULT 'Save the Date' CHECK (tipo_evento IN ('Save the Date', 'Convite'))
      );
    `);

        // Migração: adicionar mensagens de sucesso separadas e video_file
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS msg_success_confirm TEXT;`);
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS msg_success_doubt TEXT;`);
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS msg_success_decline TEXT;`);
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS video_file TEXT;`);

        // Migração: adicionar coluna status_envio em guests e apelido
        await client.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS apelido TEXT;`);
        await client.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS status_envio TEXT DEFAULT 'Pendente';`);

        // Inserir linha padrão de config se estiver vazia
        const res = await client.query('SELECT COUNT(*) FROM event_configs');
        if (parseInt(res.rows[0].count) === 0) {
            await client.query(`
        INSERT INTO event_configs (
          title, subtitle, btn_confirm_text, btn_doubt_text, btn_decline_text, msg_success_confirm, msg_success_doubt, msg_success_decline
        ) VALUES (
          'SAVE THE DATE', 
          'Um momento especial aproxima-se', 
          'Confirmar Presença', 
          'Ainda não tenho a certeza', 
          'Infelizmente não poderei ir', 
          'Obrigado pela tua confirmação.',
          'Anotado, esperamos que consiga ir!',
          'Que pena, sentiremos sua falta.'
        )
      `);
        }

        client.release();
        console.log('✅ Banco de Dados Inicializado (PostgreSQL)');
    } catch (err) {
        console.error('❌ Erro ao inicializar DB:', err);
    }
}

initDB();

// --- ROTAS DE CONFIGURAÇÃO ---

app.get('/api/config', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM event_configs LIMIT 1');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/config', async (req, res) => {
    const { title, subtitle, video_file, btn_confirm_text, btn_doubt_text, btn_decline_text, msg_success_confirm, msg_success_doubt, msg_success_decline, footer_text } = req.body;
    try {
        await pool.query(`
      UPDATE event_configs SET 
        title=$1, subtitle=$2, video_file=$3, btn_confirm_text=$4, 
        btn_doubt_text=$5, btn_decline_text=$6, msg_success_confirm=$7, msg_success_doubt=$8,
        msg_success_decline=$9, footer_text=$10
      WHERE id=(SELECT id FROM event_configs LIMIT 1)
    `, [title, subtitle, video_file, btn_confirm_text, btn_doubt_text, btn_decline_text, msg_success_confirm, msg_success_doubt, msg_success_decline, footer_text]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/upload/video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum vídeo enviado.' });
        }
        const video_file = req.file.filename;

        // Atualizar config com o novo arquivo de vídeo se a flag updateConfig for passada
        if (req.body.updateConfig === 'true') {
            await pool.query(`UPDATE event_configs SET video_file=$1 WHERE id=(SELECT id FROM event_configs LIMIT 1)`, [video_file]);
        }

        res.json({ success: true, file: video_file, path: `/uploads/videos/${video_file}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROTAS DE GUESTS (CRM) ---

app.get('/api/guests', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM guests ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function formatPhone(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
        cleaned = cleaned.substring(2);
    }
    return cleaned;
}

app.post('/api/guests', async (req, res) => {
    const { nome, apelido, celular, idade, sexo, dependentes, tipo_evento } = req.body;
    const celularFormatado = formatPhone(celular);
    try {
        const result = await pool.query(`
      INSERT INTO guests (nome, apelido, celular, idade, sexo, dependentes, tipo_evento)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [nome, apelido || nome, celularFormatado, idade, sexo, dependentes || 0, tipo_evento || 'Save the Date']);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ error: 'Este número de celular já está cadastrado.' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Rota para Inserção em Massa (Excel)
app.post('/api/guests/bulk', async (req, res) => {
    const guests = req.body.guests;
    if (!Array.isArray(guests)) return res.status(400).json({ error: 'Formato inválido.' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let inseridos = 0;
        let erros = 0;

        for (const guest of guests) {
            const celularFormatado = formatPhone(guest.celular);
            if (!celularFormatado) {
                erros++;
                continue;
            }

            try {
                const queryRes = await client.query(`
                    INSERT INTO guests (nome, apelido, celular, dependentes, idade, sexo, status, tipo_evento)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (celular) DO UPDATE 
                    SET 
                      dependentes = EXCLUDED.dependentes,
                      apelido = EXCLUDED.apelido,
                      nome = EXCLUDED.nome
                    RETURNING id
                `, [
                    guest.nome,
                    guest.apelido || guest.nome,
                    celularFormatado,
                    guest.dependentes || 0,
                    'Adulto', // fallback
                    'Masculino', // fallback
                    'Pendente', // Forçado pela interface SD
                    'Save the Date' // Forçado pela interface SD
                ]);

                // Se RETURNING id retornou algo, a linha foi criada de facto
                if (queryRes.rowCount > 0) {
                    inseridos++;
                }
            } catch (e) {
                erros++;
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, inseridos, erros });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Obter dados de um convidado específico
app.get('/api/guests/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT id, nome, apelido, celular, status FROM guests WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Convidado não encontrado.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Editar convidado (Inline Edit e Status Envio)
app.patch('/api/guests/:id', async (req, res) => {
    const { id } = req.params;
    let { nome, apelido, celular, status_envio } = req.body;
    if (celular) celular = formatPhone(celular);
    try {
        const result = await pool.query(`
            UPDATE guests 
            SET 
                nome = COALESCE($1, nome),
                apelido = COALESCE($2, apelido),
                celular = COALESCE($3, celular),
                status_envio = COALESCE($4, status_envio)
            WHERE id = $5
            RETURNING *
        `, [nome, apelido, celular, status_envio, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Convidado não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Excluir convidado individual
app.delete('/api/guests/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM guests WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Convidado não encontrado.' });
        res.json({ success: true, deleted: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Limpar Base VIP inteira
app.delete('/api/guests', async (req, res) => {
    try {
        await pool.query('DELETE FROM guests');
        res.json({ success: true, message: 'Base limpa com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota de RSVP via Link Único (UUID)
app.post('/api/guests/:id/rsvp', async (req, res) => {
    const { id } = req.params;
    const { status, nome } = req.body;
    try {
        const result = await pool.query(`
      UPDATE guests 
      SET status=$1, data_resposta=NOW(), nome=COALESCE($3, nome) 
      WHERE id=$2
      RETURNING *
    `, [status, id, nome || null]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Convidado não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROTAS WHATSAPP EVOLUTION API (REAL) ---
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'eventos_arcogi_global_123';
const INSTANCE_NAME = 'EventosApp';

app.get('/api/whatsapp/status', async (req, res) => {
    try {
        const resp = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE_NAME}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });

        if (!resp.ok) {
            return res.json({ status: 'DISCONNECTED', qrCode: '' });
        }

        const data = await resp.json();
        const state = data?.instance?.state || 'DISCONNECTED';

        let qrCodeString = '';
        if (state === 'connecting') {
            // Ir buscar Base64 do QR Code se ele já tiver sido emitido na aba /connect
            qrCodeString = req.app.locals.lastQrCode || '';
            return res.json({ status: 'QR_CODE', qrCode: qrCodeString });
        } else if (state === 'open') {
            return res.json({ status: 'CONNECTED', qrCode: '' });
        }

        res.json({ status: 'DISCONNECTED', qrCode: '' });
    } catch (e) {
        res.json({ status: 'DISCONNECTED', qrCode: '' });
    }
});

app.post('/api/whatsapp/connect', async (req, res) => {
    try {
        // Tenta criar a instância, pedindo o qrcode
        const resp = await fetch(`${EVOLUTION_URL}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({
                instanceName: INSTANCE_NAME,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            })
        });

        const data = await resp.json();

        // Acordar a instância caso ela tenha sido criada em estado de dormência (v2 behavior)
        await fetch(`${EVOLUTION_URL}/instance/start/${INSTANCE_NAME}`, {
            method: 'GET',
            headers: { 'apikey': EVOLUTION_API_KEY }
        });

        // Aguarda 3 segundos para o motor Baileys da Evolution API construir o WebSocket e cuspir o QR
        await new Promise(r => setTimeout(r, 3000));

        if (data && data.qrcode && data.qrcode.base64) {
            req.app.locals.lastQrCode = data.qrcode.base64;
            return res.json({ status: 'QR_CODE', qrCode: data.qrcode.base64 });
        }

        // Tenta até 3 vezes buscar o QR enquanto a API acorda o Chromium
        let resData = '';
        for (let i = 0; i < 3; i++) {
            const connectResp = await fetch(`${EVOLUTION_URL}/instance/connect/${INSTANCE_NAME}?_qrc=true`, {
                method: 'GET',
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            const connectData = await connectResp.json();

            if (connectData && (connectData.base64 || connectData.pairingCode)) {
                req.app.locals.lastQrCode = connectData.base64 || '';
                req.app.locals.lastPairingCode = connectData.pairingCode || '';
                return res.json({
                    status: 'QR_CODE',
                    qrCode: connectData.base64 || '',
                    pairingCode: connectData.pairingCode || ''
                });
            }

            // Se ela já estiver conectada
            if (connectData && connectData.instance && connectData.instance.state === 'open') {
                return res.json({ status: 'CONNECTED', qrCode: '', pairingCode: '' });
            }
            // Wait 2s before retry
            await new Promise(r => setTimeout(r, 2000));
        }

        res.json({
            status: 'QR_CODE',
            qrCode: req.app.locals.lastQrCode || '',
            pairingCode: req.app.locals.lastPairingCode || ''
        });
    } catch (e) {
        res.status(500).json({ status: 'DISCONNECTED', error: e.message });
    }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    try {
        await fetch(`${EVOLUTION_URL}/instance/logout/${INSTANCE_NAME}`, {
            method: 'DELETE',
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        res.json({ status: 'DISCONNECTED' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint Automação de Disparo (Evolution API Real)
app.post('/api/whatsapp/send', async (req, res) => {
    const { guestId, phone, message } = req.body;
    try {
        // Verificar se está aberto ("open")
        const stateResp = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE_NAME}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        const stateData = await stateResp.json();
        if (stateData?.instance?.state !== 'open') {
            await pool.query(`UPDATE guests SET status_envio='Erro' WHERE id=$1`, [guestId]);
            return res.status(403).json({ error: 'WhatsApp não está conectado na Evolution API' });
        }

        // Formatar telemóvel para padrão E.164 (55 + DDD + Numero) com ou sem o '@s.whatsapp.net'
        const cleanPhone = phone.replace(/\D/g, ''); // só os números brutos
        const numberWpp = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        // Disparo Real de Mensagem de Texto
        const sendResp = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({
                number: numberWpp,
                options: {
                    delay: 1500,
                    presence: 'composing'
                },
                textMessage: {
                    text: message
                }
            })
        });

        if (!sendResp.ok) {
            const errData = await sendResp.json().catch(() => ({}));
            console.error('Evolution API Error:', errData);
            await pool.query(`UPDATE guests SET status_envio = 'Erro' WHERE id = $1`, [guestId]);
            return res.status(500).json({ error: 'A Evolution API rejeitou o disparo.', details: errData });
        }

        // Atualizar banco de dados
        await pool.query(`UPDATE guests SET status_envio = 'Enviado' WHERE id = $1`, [guestId]);
        res.json({ success: true, message: 'Disparo via Evolution API efetuado com sucesso!' });
    } catch (err) {
        await pool.query(`UPDATE guests SET status_envio = 'Erro' WHERE id = $1`, [guestId]);
        res.status(500).json({ error: err.message });
    }
});

// --- Fallback do React Router (SPAs) DEPOIS das APIS ---
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../apps/admin/dist', 'index.html'));
});
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, '../apps/web/dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando no IP: http://0.0.0.0:${PORT}`);
});
