const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'arcogi_eventos_jwt_secret_2026';
// Admin credentials: admin@admin.com / Qaz2026!@#
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@admin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Qaz2026!@#';
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

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
    origin: [
        'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
        'http://localhost:3001', 'http://localhost:3003', 'http://localhost:3004',
        'http://familia-rein.cloud', 'https://familia-rein.cloud',
        'http://www.familia-rein.cloud', 'https://www.familia-rein.cloud',
        'http://187.124.82.41:3001'
    ]
}));
app.use(express.json({ limit: '200mb' }));

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

// Rota de Login Admin
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (email !== ADMIN_EMAIL) return res.status(401).json({ error: 'Credenciais inválidas.' });
    const ok = await bcrypt.compare(password, ADMIN_HASH);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

// Middleware de autenticação
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autorizado.' });
    try {
        jwt.verify(auth.split(' ')[1], JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}

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
const upload = multer({ storage: storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB max

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
        await client.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS data_envio TIMESTAMP;`);

        // Campos de identidade do evento
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS event_name TEXT;`);
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS honorees TEXT;`);
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS slogan TEXT;`);
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS event_date DATE;`);
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS confirmation_deadline DATE;`);

        // Short code para URLs amigáveis
        await client.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS short_code TEXT;`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_short_code ON guests(short_code);`);
        // Gerar short_code para guests existentes que não tenham
        const noCode = await client.query(`SELECT id FROM guests WHERE short_code IS NULL`);
        for (const row of noCode.rows) {
            let code;
            do { code = generateShortCode(); } while ((await client.query('SELECT 1 FROM guests WHERE short_code=$1', [code])).rowCount > 0);
            await client.query('UPDATE guests SET short_code=$1 WHERE id=$2', [code, row.id]);
        }

        // Tabela de backup para rollback de resets
        await client.query(`
          CREATE TABLE IF NOT EXISTS guests_backup (
            backup_id SERIAL PRIMARY KEY,
            backup_date TIMESTAMP DEFAULT NOW(),
            backup_type TEXT,
            guest_id UUID,
            status TEXT,
            status_envio TEXT,
            data_envio TIMESTAMP,
            data_resposta TIMESTAMP
          );
        `);

        // Histórico permanente de envios e respostas (nunca é apagado por resets)
        await client.query(`
          CREATE TABLE IF NOT EXISTS guests_history (
            id SERIAL PRIMARY KEY,
            guest_id UUID NOT NULL,
            acao TEXT NOT NULL,
            detalhes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);

        // Tabela de contas remetentes (multi-account WhatsApp)
        await client.query(`
          CREATE TABLE IF NOT EXISTS sender_accounts (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            celular TEXT UNIQUE NOT NULL,
            instance_name TEXT NOT NULL,
            status TEXT DEFAULT 'disconnected',
            daily_count INTEGER DEFAULT 0,
            daily_limit INTEGER DEFAULT 35,
            last_reset DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);

        // Migração: sender_name e prazo_resposta em guests
        await client.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS sender_name TEXT;`);
        await client.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS sender_artigo TEXT;`);
        await client.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS prazo_resposta DATE;`);

        // Tabela de histórico de fases do evento (snapshot completo ao finalizar)
        await client.query(`
          CREATE TABLE IF NOT EXISTS event_phases_history (
            id SERIAL PRIMARY KEY,
            phase_name TEXT NOT NULL,
            closed_at TIMESTAMP DEFAULT NOW(),
            stats JSONB,
            guests_snapshot JSONB,
            notes TEXT
          );
        `);

        // Migração: whatsapp_msg_template em event_configs
        await client.query(`ALTER TABLE event_configs ADD COLUMN IF NOT EXISTS whatsapp_msg_template TEXT DEFAULT '{{intro}}\n\nTemos um convite especial para você{{deps}}.\n\n🎬 Assista até o final e confirme sua presença:\n\n{{link}}\n\n📌 Caso já tenha confirmado, por favor confirme novamente pelo link acima.';`);

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
    const { title, subtitle, video_file, btn_confirm_text, btn_doubt_text, btn_decline_text,
        msg_success_confirm, msg_success_doubt, msg_success_decline, footer_text,
        event_name, honorees, slogan, event_date, confirmation_deadline, whatsapp_msg_template } = req.body;
    try {
        await pool.query(`
      UPDATE event_configs SET 
        title=$1, subtitle=$2, video_file=$3, btn_confirm_text=$4, 
        btn_doubt_text=$5, btn_decline_text=$6, msg_success_confirm=$7, msg_success_doubt=$8,
        msg_success_decline=$9, footer_text=$10,
        event_name=$11, honorees=$12, slogan=$13, event_date=$14, confirmation_deadline=$15,
        whatsapp_msg_template=$16
      WHERE id=(SELECT id FROM event_configs LIMIT 1)
    `, [title, subtitle, video_file, btn_confirm_text, btn_doubt_text, btn_decline_text,
            msg_success_confirm, msg_success_doubt, msg_success_decline, footer_text,
            event_name, honorees, slogan, event_date || null, confirmation_deadline || null, whatsapp_msg_template || null]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Verificação de telemóvel (segurança do vídeo) ---
app.post('/api/guests/:id/verify', async (req, res) => {
    const { id } = req.params;
    const { celular } = req.body;
    if (!celular) return res.status(400).json({ error: 'Telemóvel obrigatório.' });
    try {
        const result = await pool.query('SELECT id, celular FROM guests WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Convidado não encontrado.' });
        const clean = (s) => String(s).replace(/\D/g, '');
        const stored = clean(result.rows[0].celular);
        const input = clean(celular);
        const match = stored === input || stored === `55${input}` || `55${stored}` === input || stored.slice(-8) === input.slice(-8);
        if (!match) return res.status(401).json({ error: 'Número não coincide com o convite.' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Lookup por telemóvel (WhatsApp Web / browser sem guest_id) ---
app.post('/api/guests/lookup', async (req, res) => {
    const { celular } = req.body;
    if (!celular) return res.status(400).json({ error: 'Telemóvel obrigatório.' });
    try {
        const clean = (s) => String(s).replace(/\D/g, '');
        const input = clean(celular);
        // Procura por últimos 8 dígitos para suportar com/sem código do país
        const result = await pool.query(
            `SELECT id, nome, status FROM guests WHERE REGEXP_REPLACE(celular, '[^0-9]', '', 'g') LIKE $1`,
            [`%${input.slice(-9)}`]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Nenhum convite encontrado com este número.' });
        res.json({ id: result.rows[0].id, nome: result.rows[0].nome, status: result.rows[0].status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Reset de Envios com Erro (só os com Erro voltam a Pendente) ---
app.post('/api/guests/reset-envios', requireAuth, async (req, res) => {
    try {
        await pool.query(`INSERT INTO guests_backup (backup_type, guest_id, status, status_envio, data_envio, data_resposta)
            SELECT 'reset-envios', id, status, status_envio, data_envio, data_resposta FROM guests WHERE status_envio='Erro'`);
        const result = await pool.query(`UPDATE guests SET status_envio='Pendente', data_envio=NULL WHERE status_envio='Erro'`);
        res.json({ success: true, message: `${result.rowCount} envio(s) com erro resetado(s).` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Reset de TODOS os Envios (Enviado+Erro → Pendente) ---
app.post('/api/guests/reset-envios-todos', requireAuth, async (req, res) => {
    try {
        await pool.query(`INSERT INTO guests_backup (backup_type, guest_id, status, status_envio, data_envio, data_resposta)
            SELECT 'reset-envios-todos', id, status, status_envio, data_envio, data_resposta FROM guests WHERE status_envio != 'Pendente'`);
        const result = await pool.query(`UPDATE guests SET status_envio='Pendente', data_envio=NULL WHERE status_envio != 'Pendente'`);
        res.json({ success: true, message: `${result.rowCount} envio(s) resetado(s).` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Reset de Respostas (limpa tudo: status RSVP + datas + envio) ---
app.post('/api/guests/reset-respostas', requireAuth, async (req, res) => {
    try {
        // Snapshot antes do reset
        await pool.query(`INSERT INTO guests_backup (backup_type, guest_id, status, status_envio, data_envio, data_resposta)
            SELECT 'reset-respostas', id, status, status_envio, data_envio, data_resposta FROM guests`);
        await pool.query(`UPDATE guests SET status='Pendente', data_resposta=NULL, status_envio='Pendente', data_envio=NULL`);
        res.json({ success: true, message: 'Respostas e envios resetados. Backup criado.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Rollback: desfazer último reset ---
app.post('/api/guests/rollback', requireAuth, async (req, res) => {
    try {
        // Encontrar o último backup
        const lastBackup = await pool.query(`SELECT DISTINCT backup_date, backup_type FROM guests_backup ORDER BY backup_date DESC LIMIT 1`);
        if (lastBackup.rows.length === 0) return res.status(404).json({ error: 'Nenhum backup disponível para rollback.' });

        const { backup_date, backup_type } = lastBackup.rows[0];
        const backupRows = await pool.query(`SELECT * FROM guests_backup WHERE backup_date = $1`, [backup_date]);

        let restored = 0;
        for (const row of backupRows.rows) {
            await pool.query(`UPDATE guests SET status=$1, status_envio=$2, data_envio=$3, data_resposta=$4 WHERE id=$5`,
                [row.status, row.status_envio, row.data_envio, row.data_resposta, row.guest_id]);
            restored++;
        }

        // Remover o backup usado
        await pool.query(`DELETE FROM guests_backup WHERE backup_date = $1`, [backup_date]);

        res.json({ success: true, message: `Rollback concluído! ${restored} convidado(s) restaurado(s) do backup ${backup_type}.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Histórico permanente de ações ---
app.get('/api/guests/history', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT h.*, g.nome, g.celular, g.short_code 
            FROM guests_history h 
            LEFT JOIN guests g ON g.id = h.guest_id 
            ORDER BY h.created_at DESC 
            LIMIT 500
        `);
        res.json(result.rows);
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

// Gerar código curto alfanumérico de 6 caracteres
function generateShortCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I,O,0,1 para evitar confusão
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

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
        // Gerar short_code único
        let short_code;
        do { short_code = generateShortCode(); } while ((await pool.query('SELECT 1 FROM guests WHERE short_code=$1', [short_code])).rowCount > 0);

        const result = await pool.query(`
      INSERT INTO guests (nome, apelido, celular, idade, sexo, dependentes, tipo_evento, short_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [nome, apelido || nome, celularFormatado, idade, sexo, dependentes || 0, tipo_evento || 'Save the Date', short_code]);
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
                // Validar idade e sexo com fallback
                const idadeValida = ['Adulto', 'Adolescente', 'Menor'].includes(guest.idade) ? guest.idade : 'Adulto';
                const sexoValido = ['Masculino', 'Feminino'].includes(guest.sexo) ? guest.sexo : 'Masculino';

                const queryRes = await client.query(`
                    INSERT INTO guests (nome, apelido, celular, dependentes, idade, sexo, status, tipo_evento, short_code, sender_name, sender_artigo, prazo_resposta)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (celular) DO UPDATE 
                    SET 
                      dependentes = EXCLUDED.dependentes,
                      apelido = EXCLUDED.apelido,
                      nome = EXCLUDED.nome,
                      idade = EXCLUDED.idade,
                      sexo = EXCLUDED.sexo,
                      sender_name = COALESCE(EXCLUDED.sender_name, guests.sender_name),
                      sender_artigo = COALESCE(EXCLUDED.sender_artigo, guests.sender_artigo),
                      prazo_resposta = COALESCE(EXCLUDED.prazo_resposta, guests.prazo_resposta)
                    RETURNING id, short_code
                `, [
                    guest.nome,
                    guest.apelido || guest.nome,
                    celularFormatado,
                    guest.dependentes || 0,
                    idadeValida,
                    sexoValido,
                    'Pendente',
                    'Save the Date',
                    generateShortCode(),
                    guest.envio || guest.sender_name || null,
                    guest.artigo || guest.sender_artigo || null,
                    guest.prazo_resposta || null
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
    let { nome, apelido, celular, status_envio, dependentes } = req.body;
    if (celular) celular = formatPhone(celular);
    if (dependentes !== undefined) dependentes = parseInt(dependentes) || 0;
    try {
        const result = await pool.query(`
            UPDATE guests 
            SET 
                nome = COALESCE($1, nome),
                apelido = COALESCE($2, apelido),
                celular = COALESCE($3, celular),
                status_envio = COALESCE($4, status_envio),
                dependentes = COALESCE($5, dependentes)
            WHERE id = $6
            RETURNING *
        `, [nome, apelido, celular, status_envio, dependentes !== undefined ? dependentes : null, id]);

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

// Rota de RSVP via Link Único (UUID) — sempre aceita o último status
app.post('/api/guests/:id/rsvp', async (req, res) => {
    const { id } = req.params;
    const { status, nome } = req.body;
    try {
        const existing = await pool.query('SELECT status FROM guests WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Convidado não encontrado.' });
        const statusAnterior = existing.rows[0].status;

        const result = await pool.query(`
      UPDATE guests 
      SET status=$1, data_resposta=NOW(), nome=COALESCE($3, nome) 
      WHERE id=$2
      RETURNING *
    `, [status, id, nome || null]);

        // Log permanente (com status anterior)
        await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
            [id, 'RSVP', `${statusAnterior} → ${status}`]);

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- ROTAS WHATSAPP (Cloud API oficial + Evolution API fallback) ---
// Cloud API (Meta oficial) - sem risco de ban
const WA_CLOUD_TOKEN = process.env.WA_CLOUD_TOKEN || '';
const WA_CLOUD_PHONE_ID = process.env.WA_CLOUD_PHONE_ID || '';
const WA_CLOUD_API_VERSION = process.env.WA_CLOUD_API_VERSION || 'v21.0';

// Evolution API (multi-account)
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'eventos_arcogi_global_123';
const DEFAULT_INSTANCE = 'EventosApp';

// Detecta qual API usar
const useCloudAPI = () => !!(WA_CLOUD_TOKEN && WA_CLOUD_PHONE_ID);

// Helper: resetar contadores diários das contas remetentes
async function resetDailyCountsIfNeeded() {
    await pool.query(`UPDATE sender_accounts SET daily_count = 0, last_reset = CURRENT_DATE WHERE last_reset < CURRENT_DATE`);
}

app.get('/api/whatsapp/status', async (req, res) => {
    if (useCloudAPI()) {
        try {
            const resp = await fetch(`https://graph.facebook.com/${WA_CLOUD_API_VERSION}/${WA_CLOUD_PHONE_ID}`, {
                headers: { 'Authorization': `Bearer ${WA_CLOUD_TOKEN}` }
            });
            if (resp.ok) {
                return res.json({ status: 'CONNECTED', mode: 'cloud_api', qrCode: '' });
            }
            return res.json({ status: 'DISCONNECTED', mode: 'cloud_api', error: 'Token inválido' });
        } catch {
            return res.json({ status: 'DISCONNECTED', mode: 'cloud_api' });
        }
    }

    // Fallback: Evolution API
    try {
        const resp = await fetch(`${EVOLUTION_URL}/instance/connectionState/${DEFAULT_INSTANCE}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        if (!resp.ok) return res.json({ status: 'DISCONNECTED', qrCode: '', mode: 'evolution' });

        const data = await resp.json();
        const state = data?.instance?.state || 'DISCONNECTED';

        if (state === 'connecting') {
            return res.json({ status: 'QR_CODE', qrCode: req.app.locals.lastQrCode || '', mode: 'evolution' });
        } else if (state === 'open') {
            return res.json({ status: 'CONNECTED', qrCode: '', mode: 'evolution' });
        }
        res.json({ status: 'DISCONNECTED', qrCode: '', mode: 'evolution' });
    } catch {
        res.json({ status: 'DISCONNECTED', qrCode: '', mode: 'evolution' });
    }
});

app.post('/api/whatsapp/connect', async (req, res) => {
    if (useCloudAPI()) {
        return res.json({ status: 'CONNECTED', mode: 'cloud_api', message: 'Cloud API conectada. Não precisa de QR Code.' });
    }
    try {
        await fetch(`${EVOLUTION_URL}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ instanceName: DEFAULT_INSTANCE, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
        });

        for (let attempt = 0; attempt < 3; attempt++) {
            const connectResp = await fetch(`${EVOLUTION_URL}/instance/connect/${DEFAULT_INSTANCE}`, {
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            const connectData = await connectResp.json();

            if (connectData && (connectData.base64 || connectData.pairingCode)) {
                req.app.locals.lastQrCode = connectData.base64 || '';
                return res.json({
                    status: 'QR_CODE',
                    qrCode: connectData.base64 || '',
                    pairingCode: connectData.pairingCode || ''
                });
            }
            if (connectData?.instance?.state === 'open') {
                return res.json({ status: 'CONNECTED', qrCode: '', pairingCode: '' });
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        res.json({ status: 'QR_CODE', qrCode: req.app.locals.lastQrCode || '' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    if (useCloudAPI()) {
        return res.json({ status: 'DISCONNECTED', message: 'Cloud API não precisa de desconexão.' });
    }
    try {
        await fetch(`${EVOLUTION_URL}/instance/logout/${DEFAULT_INSTANCE}`, {
            method: 'DELETE', headers: { 'apikey': EVOLUTION_API_KEY }
        });
        res.json({ status: 'DISCONNECTED' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Disparo: auto-seleciona Cloud API ou Evolution API ---
app.post('/api/whatsapp/send', async (req, res) => {
    const { guestId, phone, message } = req.body;
    const cleanPhone = phone.replace(/\D/g, '');
    const numberE164 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    try {
        if (useCloudAPI()) {
            // --- WhatsApp Cloud API (Meta Oficial) ---
            const resp = await fetch(`https://graph.facebook.com/${WA_CLOUD_API_VERSION}/${WA_CLOUD_PHONE_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${WA_CLOUD_TOKEN}`
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: numberE164,
                    type: 'text',
                    text: { body: message }
                })
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                console.error('Cloud API Error:', errData);
                await pool.query(`UPDATE guests SET status_envio = 'Erro' WHERE id = $1`, [guestId]);
                await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
                    [guestId, 'ERRO_ENVIO', `Cloud API: ${errData?.error?.message || JSON.stringify(errData)}`]).catch(() => { });
                return res.status(500).json({ error: 'Cloud API rejeitou o envio.', details: errData });
            }

            await pool.query(`UPDATE guests SET status_envio = 'Enviado', data_envio = NOW() WHERE id = $1`, [guestId]);
            await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
                [guestId, 'ENVIO', 'Enviado via WhatsApp Cloud API (oficial Meta)']);
            return res.json({ success: true, message: 'Enviado via Cloud API ✅' });

        } else {
            // --- Evolution API (fallback) ---
            const stateResp = await fetch(`${EVOLUTION_URL}/instance/connectionState/${DEFAULT_INSTANCE}`, {
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            const stateData = await stateResp.json();
            if (stateData?.instance?.state !== 'open') {
                await pool.query(`UPDATE guests SET status_envio='Erro' WHERE id=$1`, [guestId]);
                return res.status(403).json({ error: 'WhatsApp não conectado na Evolution API' });
            }

            const sendResp = await fetch(`${EVOLUTION_URL}/message/sendText/${DEFAULT_INSTANCE}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
                body: JSON.stringify({
                    number: numberE164,
                    options: { delay: 1500, presence: 'composing' },
                    textMessage: { text: message }
                })
            });

            if (!sendResp.ok) {
                const errData = await sendResp.json().catch(() => ({}));
                await pool.query(`UPDATE guests SET status_envio = 'Erro' WHERE id = $1`, [guestId]);
                await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
                    [guestId, 'ERRO_ENVIO', `Evolution: ${JSON.stringify(errData)}`]).catch(() => { });
                return res.status(500).json({ error: 'Evolution API rejeitou o disparo.', details: errData });
            }

            await pool.query(`UPDATE guests SET status_envio = 'Enviado', data_envio = NOW() WHERE id = $1`, [guestId]);
            await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
                [guestId, 'ENVIO', 'Enviado via Evolution API']);
            return res.json({ success: true, message: 'Enviado via Evolution API ✅' });
        }
    } catch (err) {
        await pool.query(`UPDATE guests SET status_envio = 'Erro' WHERE id = $1`, [guestId]);
        await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
            [guestId, 'ERRO_ENVIO', err.message]).catch(() => { });
        res.status(500).json({ error: err.message });
    }
});

// --- Rota curta para WhatsApp (ex: /c/ABC123 → /?guest_id=uuid) ---
// Aceita short_code (6 chars) ou UUID (compatibilidade retroativa)
app.get('/c/:code', async (req, res) => {
    const code = req.params.code;
    let guestId = code; // fallback: usar como UUID direto

    // Tentar resolver short_code → UUID
    try {
        const guestResult = await pool.query('SELECT id FROM guests WHERE short_code = $1', [code.toUpperCase()]);
        if (guestResult.rows.length > 0) {
            guestId = guestResult.rows[0].id;
        }
    } catch { }

    let title = 'Save the Date';
    let description = 'Você foi convidado! Confirme sua presença.';
    try {
        const cfgResult = await pool.query('SELECT event_name, honorees, slogan FROM event_configs LIMIT 1');
        if (cfgResult.rows.length > 0) {
            const cfg = cfgResult.rows[0];
            title = cfg.event_name || title;
            description = cfg.honorees ? `${cfg.honorees} - ${cfg.slogan || 'Confirme sua presença'}` : description;
        }
    } catch { }
    const targetUrl = `/?guest_id=${guestId}`;
    res.send(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta http-equiv="refresh" content="0;url=${targetUrl}">
<title>${title}</title>
</head><body><script>window.location.replace("${targetUrl}")</script></body></html>`);
});

// --- Fallback do React Router (SPAs) DEPOIS das APIS ---

// --- ROTAS DE CONTAS REMETENTES (Multi-Account) ---

// Listar contas remetentes
app.get('/api/sender-accounts', requireAuth, async (req, res) => {
    try {
        await resetDailyCountsIfNeeded();
        const result = await pool.query('SELECT * FROM sender_accounts ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Criar conta remetente
app.post('/api/sender-accounts', requireAuth, async (req, res) => {
    const { nome, celular } = req.body;
    if (!nome || !celular) return res.status(400).json({ error: 'Nome e celular obrigatórios.' });
    const celularLimpo = celular.replace(/\D/g, '');
    const instanceName = `sender_${celularLimpo}`;
    try {
        const result = await pool.query(
            `INSERT INTO sender_accounts (nome, celular, instance_name) VALUES ($1, $2, $3) RETURNING *`,
            [nome, celularLimpo, instanceName]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Celular já cadastrado.' });
        res.status(500).json({ error: err.message });
    }
});

// Excluir conta remetente
app.delete('/api/sender-accounts/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM sender_accounts WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Conta não encontrada.' });
        res.json({ success: true, deleted: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MULTI-INSTANCE WhatsApp (Evolution API) ---

// Conectar uma conta específica via QR Code
app.post('/api/whatsapp/instance/:instanceName/connect', requireAuth, async (req, res) => {
    const { instanceName } = req.params;
    try {
        // Criar instância
        await fetch(`${EVOLUTION_URL}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
        });

        // Tentar obter QR Code
        for (let attempt = 0; attempt < 3; attempt++) {
            const connectResp = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            const connectData = await connectResp.json();

            if (connectData && (connectData.base64 || connectData.pairingCode)) {
                return res.json({
                    status: 'QR_CODE',
                    qrCode: connectData.base64 || '',
                    pairingCode: connectData.pairingCode || ''
                });
            }
            if (connectData?.instance?.state === 'open') {
                await pool.query(`UPDATE sender_accounts SET status='connected' WHERE instance_name=$1`, [instanceName]);
                return res.json({ status: 'CONNECTED', qrCode: '' });
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        res.json({ status: 'QR_CODE', qrCode: '' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Status de uma instância específica
app.get('/api/whatsapp/instance/:instanceName/status', async (req, res) => {
    const { instanceName } = req.params;
    try {
        const resp = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        if (!resp.ok) {
            await pool.query(`UPDATE sender_accounts SET status='disconnected' WHERE instance_name=$1`, [instanceName]);
            return res.json({ status: 'DISCONNECTED' });
        }
        const data = await resp.json();
        const state = data?.instance?.state || 'DISCONNECTED';

        if (state === 'open') {
            await pool.query(`UPDATE sender_accounts SET status='connected' WHERE instance_name=$1`, [instanceName]);
            return res.json({ status: 'CONNECTED' });
        }
        await pool.query(`UPDATE sender_accounts SET status='disconnected' WHERE instance_name=$1`, [instanceName]);
        res.json({ status: state === 'connecting' ? 'QR_CODE' : 'DISCONNECTED' });
    } catch {
        res.json({ status: 'DISCONNECTED' });
    }
});

// Desconectar uma instância específica
app.post('/api/whatsapp/instance/:instanceName/disconnect', requireAuth, async (req, res) => {
    const { instanceName } = req.params;
    try {
        await fetch(`${EVOLUTION_URL}/instance/logout/${instanceName}`, {
            method: 'DELETE', headers: { 'apikey': EVOLUTION_API_KEY }
        });
        await pool.query(`UPDATE sender_accounts SET status='disconnected' WHERE instance_name=$1`, [instanceName]);
        res.json({ status: 'DISCONNECTED' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ENVIO BATCH com Throttling Anti-Ban ---

// Estado global do envio batch (em memória — SSE seria melhor para produção)
let batchState = { running: false, total: 0, sent: 0, errors: 0, currentGuest: '', log: [] };

app.get('/api/whatsapp/batch-status', requireAuth, (req, res) => {
    res.json(batchState);
});

app.post('/api/whatsapp/batch-stop', requireAuth, (req, res) => {
    batchState.running = false;
    res.json({ success: true, message: 'Envio batch será interrompido.' });
});

app.post('/api/whatsapp/send-batch', requireAuth, async (req, res) => {
    if (batchState.running) return res.status(409).json({ error: 'Envio batch já em andamento.' });

    const { senderName } = req.body; // opcional: filtrar por remetente

    try {
        await resetDailyCountsIfNeeded();

        // Pegar convidados pendentes (opcionalmente filtrados por sender)
        let query = `SELECT g.*, sa.instance_name, sa.nome as sender_display_name, sa.daily_count, sa.daily_limit, sa.id as sender_id
                     FROM guests g 
                     LEFT JOIN sender_accounts sa ON sa.nome = g.sender_name
                     WHERE g.status_envio = 'Pendente'`;
        const params = [];
        if (senderName) {
            query += ` AND g.sender_name = $1`;
            params.push(senderName);
        }
        query += ` ORDER BY g.nome ASC`;

        const guests = (await pool.query(query, params)).rows;
        if (guests.length === 0) return res.json({ success: true, message: 'Nenhum convidado pendente.' });

        batchState = { running: true, total: guests.length, sent: 0, errors: 0, currentGuest: '', log: [] };
        res.json({ success: true, message: `Iniciando envio para ${guests.length} convidado(s).`, total: guests.length });

        // Processar envios em background
        (async () => {
            let sendCount = 0;
            for (const guest of guests) {
                if (!batchState.running) {
                    batchState.log.push({ type: 'info', msg: 'Envio interrompido pelo operador.' });
                    break;
                }

                const instanceName = guest.instance_name || DEFAULT_INSTANCE;

                // Verificar limite diário
                if (guest.sender_id && guest.daily_count >= guest.daily_limit) {
                    batchState.log.push({ type: 'warn', msg: `${guest.sender_display_name}: limite diário atingido (${guest.daily_limit}). Pulando ${guest.nome}.` });
                    batchState.errors++;
                    continue;
                }

                // Verificar se instância está conectada
                try {
                    const stateResp = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
                        headers: { 'apikey': EVOLUTION_API_KEY }
                    });
                    const stateData = await stateResp.json();
                    if (stateData?.instance?.state !== 'open') {
                        await pool.query(`UPDATE guests SET status_envio='Erro' WHERE id=$1`, [guest.id]);
                        await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
                            [guest.id, 'ERRO_ENVIO', `Instância ${instanceName} não conectada`]);
                        batchState.errors++;
                        batchState.log.push({ type: 'error', msg: `${guest.nome}: instância ${instanceName} desconectada.` });
                        continue;
                    }
                } catch {
                    batchState.errors++;
                    continue;
                }

                // Montar mensagem personalizada (Fixo conforme pedido)
                const apelido = guest.apelido || guest.nome;
                const textDep = guest.dependentes && guest.dependentes > 0 ? ` e leve seu(s) ${guest.dependentes} dependente(s)` : '';
                const senderDisplay = guest.sender_display_name || guest.sender_name || '';
                const artigo = guest.sender_artigo || 'o/a';
                const senderIntro = senderDisplay
                    ? `Olá *${apelido}*, aqui é ${artigo} ${senderDisplay}! 🎉`
                    : `Olá *${apelido}*, aqui é Família Rein! 🎉`;

                const baseUrl = process.env.PUBLIC_URL || 'https://familia-rein.cloud';
                const link = `${baseUrl}/c/${guest.short_code}`;

                const message = `${senderIntro}\n\nTemos um convite especial para você${textDep}.\n\n🎬 Assista até o final e confirme sua presença:\n\n${link}\n\n📌 Caso já tenha confirmado, por favor confirme novamente pelo link acima.`;

                const numberE164 = guest.celular.startsWith('55') ? guest.celular : `55${guest.celular}`;
                batchState.currentGuest = guest.nome;

                try {
                    const sendResp = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
                        body: JSON.stringify({
                            number: numberE164,
                            options: { delay: 1500, presence: 'composing' },
                            textMessage: { text: message }
                        })
                    });

                    if (sendResp.ok) {
                        await pool.query(`UPDATE guests SET status_envio='Enviado', data_envio=NOW() WHERE id=$1`, [guest.id]);
                        await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
                            [guest.id, 'ENVIO', `Enviado via ${instanceName} (${senderDisplay || 'default'})`]);
                        if (guest.sender_id) {
                            await pool.query(`UPDATE sender_accounts SET daily_count = daily_count + 1 WHERE id=$1`, [guest.sender_id]);
                        }
                        batchState.sent++;
                        batchState.log.push({ type: 'ok', msg: `✅ ${guest.nome} — enviado via ${senderDisplay || instanceName}` });
                    } else {
                        const errData = await sendResp.json().catch(() => ({}));
                        await pool.query(`UPDATE guests SET status_envio='Erro' WHERE id=$1`, [guest.id]);
                        await pool.query(`INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
                            [guest.id, 'ERRO_ENVIO', JSON.stringify(errData)]);
                        batchState.errors++;
                        batchState.log.push({ type: 'error', msg: `❌ ${guest.nome} — erro: ${errData?.message || 'desconhecido'}` });
                    }
                } catch (err) {
                    await pool.query(`UPDATE guests SET status_envio='Erro' WHERE id=$1`, [guest.id]);
                    batchState.errors++;
                    batchState.log.push({ type: 'error', msg: `❌ ${guest.nome} — ${err.message}` });
                }

                sendCount++;

                // Anti-ban: Pausa longa a cada 10 envios (3-5 min)
                if (sendCount % 10 === 0 && batchState.running) {
                    const pauseMs = 180000 + Math.floor(Math.random() * 120000); // 3-5 min
                    batchState.log.push({ type: 'info', msg: `⏸️ Pausa de ${Math.round(pauseMs / 60000)} min (anti-ban)...` });
                    await new Promise(r => setTimeout(r, pauseMs));
                } else if (batchState.running) {
                    // Anti-ban: Delay aleatório entre envios (25-45s)
                    const delayMs = 25000 + Math.floor(Math.random() * 20000);
                    await new Promise(r => setTimeout(r, delayMs));
                }
            }

            batchState.running = false;
            batchState.currentGuest = '';
            batchState.log.push({ type: 'info', msg: `🏁 Envio finalizado: ${batchState.sent} enviados, ${batchState.errors} erros.` });
        })();
    } catch (err) {
        batchState.running = false;
        res.status(500).json({ error: err.message });
    }
});

// --- Re-enviar somente os com erro ---
app.post('/api/whatsapp/resend-errors', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`UPDATE guests SET status_envio='Pendente', data_envio=NULL WHERE status_envio='Erro'`);
        res.json({ success: true, message: `${result.rowCount} convidado(s) com erro resetado(s) para re-envio.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Reconciliação: stats de prazo × resposta ---
app.get('/api/guests/reconciliation', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'Confirmado') as confirmados,
                COUNT(*) FILTER (WHERE status = 'Duvida') as duvida,
                COUNT(*) FILTER (WHERE status = 'Recusado') as recusados,
                COUNT(*) FILTER (WHERE status = 'Pendente') as sem_resposta,
                COUNT(*) FILTER (WHERE status = 'Pendente' AND prazo_resposta IS NOT NULL AND prazo_resposta < CURRENT_DATE) as prazo_vencido,
                COUNT(*) FILTER (WHERE status = 'Pendente' AND (prazo_resposta IS NULL OR prazo_resposta >= CURRENT_DATE)) as dentro_prazo,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Confirmado' THEN 1 + COALESCE(dependentes, 0) ELSE 0 END) as total_presentes,
                SUM(CASE WHEN status = 'Duvida' THEN 1 + COALESCE(dependentes, 0) ELSE 0 END) as total_duvida_presentes,
                COUNT(*) FILTER (WHERE status_envio = 'Enviado') as enviados,
                COUNT(*) FILTER (WHERE status_envio = 'Erro') as envio_erros,
                COUNT(*) FILTER (WHERE status_envio = 'Pendente') as envio_pendente
            FROM guests
        `);

        // Lista detalhada de prazo vencido
        const vencidos = await pool.query(`
            SELECT id, nome, celular, sender_name, prazo_resposta, status_envio, status
            FROM guests 
            WHERE status = 'Pendente' AND prazo_resposta IS NOT NULL AND prazo_resposta < CURRENT_DATE
            ORDER BY prazo_resposta ASC
        `);

        res.json({
            stats: result.rows[0],
            vencidos: vencidos.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FINALIZAÇÃO DE FASE E HISTÓRICO ---

// Listar fases finalizadas (sem snapshot completo para performance)
app.get('/api/event/phases', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, phase_name, closed_at, stats, notes 
            FROM event_phases_history ORDER BY closed_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Detalhe de uma fase (com snapshot completo)
app.get('/api/event/phases/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM event_phases_history WHERE id = $1`, [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Fase não encontrada.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Finalizar fase atual → arquiva snapshot e transiciona para próxima fase
app.post('/api/event/finalize-phase', requireAuth, async (req, res) => {
    const { notes } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Detectar fase atual
        const configRes = await client.query('SELECT * FROM event_configs LIMIT 1');
        const config = configRes.rows[0] || {};

        // Pegar tipo_evento mais usado nos guests como indicador da fase
        const phaseRes = await client.query(`
            SELECT tipo_evento, COUNT(*) as cnt FROM guests GROUP BY tipo_evento ORDER BY cnt DESC LIMIT 1
        `);
        const currentPhase = phaseRes.rows[0]?.tipo_evento || 'Save the Date';

        // 2. Snapshot completo dos convidados
        const guestsRes = await client.query(`
            SELECT id, nome, apelido, celular, idade, sexo, dependentes, status, status_envio, 
                   data_envio, data_resposta, sender_name, sender_artigo, prazo_resposta, short_code
            FROM guests ORDER BY nome
        `);

        // 3. Calcular stats da fase
        const guests = guestsRes.rows;
        const stats = {
            total: guests.length,
            confirmados: guests.filter(g => g.status === 'Confirmado').length,
            duvida: guests.filter(g => g.status === 'Duvida').length,
            recusados: guests.filter(g => g.status === 'Recusado').length,
            pendentes: guests.filter(g => g.status === 'Pendente').length,
            enviados: guests.filter(g => g.status_envio === 'Enviado').length,
            erros: guests.filter(g => g.status_envio === 'Erro').length,
            total_presentes: guests.filter(g => g.status === 'Confirmado').reduce((s, g) => s + 1 + (g.dependentes || 0), 0),
            total_duvida_presentes: guests.filter(g => g.status === 'Duvida').reduce((s, g) => s + 1 + (g.dependentes || 0), 0),
        };

        // 4. Gravar snapshot
        await client.query(`
            INSERT INTO event_phases_history (phase_name, stats, guests_snapshot, notes)
            VALUES ($1, $2, $3, $4)
        `, [currentPhase, JSON.stringify(stats), JSON.stringify(guests), notes || null]);

        // 5. Transicionar para próxima fase
        const nextPhase = currentPhase === 'Save the Date' ? 'Convite' : currentPhase;

        if (currentPhase !== nextPhase) {
            // Muda tipo_evento para Convite
            await client.query(`UPDATE guests SET tipo_evento = $1`, [nextPhase]);
            // Reseta envios (novos convites precisam ser enviados) mas preserva RSVP
            await client.query(`UPDATE guests SET status_envio = 'Pendente', data_envio = NULL`);
        }

        // 6. Registrar no histórico
        for (const g of guests) {
            await client.query(
                `INSERT INTO guests_history (guest_id, acao, detalhes) VALUES ($1, $2, $3)`,
                [g.id, 'FASE_FINALIZADA', `Fase "${currentPhase}" finalizada. Status: ${g.status}, Envio: ${g.status_envio}`]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Fase "${currentPhase}" finalizada e arquivada. ${currentPhase !== nextPhase ? `Transição para "${nextPhase}" realizada. Envios resetados.` : 'Fase encerrada.'}`,
            stats,
            previousPhase: currentPhase,
            nextPhase
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
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
