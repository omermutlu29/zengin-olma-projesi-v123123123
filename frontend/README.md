# Scenario Execution Frontend

React tabanlı flow editor ile senaryo oluşturma ve yönetme uygulaması.

## Özellikler

- **Flow Editor**: Drag & drop ile senaryo oluşturma
- **Real-time Updates**: WebSocket ile canlı node status
- **Scenario Management**: CRUD operations
- **Execution Monitoring**: Real-time progress tracking

## Kurulum

```bash
cd frontend
npm install
```

## Çalıştırma

```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## WebSocket Integration

Frontend, backend ile WebSocket üzerinden real-time communication sağlar:

```javascript
// WebSocket bağlantısı
const ws = new WebSocket('ws://localhost:3001/ws');

// Execution'a subscribe
ws.send(JSON.stringify({
  type: 'subscribe_execution',
  payload: { executionId: '...' }
}));

// Event handling
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle execution_update, node_update events
};
```

## API Integration

Backend API'leri ile entegrasyon:

```javascript
// Senaryo listesi
const scenarios = await fetch('/api/scenarios');

// Senaryo çalıştır
const response = await fetch('/api/execution/start/SCENARIO_ID', {
  method: 'POST'
});

// Execution status
const execution = await fetch('/api/execution/EXECUTION_ID');
```

## Proje Yapısı

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── AssertionsList.jsx
│   │   ├── HarImportModal.jsx
│   │   ├── InspectorSidebar.jsx
│   │   ├── JsonLinkTree.jsx
│   │   └── KVEditor.jsx
│   ├── nodes/               # Flow node components
│   │   └── RequestNodeMini.jsx
│   ├── flow/                # Flow configuration
│   │   └── nodeTypes.js
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # App entry point
│   └── index.css            # Global styles
├── package.json
├── vite.config.js
└── index.html
```

## Development

### Environment Variables
- Backend URL: `http://localhost:3001`
- WebSocket URL: `ws://localhost:3001/ws`

### Adding New Components
1. Component'i `src/components/` altında oluştur
2. Flow node'ları `src/nodes/` altında tanımla
3. Node types'ı `src/flow/nodeTypes.js`'de kaydet

### WebSocket Events

#### Client → Server
```javascript
{
  "type": "subscribe_execution",
  "payload": { "executionId": "..." }
}

{
  "type": "subscribe_scenario",
  "payload": { "scenarioId": "..." }
}
```

#### Server → Client
```javascript
{
  "type": "execution_update",
  "executionId": "...",
  "event": "execution_started|completed|failed",
  "data": { ... }
}

{
  "type": "node_update",
  "nodeId": "...",
  "event": "node_started|completed|failed",
  "data": { ... }
}
```
