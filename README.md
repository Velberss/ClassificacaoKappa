# TCC Aviator Annotation

Aplicação web para anotação manual de 300 comentários do YouTube por quatro avaliadores independentes. Cada avaliador classifica os comentários como **Favorável**, **Contrário** ou **Neutro**.

## Funcionalidades

- Login individual com JWT.
- Banco SQLite local.
- Importação dos comentários a partir de quatro arquivos Excel.
- 300 comentários, sendo 150 do período `antes` e 150 do período `depois`.
- Anotação com rótulo, observação e marcação de comentário difícil.
- Progresso individual por avaliador.
- Avanço automático para o próximo comentário não anotado.
- Atalhos `1`, `2`, `3` para selecionar o rótulo.
- Atalho `Ctrl + Enter` para salvar e avançar.

## Requisitos

- Node.js 22 ou superior.
- npm.
- Navegador moderno.

Verifique a instalação:

```powershell
node --version
npm --version
```

## Estrutura

```text
Planilha Kappa/
├── backend/                 # API Express + TypeScript + SQLite
├── frontend/                # Interface React + Vite
├── data/
│   └── excel/               # Arquivos .xlsx dos comentários
└── README.md
```

Os arquivos Excel devem estar em:

```text
data\excel\
```

Com estes nomes:

```text
avaliador_1_kappa300.xlsx
avaliador_2_kappa300.xlsx
avaliador_3_kappa300.xlsx
avaliador_4_kappa300.xlsx
```

## Configuração do backend

Abra um PowerShell na pasta raiz do projeto e instale as dependências:

```powershell
Set-Location ".\backend"
npm install
```

Crie o arquivo `backend\.env`:

```env
PORT=5000
NODE_ENV=development

DATABASE_PATH=./db/kappa.sqlite

JWT_SECRET=altere_esta_chave_secreta_em_producao
JWT_REFRESH_SECRET=altere_esta_chave_de_refresh_em_producao
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

CORS_ORIGIN=http://localhost:5173,http://localhost:3000
EXCEL_DATA_PATH=../data/excel
```

Em produção, use chaves JWT longas, aleatórias e privadas. Não publique o arquivo `.env`.

Quando `DATABASE_URL` estiver configurada, o backend usa PostgreSQL automaticamente. Sem essa variável, ele usa o SQLite local.

## Importar ou atualizar os comentários

Para criar o banco e importar os quatro arquivos Excel:

```powershell
Set-Location ".\backend"
npm run seed:build -- --confirm
```

O resultado esperado é:

```text
300 comentários importados
150 comentários "antes"
150 comentários "depois"
```

### Atenção

O comando `npm run seed:build` substitui os comentários existentes e remove as anotações e registros de auditoria associados. Execute-o somente quando quiser recomeçar a base de comentários com os arquivos Excel atuais.

## Criar os usuários

```powershell
Set-Location ".\backend"
npm run seed:users
```

Usuários padrão:

| Usuário | Senha |
|---|---|
| Avaliador 1 | `Avaliador1@TCC` |
| Avaliador 2 | `Avaliador2@TCC` |
| Avaliador 3 | `Avaliador3@TCC` |
| Avaliador 4 | `Avaliador4@TCC` |

O script não cria duplicatas se os usuários já existirem.

## Instalar o frontend

Em outro PowerShell:

```powershell
Set-Location ".\frontend"
npm install
```

## Ativar o projeto

É necessário manter dois terminais abertos.

### Terminal 1: backend

```powershell
Set-Location ".\backend"
npm run dev
```

Backend:

```text
http://localhost:5000
```

### Terminal 2: frontend

```powershell
Set-Location ".\frontend"
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Depois, abra [http://localhost:5173](http://localhost:5173).

### Acessar pelo celular na mesma rede Wi-Fi

Para outra pessoa usar o sistema pelo celular, o computador e o celular precisam estar na mesma rede Wi-Fi.

No computador, execute:

```powershell
Set-Location ".\frontend"
npm run dev:network
```

Descubra o endereço IP local do computador:

```powershell
ipconfig
```

Procure o endereço `IPv4`, geralmente parecido com `192.168.0.15` ou `192.168.1.20`. No celular, abra:

```text
http://SEU_IP_LOCAL:5173
```

Exemplo:

```text
http://192.168.1.20:5173
```

Se o Windows Firewall perguntar, permita o Node.js na rede privada. O backend continua rodando na porta `5000`, mas as chamadas são encaminhadas pelo proxy do Vite.

O layout mobile possui botões maiores, campos adaptados ao toque e avanço automático após **Salvar e próximo**. A avaliadora pode usar os botões na tela ou os atalhos numéricos caso tenha teclado conectado.

## Primeiro acesso

1. Abra o frontend.
2. Entre com um avaliador.
3. Selecione um dos três rótulos.
4. Adicione uma observação, se necessário.
5. Marque o comentário como difícil, se aplicável.
6. Clique em **Salvar e próximo**.

Depois de salvar, o sistema avança automaticamente para o próximo comentário não anotado.

## Verificar o backend

Com o backend ativo:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health"
```

Resposta esperada:

```json
{
  "success": true
}
```

Para verificar o banco:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/status"
```

## Scripts disponíveis

### Backend

| Comando | Finalidade |
|---|---|
| `npm run dev` | Backend em desenvolvimento com recarga automática |
| `npm run build` | Compilar TypeScript |
| `npm start` | Executar backend compilado |
| `npm run seed:build -- --confirm` | Reimportar comentários confirmando a remoção das anotações atuais |
| `npm run seed:users` | Criar os quatro avaliadores |

### Frontend

| Comando | Finalidade |
|---|---|
| `npm run dev` | Iniciar Vite em desenvolvimento |
| `npm run build` | Gerar build de produção |
| `npm run preview` | Visualizar o build de produção |

## Build de produção

Backend:

```powershell
Set-Location ".\backend"
npm run build
npm start
```

Frontend:

```powershell
Set-Location ".\frontend"
npm run build
npm run preview
```

## Publicação no Render como um único Web Service

Em produção, o Express serve o frontend React e a API no mesmo endereço:

```text
https://SEU-SERVICO.onrender.com/
```

Crie um banco PostgreSQL no Render e conecte-o ao Web Service pela variável `DATABASE_URL`.

### Configuração do Web Service

Crie um **Web Service** apontando para a raiz do repositório (`/`) e use:

```text
Build Command:
npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend && npm run build --prefix backend

Start Command:
npm start --prefix backend
```

Não execute seeds no Build Command ou no Start Command.

Configure estas variáveis:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=sua_url_do_postgresql
DATABASE_SSL=true
JWT_SECRET=uma-chave-aleatoria-longa
JWT_REFRESH_SECRET=outra-chave-aleatoria-longa
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=
EXCEL_DATA_PATH=./data/excel
EVALUATOR_1_PASSWORD=
EVALUATOR_2_PASSWORD=
EVALUATOR_3_PASSWORD=
EVALUATOR_4_PASSWORD=
```

Como frontend e backend usam o mesmo domínio, `CORS_ORIGIN` pode ficar vazio. O backend não habilita CORS aberto.

O backend cria as tabelas PostgreSQL automaticamente ao iniciar. Depois que o serviço estiver disponível, abra o Shell do Render e execute uma única vez:

```powershell
npm run seed:build --prefix backend -- --confirm
npm run seed:users --prefix backend
```

O primeiro comando substitui comentários e anotações existentes. Não o execute novamente depois que os avaliadores começarem a trabalhar, salvo se quiser reiniciar a coleta.

Em produção, `seed:users` exige as quatro variáveis `EVALUATOR_*_PASSWORD`. As senhas não são impressas nos logs e não possuem fallback.

Os avaliadores acessarão:

```text
https://SEU-SERVICO.onrender.com/
```

O computador local não precisará ficar ligado.

## Endpoints principais

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/health` | Saúde do servidor |
| `GET` | `/api/status` | Status do banco e tabelas |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/refresh` | Renovação do access token |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/comments` | Listagem paginada de comentários |
| `GET` | `/api/annotations` | Anotações do avaliador autenticado |
| `GET` | `/api/annotations/progress` | Progresso do avaliador |
| `PUT` | `/api/annotations/:commentId` | Criar ou atualizar anotação |

As rotas protegidas usam:

```text
Authorization: Bearer SEU_ACCESS_TOKEN
```

## Solução de problemas

### Porta 5000 ocupada

```powershell
Get-NetTCPConnection -LocalPort 5000
```

Encerre somente o processo pelo ID exibido:

```powershell
Stop-Process -Id NUMERO_DO_PROCESSO
```

### Porta 5173 ocupada

O Vite pode iniciar em outra porta. Use a URL exibida no terminal.

### Login inválido

Execute novamente:

```powershell
Set-Location ".\backend"
npm run seed:users
```

### Comentários antigos continuam aparecendo

Confirme os arquivos em `data\excel\` e execute explicitamente:

```powershell
Set-Location ".\backend"
npm run seed:build -- --confirm
```

Esse comando apaga as anotações atuais. Faça backup do arquivo `backend\db\kappa.sqlite` se precisar preservá-las.

### Erro do `ts-node` ao executar seed

Use os comandos compilados do projeto:

```powershell
npm run seed:build -- --confirm
npm run seed:users
```

## Banco de dados

O banco fica em:

```text
backend\db\kappa.sqlite
```

Principais tabelas:

- `users`: avaliadores.
- `comments`: comentários importados.
- `annotations`: respostas dos avaliadores.
- `audit_log`: histórico de ações.

## Próximas etapas

- Exportação para CSV/Excel.
- Cálculo do Kappa de Fleiss.
- Relatório de concordância e discordâncias.
- Deploy em ambiente de produção.
