# API Examples

Este documento contém exemplos práticos de uso da API.

## Endpoints

Base URL: `http://localhost:3000`

---

## 1. Health Check

Verifica se o servidor está funcionando.

### Request
```bash
curl http://localhost:3000/health
```

### Response (200 OK)
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "service": "coGrader API"
}
```

---

## 2. Create Job

Cria um novo job de processamento de imagem.

### Request
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://picsum.photos/1600/900"
  }'
```

### Response (201 Created)
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "message": "Job created successfully"
}
```

### Error Responses

**400 Bad Request** - URL inválida:
```json
{
  "error": "Invalid URL",
  "message": "imageUrl must be a valid URL"
}
```

**400 Bad Request** - Parâmetro ausente:
```json
{
  "error": "Invalid request",
  "message": "imageUrl is required and must be a string"
}
```

---

## 3. Get Job Status

Consulta o status de um job específico.

### Request
```bash
curl http://localhost:3000/api/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response Examples

**Job Pendente** (200 OK):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "progress": 0,
  "createdAt": "2025-01-15T12:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:00.000Z"
}
```

**Job em Processamento - Download** (200 OK):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "processing",
  "progress": 25,
  "step": "download",
  "createdAt": "2025-01-15T12:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:05.000Z"
}
```

**Job em Processamento - Transform** (200 OK):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "processing",
  "progress": 50,
  "step": "transform",
  "createdAt": "2025-01-15T12:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:10.000Z"
}
```

**Job em Upload** (200 OK):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "uploading",
  "progress": 75,
  "step": "upload",
  "createdAt": "2025-01-15T12:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:15.000Z"
}
```

**Job Completo** (200 OK):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "progress": 100,
  "step": "complete",
  "resultUrl": "https://storage.googleapis.com/your-bucket/processed/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
  "createdAt": "2025-01-15T12:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:20.000Z"
}
```

**Job com Falha** (200 OK):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "failed",
  "progress": 0,
  "error": "Failed to download image: timeout of 30000ms exceeded",
  "createdAt": "2025-01-15T12:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:35.000Z"
}
```

### Error Responses

**404 Not Found** - Job não encontrado:
```json
{
  "error": "Not found",
  "message": "Job not found"
}
```

---

## 4. List All Jobs

Lista todos os jobs criados.

### Request
```bash
curl http://localhost:3000/api/jobs
```

### Response (200 OK)
```json
{
  "total": 3,
  "jobs": [
    {
      "jobId": "job-id-3",
      "status": "completed",
      "progress": 100,
      "step": "complete",
      "resultUrl": "https://storage.googleapis.com/...",
      "createdAt": "2025-01-15T12:05:00.000Z",
      "updatedAt": "2025-01-15T12:05:20.000Z"
    },
    {
      "jobId": "job-id-2",
      "status": "processing",
      "progress": 50,
      "step": "transform",
      "createdAt": "2025-01-15T12:03:00.000Z",
      "updatedAt": "2025-01-15T12:03:10.000Z"
    },
    {
      "jobId": "job-id-1",
      "status": "failed",
      "progress": 0,
      "error": "Invalid image format",
      "createdAt": "2025-01-15T12:00:00.000Z",
      "updatedAt": "2025-01-15T12:00:05.000Z"
    }
  ]
}
```

---

## JavaScript/TypeScript Examples

### Using Fetch API

```typescript
// Create Job
async function createJob(imageUrl: string) {
  const response = await fetch('http://localhost:3000/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Get Job Status
async function getJobStatus(jobId: string) {
  const response = await fetch(`http://localhost:3000/api/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// List All Jobs
async function getAllJobs() {
  const response = await fetch('http://localhost:3000/api/jobs');

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Example Usage
const job = await createJob('https://picsum.photos/1600/900');
console.log('Job created:', job.jobId);

// Poll for status
const interval = setInterval(async () => {
  const status = await getJobStatus(job.jobId);
  console.log(`Progress: ${status.progress}%`, status.step);

  if (status.status === 'completed') {
    console.log('Job completed!', status.resultUrl);
    clearInterval(interval);
  } else if (status.status === 'failed') {
    console.error('Job failed:', status.error);
    clearInterval(interval);
  }
}, 2000);
```

### Using Axios

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// Create Job
async function createJob(imageUrl: string) {
  const { data } = await axios.post(`${API_BASE_URL}/api/jobs`, {
    imageUrl,
  });
  return data;
}

// Get Job Status
async function getJobStatus(jobId: string) {
  const { data } = await axios.get(`${API_BASE_URL}/api/jobs/${jobId}`);
  return data;
}

// List All Jobs
async function getAllJobs() {
  const { data } = await axios.get(`${API_BASE_URL}/api/jobs`);
  return data;
}
```

---

## Image URLs for Testing

Você pode usar estes serviços para obter URLs de imagens de teste:

1. **Lorem Picsum** (imagens aleatórias):
   - `https://picsum.photos/1600/900`
   - `https://picsum.photos/800/600`

2. **Unsplash** (imagens de alta qualidade):
   - `https://source.unsplash.com/random/1600x900`
   - `https://source.unsplash.com/random/800x600`

3. **Placeholder.com**:
   - `https://via.placeholder.com/1600x900`
   - `https://via.placeholder.com/800x600`

---

## Processing Steps

O processamento de cada imagem passa pelas seguintes etapas:

| Passo | Status      | Progress | Step      | Descrição                                     |
|-------|-------------|----------|-----------|-----------------------------------------------|
| 0     | pending     | 0%       | -         | Job criado, aguardando processamento          |
| 1     | processing  | 25%      | download  | Baixando imagem da URL                        |
| 2     | processing  | 50%      | transform | Aplicando transformações (resize, grayscale)  |
| 3     | uploading   | 75%      | upload    | Fazendo upload para Firebase Storage          |
| 4     | completed   | 100%     | complete  | Job concluído com sucesso                     |
| -     | failed      | 0%       | -         | Job falhou (erro disponível no campo `error`) |

---

## Rate Limiting & Best Practices

1. **Polling**: Ao consultar o status de um job, recomenda-se fazer polling a cada 2-5 segundos
2. **Timeouts**: A API tem timeout de 30 segundos para download de imagens
3. **Retry**: Jobs falhos têm 3 tentativas automáticas com backoff exponencial
4. **Concurrency**: O worker processa até 5 jobs simultaneamente (configurável via `WORKER_CONCURRENCY`)

---

## Troubleshooting

### Job fica preso em "pending"
- Verifique se o worker está rodando: `npm run dev:worker`
- Verifique a conexão com Redis
- Veja os logs do worker

### Job falha no download
- Verifique se a URL da imagem é acessível publicamente
- Teste a URL no navegador
- Verifique se não há redirecionamentos ou autenticação necessária

### Job falha no upload
- Verifique as credenciais do Firebase
- Verifique se o Firebase Storage está habilitado
- Verifique as permissões do bucket
