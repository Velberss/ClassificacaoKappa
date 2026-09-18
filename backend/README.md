# 🚀 TCC Aviator Annotation - Backend

## 📋 Descrição

Servidor backend para a aplicação TCC Aviator Annotation, uma ferramenta web para anotação manual de comentários do YouTube visando análise de promoção do jogo Aviator em comunidades brasileiras.

**Objetivo**: Facilitar a anotação de 300 comentários por 4 avaliadores independentes, com cálculo posterior do Kappa de Fleiss para validação da confiabilidade inter-avaliador.

---

## ✨ Características Atuais (Fase 1)

✅ Servidor Express com TypeScript
✅ Banco de dados SQLite com schema completo
✅ Configuração de CORS
✅ Variáveis de ambiente
✅ Estrutura pronta para próximas fases

---

## 🛠️ Instalação

### Pré-requisitos
- **Node.js** v18+ (versão v22.11.0 testada)
- **npm** v10+

### Passos

1. **Instalar dependências**
```bash
npm install
```

2. **Configurar variáveis de ambiente**
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env conforme necessário (valores padrão já funcionam para desenvolvimento)
```

3. **Compilar TypeScript**
```bash
npm run build
```

---

## 🚀 Executar o Servidor

### Modo Desenvolvimento (com hot-reload)
```bash
npm run dev
```
- Arquivo será recompilado automaticamente ao salvar
- Nodemon reiniciará o servidor

### Modo Produção
```bash
npm run build
npm start
```

---

## 📊 Estrutura do Banco de Dados

### Tabela: `users`
Armazena os 4 avaliadores com senha hash.
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `comments`
Os 300 comentários do YouTube para anotação.
```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  annotation_id INTEGER UNIQUE NOT NULL,     -- 1-300
  youtube_comment_id TEXT,
  youtube_video_id TEXT,
  period TEXT CHECK(period IN ('antes', 'depois')),
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `annotations`
Respostas de cada avaliador para cada comentário.
```sql
CREATE TABLE annotations (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  comment_id INTEGER NOT NULL,
  label TEXT CHECK(label IN ('Favorável', 'Contrário', 'Neutro')),
  note TEXT,                                 -- Observação opcional
  is_difficult BOOLEAN DEFAULT 0,            -- Marcar como difícil
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (comment_id) REFERENCES comments(id),
  UNIQUE(user_id, comment_id)
);
```

### Tabela: `audit_log`
Registro de todas as ações para auditoria e confiabilidade.
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🔌 Rotas Disponíveis (Fase 1)

### Health Check
```http
GET /health
```
**Resposta:**
```json
{
  "success": true,
  "message": "✅ Servidor TCC Aviator Annotation rodando",
  "timestamp": "2026-09-10T21:32:53.801Z"
}
```

### Status da API
```http
GET /api/status
```
**Resposta:**
```json
{
  "success": true,
  "status": "online",
  "timestamp": "2026-09-10T21:33:01.549Z",
  "database": {
    "connected": true,
    "tables": 5
  }
}
```

---

## 📋 Fases de Implementação

| Fase | Objetivo | Status |
|------|----------|--------|
| **1** | Estrutura base e servidor Express | ✅ **COMPLETO** |
| **2** | Importar Excel e popular banco | ⏳ Próxima |
| **3** | Autenticação e JWT | ⏳ Pendente |
| **4** | API de anotações | ⏳ Pendente |
| **5** | Funcionalidades adicionais | ⏳ Pendente |
| **6** | Exportação e Kappa de Fleiss | ⏳ Pendente |

---

## 🗂️ Estrutura de Pastas

```
backend/
├── src/
│   ├── server.ts                   # Servidor Express principal
│   ├── config/
│   │   └── database.ts             # Configuração SQLite
│   ├── controllers/                # [Fase 2+] Controladores
│   ├── routes/                     # [Fase 2+] Rotas API
│   ├── middleware/                 # [Fase 3+] Middlewares
│   ├── services/                   # [Fase 2+] Lógica de negócio
│   └── types/
│       └── index.ts                # Tipos TypeScript
├── db/
│   └── schema.sql                  # Schema do banco de dados
├── dist/                           # Arquivos compilados (gerado)
├── node_modules/                   # Dependências (gerado)
├── package.json                    # Configuração npm
├── tsconfig.json                   # Configuração TypeScript
├── .env                            # Variáveis de ambiente
├── .env.example                    # Template de .env
├── .gitignore                      # Arquivos ignorados pelo git
└── README.md                       # Este arquivo
```

---

## 🔐 Variáveis de Ambiente

```env
# Backend
PORT=5000                                          # Porta do servidor
NODE_ENV=development                              # Ambiente

# Database
DATABASE_PATH=./db/kappa.sqlite                  # Caminho do SQLite

# JWT (será usado na Fase 3)
JWT_SECRET=sua_chave_super_segura                # Chave JWT
JWT_REFRESH_SECRET=sua_chave_refresh_super_segura

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Excel Import (será usado na Fase 2)
EXCEL_DATA_PATH=../data/excel                    # Caminho das planilhas
```

---

## 🧪 Teste de Funcionamento

### Teste com curl
```bash
# Health check
curl http://localhost:5000/health

# Status
curl http://localhost:5000/api/status
```

### Teste com Postman/Insomnia
1. Importar as rotas acima
2. Fazer requisições GET para os endpoints
3. Verificar respostas JSON

---

## 📝 Tipo de Dados (TypeScript)

Veja [src/types/index.ts](src/types/index.ts) para todas as interfaces:

- `User` - Avaliador
- `Comment` - Comentário do YouTube
- `Annotation` - Resposta de um avaliador
- `LoginRequest` - Requisição de login
- `AuthResponse` - Resposta de autenticação
- `ApiResponse<T>` - Resposta genérica de API

---

## 🐛 Troubleshooting

### Porta 5000 já está em uso
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### Erro ao compilar TypeScript
```bash
npm run build
```
Isso mostrará erros específicos que precisam ser corrigidos.

### SQLite não está sendo criado
Verificar permissões da pasta `db/` e `DATABASE_PATH` no `.env`.

---

## 📚 Próximas Etapas (Fase 2)

1. Implementar serviço de importação de Excel (`services/excelImporter.ts`)
2. Criar controller de comentários (`controllers/comments.ts`)
3. Criar rotas de comentários (`routes/comments.ts`)
4. Popular banco com os 300 comentários
5. Adicionar testes

---

## 📄 Licença

Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC).

---

## 👨‍💻 Autor

Desenvolvido como parte do TCC sobre análise de promoção de jogos de azar em plataformas digitais.

---

**Status**: 🚀 Em desenvolvimento ativo
