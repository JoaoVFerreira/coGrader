# coGrader

### Contexto

O backend deve utilizar BullMQ para gerenciar tarefas de processamento de imagens. O processamento deve ser implementado em TypeScript com Express. O resultado do processamento deve ser enviado ao Firebase Storage, e o status do job deve ser atualizado em tempo real no Firestore. O frontend deve consultar esses dados para exibir o progresso ao usuário.

### Objetivo

Implementar uma arquitetura backend com BullMQ utilizando TypeScript e Express para criação, execução e consulta de jobs de processamento de imagens, incluindo integração com Firebase.

### Requisitos Funcionais

1. Implementar o backend em TypeScript utilizando Express.
2. Criar um job de processamento de imagem através de um endpoint REST.
3. Processar a imagem em um worker BullMQ executado separadamente do servidor Express.
4. Executar transformações na imagem (exemplo: resize, grayscale, watermark).
5. Salvar a imagem processada no Firebase Storage.
6. Atualizar o progresso e o status do job no Firestore a cada etapa do processamento.
7. Permitir que o frontend consulte o status e o resultado final do job.

### Endpoints REST (Express + TypeScript)

| Método | Rota            | Descrição                                                                         |
| ------ | --------------- | --------------------------------------------------------------------------------- |
| POST   | `/api/jobs`     | Cria um novo job de processamento de imagem. O body deve incluir a URL da imagem. |
| GET    | `/api/jobs/:id` | Retorna o status atual do job (progresso, etapa, erro ou URL final).              |
| GET    | `/api/jobs`     | Lista todos os jobs com seus status básicos.                                      |

### Especificação BullMQ

#### Queue

* Nome da fila: `imageProcessing`

#### Worker

* Executar jobs de forma concorrente
* Para cada job, seguir rigorosamente as etapas:

| Passo | Descrição                                                 | Atualização Firestore                |
| ----- | --------------------------------------------------------- | ------------------------------------ |
| 1     | Baixar a imagem da URL fornecida                          | status: processing (step: download)  |
| 2     | Aplicar transformações na imagem                          | status: processing (step: transform) |
| 3     | Fazer upload da imagem processada para o Firebase Storage | status: uploading                    |
| 4     | Registrar a URL final no Firestore                        | status: completed                    |

Se ocorrer falha em qualquer etapa:

* status: failed
* incluir mensagem de erro no Firestore

### Persistência do Status

Cada atualização no Firestore deve incluir:

* Status atual do workflow
* Percentual de progresso
* Etapa atual do processamento
* Mensagem de erro quando houver falha
* URL final gerada ao concluir o processo

### Resultado Esperado

Uma API funcional que permita:

* Criar jobs de processamento de imagens
* Processar em segundo plano utilizando BullMQ
* Atualizar e persistir status em tempo real no Firestore
* Consultar status e resultado final via API

Implementação obrigatória em:

* Linguagem: TypeScript
* Framework: Express
* Queue Manager: BullMQ
* Storage e base de dados: Firebase Storage e Firestore


  Resumo da Implementação

  Implementei uma arquitetura completa de backend com BullMQ para processamento de imagens conforme especificado. Aqui está o que foi criado:

  Estrutura do Projeto

  backend/
  ├── src/
  │   ├── config/          # Configurações (Firebase, Redis, Env)
  │   ├── controllers/     # Controladores Express
  │   ├── routes/          # Rotas da API
  │   ├── services/        # Lógica de negócio
  │   ├── types/           # Tipos TypeScript
  │   ├── workers/         # Worker BullMQ
  │   ├── server.ts        # Entry point API
  │   └── worker.ts        # Entry point Worker
  ├── SETUP.md             # Guia completo de setup
  ├── API_EXAMPLES.md      # Exemplos de uso da API
  ├── package.json
  ├── tsconfig.json
  └── .env.example

  Funcionalidades Implementadas

  API REST (Express):
  - POST /api/jobs - Cria novo job de processamento
  - GET /api/jobs/:id - Consulta status do job
  - GET /api/jobs - Lista todos os jobs
  - GET /health - Health check

  Processamento de Imagens (Worker):
  1. Download (25%) - Baixa imagem da URL
  2. Transform (50%) - Aplica resize, grayscale e watermark
  3. Upload (75%) - Envia para Firebase Storage
  4. Complete (100%) - Atualiza Firestore com URL final

  Integrações:
  - BullMQ para fila de jobs com Redis
  - Firebase Storage para armazenar imagens processadas
  - Firestore para persistir status dos jobs em tempo real
  - Sharp para processamento de imagens

  Próximos Passos

  1. Instalar dependências:
  npm install
  2. Configurar ambiente:
    - Copie .env.example para .env
    - Configure credenciais do Firebase
    - Configure Redis (localhost ou Docker)
  3. Rodar o projeto:
  # Terminal 1 - API Server
  npm run dev

  # Terminal 2 - Worker
  npm run dev:worker
  4. Testar a API:
  curl -X POST http://localhost:3000/api/jobs \
    -H "Content-Type: application/json" \
    -d '{"imageUrl": "https://picsum.photos/1600/900"}'

  Documentação Completa

  - SETUP.md - Guia detalhado de instalação e configuração
  - API_EXAMPLES.md - Exemplos práticos de uso da API com cURL, Fetch e Axios

  Todos os requisitos especificados foram implementados com TypeScript, Express, BullMQ e Firebase!