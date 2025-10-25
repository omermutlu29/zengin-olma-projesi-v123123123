# Scenario Execution Backend

Bu backend, React flow editor ile oluşturulan senaryoları MongoDB'de saklar ve Fastify ile execute eder. WebSocket üzerinden real-time node status updates sağlar.

## Özellikler

- **MongoDB Integration**: Senaryoları ve execution history'sini saklar
- **Fastify Server**: Hızlı ve modern Node.js web framework
- **WebSocket Support**: Real-time communication
- **Execution Engine**: HTTP request execution ve assertion validation
- **Jenkins Ready**: CI/CD pipeline entegrasyonu için hazır

## Kurulum

```bash
cd backend
npm install
```

## Environment Variables

`.env` dosyası oluşturun (env.example'dan kopyalayın):

```bash
cp env.example .env
```

Gerekli environment variables:
- `PORT`: Server port (default: 3001)
- `MONGODB_URI`: MongoDB connection string
- `CORS_ORIGIN`: Frontend URL (default: http://localhost:5174)

## Çalıştırma

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Scenarios
- `GET /api/scenarios` - Tüm senaryoları listele
- `GET /api/scenarios/:id` - Senaryo detayı
- `POST /api/scenarios` - Yeni senaryo oluştur
- `PUT /api/scenarios/:id` - Senaryo güncelle
- `DELETE /api/scenarios/:id` - Senaryo sil
- `POST /api/scenarios/:id/duplicate` - Senaryo kopyala

### Execution
- `POST /api/execution/start/:scenarioId` - Senaryo çalıştır
- `GET /api/execution/:executionId` - Execution status
- `GET /api/execution/:executionId/results` - Execution results
- `POST /api/execution/:executionId/cancel` - Execution iptal et

## WebSocket Events

### Client → Server
```javascript
// Execution'a subscribe ol
{
  "type": "subscribe_execution",
  "payload": { "executionId": "..." }
}

// Scenario'ya subscribe ol
{
  "type": "subscribe_scenario", 
  "payload": { "scenarioId": "..." }
}

// Ping
{
  "type": "ping"
}
```

### Server → Client
```javascript
// Execution update
{
  "type": "execution_update",
  "executionId": "...",
  "event": "execution_started|execution_completed|execution_failed",
  "data": { ... }
}

// Node update
{
  "type": "node_update",
  "executionId": "...",
  "nodeId": "...",
  "event": "node_started|node_completed|node_failed",
  "data": { ... }
}
```

## Database Schema

### Scenario
- `name`: Senaryo adı
- `description`: Açıklama
- `nodes`: Flow node'ları
- `edges`: Node bağlantıları
- `variables`: Global variables
- `settings`: Execution settings
- `status`: draft|ready|running|completed|failed|paused

### Execution
- `scenarioId`: Senaryo referansı
- `status`: Execution durumu
- `nodeExecutions`: Her node'un execution detayları
- `summary`: Execution özeti
- `variables`: Execution variables

## Jenkins Integration

Backend, Jenkins pipeline'da kullanılmak üzere tasarlanmıştır:

```bash
# Senaryo çalıştır
curl -X POST http://localhost:3001/api/execution/start/SCENARIO_ID

# Execution status kontrol
curl http://localhost:3001/api/execution/EXECUTION_ID

# Results al
curl http://localhost:3001/api/execution/EXECUTION_ID/results
```

## Development

### Project Structure
```
backend/
├── src/
│   ├── server.js          # Main server file
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── websocket/         # WebSocket handlers
├── package.json
└── README.md
```

### Adding New Features
1. Model'leri `src/models/` altında tanımla
2. Route'ları `src/routes/` altında oluştur
3. Business logic'i `src/services/` altında implement et
4. WebSocket events'i `src/websocket/` altında handle et
