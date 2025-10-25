# Scenario Execution Platform

Bu proje, React flow editor ile oluşturulan senaryoları MongoDB'de saklar ve Fastify backend ile execute eder. WebSocket üzerinden real-time node status updates sağlar.

## Proje Yapısı

```
zengin-olma-projesi-v123123123/
├── frontend/                 # React flow editor
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/                  # Fastify API server
│   ├── src/
│   ├── package.json
│   └── env.local
├── docker-compose.yml        # MongoDB ve Mongo Express
└── README.md
```

## Hızlı Başlangıç

### 1. MongoDB'yi Docker ile Çalıştır

```bash
# MongoDB ve Mongo Express'i başlat
docker-compose up -d

# MongoDB: localhost:27017
# Mongo Express: http://localhost:8081 (admin/admin123)
```

### 2. Backend'i Çalıştır

```bash
cd backend
npm install
cp env.local .env
npm run dev
```

Backend: http://localhost:3001

### 3. Frontend'i Çalıştır

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5174

## Özellikler

### Frontend (React)
- Flow editor ile senaryo oluşturma
- Real-time WebSocket bağlantısı
- Node status monitoring
- Scenario management

### Backend (Fastify)
- MongoDB integration
- WebSocket real-time communication
- HTTP request execution
- Assertion validation
- Jenkins-ready API endpoints

### Database (MongoDB)
- Scenario storage
- Execution history
- Node execution tracking
- Performance metrics

## API Endpoints

### Scenarios
- `GET /api/scenarios` - Senaryo listesi
- `POST /api/scenarios` - Yeni senaryo
- `GET /api/scenarios/:id` - Senaryo detayı
- `PUT /api/scenarios/:id` - Senaryo güncelle
- `DELETE /api/scenarios/:id` - Senaryo sil

### Execution
- `POST /api/execution/start/:scenarioId` - Senaryo çalıştır
- `GET /api/execution/:executionId` - Execution status
- `GET /api/execution/:executionId/results` - Sonuçlar
- `POST /api/execution/:executionId/cancel` - İptal et

## WebSocket Events

### Client → Server
```javascript
// Execution'a subscribe
{
  "type": "subscribe_execution",
  "payload": { "executionId": "..." }
}

// Scenario'ya subscribe
{
  "type": "subscribe_scenario",
  "payload": { "scenarioId": "..." }
}
```

### Server → Client
```javascript
// Execution update
{
  "type": "execution_update",
  "executionId": "...",
  "event": "execution_started|completed|failed",
  "data": { ... }
}

// Node update
{
  "type": "node_update",
  "nodeId": "...",
  "event": "node_started|completed|failed",
  "data": { ... }
}
```

## Jenkins Integration

Backend, Jenkins pipeline'da kullanılmak üzere tasarlanmıştır:

```bash
# Senaryo çalıştır
curl -X POST http://localhost:3001/api/execution/start/SCENARIO_ID

# Status kontrol
curl http://localhost:3001/api/execution/EXECUTION_ID

# Results
curl http://localhost:3001/api/execution/EXECUTION_ID/results
```

## Development

### Environment Variables

#### Backend (.env)
```
PORT=3001
MONGODB_URI=mongodb://admin:password123@localhost:27017/scenario_execution?authSource=admin
CORS_ORIGIN=http://localhost:5174
```

#### Frontend
Vite default port: 5174

### Database Access

- **MongoDB**: `mongodb://admin:password123@localhost:27017/scenario_execution`
- **Mongo Express**: http://localhost:8081 (admin/admin123)

## Production Deployment

### Docker Compose (Full Stack)
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    # ... MongoDB config
  
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    depends_on:
      - mongodb
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

### Jenkins Pipeline
```groovy
pipeline {
    stages {
        stage('Test Scenarios') {
            steps {
                sh 'curl -X POST http://backend:3001/api/execution/start/SCENARIO_ID'
                // Wait for completion and check results
            }
        }
    }
}
```

## Troubleshooting

### MongoDB Connection Issues
```bash
# MongoDB container durumunu kontrol et
docker-compose ps

# MongoDB loglarını kontrol et
docker-compose logs mongodb

# Container'ı yeniden başlat
docker-compose restart mongodb
```

### Backend Issues
```bash
# Backend loglarını kontrol et
cd backend && npm run dev

# MongoDB bağlantısını test et
curl http://localhost:3001/health
```

### Frontend Issues
```bash
# Frontend loglarını kontrol et
cd frontend && npm run dev

# WebSocket bağlantısını kontrol et
# Browser Developer Tools > Network > WS
```
