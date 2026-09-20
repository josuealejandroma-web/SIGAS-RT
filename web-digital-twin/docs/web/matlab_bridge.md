# MATLAB Bridge - Protocolo de Integración LIVE

## Resumen

Este documento especifica el protocolo para conectar MATLAB/Simulink en vivo con el SIGAS-RT Web Digital Twin mediante un bridge Node.js.

## Arquitectura de Conexión

```
MATLAB (Simulink)
    │
    │ UDP JSON (puerto 45810)
    ▼
┌─────────────────────────────────┐
│      NODE.JS BRIDGE             │
│  - UDP Server :45810            │
│  - Valida frames (schema V2)    │
│  - WebSocket Server :45811      │
│  - Broadcast a clientes         │
└─────────────────────────────────┘
    │
    │ WebSocket (ws://localhost:45811)
    ▼
Browser (React + PlayCanvas)
    │
    │ Valida frames → DigitalTwinStore
    ▼
Scene3D + Dashboard + Charts + Timeline
```

## Puertos

| Componente | Protocolo | Puerto | Dirección |
|------------|-----------|--------|-----------|
| MATLAB → Bridge | UDP | 45810 | localhost |
| Bridge → Browser | WebSocket | 45811 | localhost |

**Configurables** via variables de entorno:
```bash
BRIDGE_UDP_PORT=45810
BRIDGE_WS_PORT=45811
BRIDGE_BIND_HOST=0.0.0.0  # para acceso LAN
```

## Formato de Frame UDP (MATLAB → Bridge)

MATLAB envía **string JSON** por UDP a `localhost:45810`.

```json
{
  "schemaVersion": 2,
  "source": "MATLAB_SIM",
  "sequence": 12345,
  "simTime": 45.67,
  "timestamp": 1700000000123,
  "systemState": "NORMAL",
  "eventType": "NONE",
  "affectedZoneMask": 0,
  "gas": {
    "Z1": { "adc": 800, "level": "NORMAL", "valid": true },
    "Z2": { "adc": 750, "level": "NORMAL", "valid": true },
    "Z3": { "adc": 700, "level": "NORMAL", "valid": true }
  },
  "pressure": { "P0": 20.0, "P1": 18.0, "PK": 17.0, "PL": 16.0, "PT": 15.0 },
  "flow": { "main": 5.0, "living": 2.0 },
  "valves": { "VM": "OPEN", "VK": "OPEN", "VL": "OPEN", "VT": "OPEN" },
  "buzzer": false,
  "greenLed": true,
  "redLed": false
}
```

### Requisitos MATLAB

- **Frecuencia**: 30 Hz (cada 33.33 ms) recomendado
- **Sequence**: Incremental monótono (uint32)
- **simTime**: Tiempo de simulación consistente
- **timestamp**: `datetime('now','ConvertTo','epochtime') * 1000` en MATLAB
- **Todos los campos obligatorios** (ver telemetry_schema.md)

## Formato WebSocket (Bridge → Browser)

El bridge reenvía frames válidos como mensajes WebSocket:

```javascript
// Mensaje entrante en browser
{
  type: 'telemetry',
  payload: { /* frame validado */ },
  timestamp: 1700000000123  // server timestamp
}
```

### Tipos de Mensaje WebSocket

| Tipo | Dirección | Descripción |
|------|-----------|-------------|
| `telemetry` | Bridge → Browser | Frame de telemetría válido |
| `status` | Bridge → Browser | Estado del bridge (started/stopped/error) |
| `command` | Browser → Bridge | Comando a MATLAB (futuro) |
| `error` | Bridge → Browser | Error de validación/transporte |

## Implementación MATLAB (Sender UDP)

### Código MATLAB Recomendado

```matlab
% config_udp_sender.m
function udpSender = config_udp_sender()
    % Configurar UDP sender
    udpSender = udpport("IPV4");
    configureDestination(udpSender, "localhost", 45810);
end

% send_telemetry_frame.m
function send_telemetry_frame(udpSender, frameData)
    % frameData: struct con todos los campos schema V2
    jsonStr = jsonencode(frameData);
    write(udpSender, jsonStr, "string");
end

% Ejemplo de uso en callback de simulación
function simulinkCallback(block)
    persistent udpSender frameCount
    if isempty(udpSender)
        udpSender = config_udp_sender();
        frameCount = 0;
    end
    
    frameCount = frameCount + 1;
    
    frame = struct();
    frame.schemaVersion = 2;
    frame.source = "MATLAB_SIM";
    frame.sequence = frameCount;
    frame.simTime = block.CurrentTime;  % Tiempo de simulación
    frame.timestamp = round(datetime('now','ConvertTo','epochtime') * 1000);
    
    % ... leer señales de bloques y poblar frame ...
    % frame.systemState = ...
    % frame.gas.Z1.adc = ...
    % etc.
    
    send_telemetry_frame(udpSender, frame);
end
```

### Bloque MATLAB Function para Sender

```matlab
function udpSender(block)
%#codegen
% Bloque MATLAB Function para enviar telemetría por UDP
% Entradas: todas las señales necesarias (systemState, gasADC, pressure, etc.)

persistent udpSocket frameCount

if isempty(udpSocket)
    udpSocket = udpport("IPV4");
    configureDestination(udpSocket, "localhost", 45810);
    frameCount = 0;
end

frameCount = frameCount + 1;

frame = struct();
frame.schemaVersion = 2;
frame.source = "MATLAB_SIM";
frame.sequence = frameCount;
frame.simTime = block.CurrentTime;
frame.timestamp = round(datetime('now','ConvertTo','epochtime') * 1000);

% Mapear entradas a frame
% Asumiendo entradas: sysState, eventType, zoneMask, gasADC(3), pressure(5), flow(2), valves(4), buzzer, greenLed, redLed
frame.systemState = sysState;  % string
frame.eventType = eventType;   % string
frame.affectedZoneMask = zoneMask;

frame.gas.Z1.adc = gasADC(1);
frame.gas.Z1.level = gasLevel(gasADC(1));  % función helper
frame.gas.Z1.valid = true;
% ... Z2, Z3 similar

frame.pressure.P0 = pressure(1);
frame.pressure.P1 = pressure(2);
frame.pressure.PK = pressure(3);
frame.pressure.PL = pressure(4);
frame.pressure.PT = pressure(5);

frame.flow.main = flow(1);
frame.flow.living = flow(2);

frame.valves.VM = valveState(valves(1));  % 'OPEN'|'CLOSED'
frame.valves.VK = valveState(valves(2));
frame.valves.VL = valveState(valves(3));
frame.valves.VT = valveState(valves(4));

frame.buzzer = buzzer;
frame.greenLed = greenLed;
frame.redLed = redLed;

jsonStr = jsonencode(frame);
write(udpSocket, jsonStr, "string");
end
```

## Implementación Bridge (Node.js)

### Estructura

```
web-digital-twin/bridge/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry point
│   ├── udpServer.ts      # UDP receiver
│   ├── wsServer.ts       # WebSocket broadcaster
│   ├── validator.ts      # Re-usa validator del frontend
│   └── types.ts          # Tipos compartidos
└── dist/                 # Compilado
```

### Dependencias

```json
{
  "dependencies": {
    "ws": "^8.14.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/ws": "^8.5.0",
    "typescript": "^5.3.0"
  }
}
```

### UDP Server (src/udpServer.ts)

```typescript
import dgram from 'dgram';
import { validateTelemetryFrame } from '../src/telemetry/validator';
import type { ValidatedTelemetry } from '../src/telemetry/types';

export class UDPServer {
  private socket: dgram.Socket;
  private port: number;
  private onFrame: (frame: ValidatedTelemetry) => void;

  constructor(port: number, onFrame: (frame: ValidatedTelemetry) => void) {
    this.port = port;
    this.onFrame = onFrame;
    this.socket = dgram.createSocket('udp4');
    
    this.socket.on('message', (msg) => this.handleMessage(msg));
    this.socket.on('error', (err) => console.error('[UDP] Error:', err));
  }

  private handleMessage(msg: Buffer) {
    try {
      const text = msg.toString('utf8');
      const frame = validateTelemetryFrame(JSON.parse(text));
      if (frame) {
        frame.source = 'MATLAB_SIM';  // Forzar source
        this.onFrame(frame);
      }
    } catch (e) {
      console.warn('[UDP] Invalid frame:', e);
    }
  }

  start() {
    this.socket.bind(this.port);
    console.log(`[Bridge] UDP listening on ${this.port}`);
  }

  stop() {
    this.socket.close();
  }
}
```

### WebSocket Server (src/wsServer.ts)

```typescript
import WebSocket from 'ws';
import type { ValidatedTelemetry } from '../src/telemetry/types';

export class WSServer {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[Bridge] WS client connected (${this.clients.size} total)`);
      
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[Bridge] WS client disconnected (${this.clients.size} total)`);
      });
      
      ws.on('error', (err) => console.error('[WS] Error:', err));
    });
  }

  broadcast(frame: ValidatedTelemetry) {
    const message = JSON.stringify({
      type: 'telemetry',
      payload: frame,
      timestamp: Date.now(),
    });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  stop() {
    this.clients.forEach(c => c.close());
    this.wss.close();
  }
}
```

### Main Bridge (src/index.ts)

```typescript
import { UDPServer } from './udpServer';
import { WSServer } from './wsServer';
import type { ValidatedTelemetry } from '../src/telemetry/types';

const UDP_PORT = parseInt(process.env.BRIDGE_UDP_PORT || '45810');
const WS_PORT = parseInt(process.env.BRIDGE_WS_PORT || '45811');

const wsServer = new WSServer(WS_PORT);
const udpServer = new UDPServer(UDP_PORT, (frame) => {
  wsServer.broadcast(frame);
});

udpServer.start();

process.on('SIGINT', () => {
  udpServer.stop();
  wsServer.stop();
  process.exit(0);
});

console.log('[Bridge] Started - MATLAB LIVE transport enabled');
console.log(`  UDP: localhost:${UDP_PORT}`);
console.log(`  WS:  localhost:${WS_PORT}`);
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
```

## Cliente WebSocket (Frontend)

### Hook de Conexión (src/hooks/useBridge.ts)

```typescript
import { useEffect, useRef } from 'react';
import { useDigitalTwinStore } from '../state/store';
import { validateTelemetryFrame } from '../telemetry/validator';

export function useBridge(wsUrl: string = 'ws://localhost:45811') {
  const wsRef = useRef<WebSocket | null>(null);
  const setTelemetryFrame = useDigitalTwinStore(s => s.setTelemetryFrame);
  const setSource = useDigitalTwinStore(s => s.setSource);

  useEffect(() => {
    setSource('MATLAB_SIM');
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'telemetry' && msg.payload) {
          const frame = validateTelemetryFrame(msg.payload);
          if (frame) setTelemetryFrame(frame);
        }
      } catch (e) {
        console.warn('[WS] Invalid message:', e);
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('[WS] Disconnected from bridge');
      setSource('MOCK_SIM');  // Fallback
    };
    
    wsRef.current.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
    
    return () => {
      wsRef.current?.close();
    };
  }, [wsUrl, setTelemetryFrame, setSource]);
}
```

### Uso en App.tsx

```tsx
import { useBridge } from './hooks/useBridge';

function App() {
  const currentSource = useDigitalTwinStore(selectCurrentSource);
  
  // Solo conectar si source es MATLAB_SIM
  useBridge(currentSource === 'MATLAB_SIM' ? 'ws://localhost:45811' : '');
  
  // ...
}
```

## Testing del Bridge

### Test Manual con netcat

```bash
# Enviar frame de prueba
echo '{"schemaVersion":2,"source":"MATLAB_SIM","sequence":1,"simTime":0,"timestamp":1234567890,"systemState":"NORMAL","eventType":"NONE","affectedZoneMask":0,"gas":{"Z1":{"adc":800,"level":"NORMAL","valid":true},"Z2":{"adc":750,"level":"NORMAL","valid":true},"Z3":{"adc":700,"level":"NORMAL","valid":true}},"pressure":{"P0":20,"P1":18,"PK":17,"PL":16,"PT":15},"flow":{"main":5,"living":2},"valves":{"VM":"OPEN","VK":"OPEN","VL":"OPEN","VT":"OPEN"},"buzzer":false,"greenLed":true,"redLed":false}' | nc -u -w1 localhost 45810
```

### Test WebSocket con wscat

```bash
npm install -g wscat
wscat -c ws://localhost:45811
```

## Seguridad

- **Solo localhost** por defecto (bind 127.0.0.1)
- **Validación estricta** en bridge y frontend
- **No comandos** de browser a MATLAB (solo telemetría downlink)
- **Rate limiting** recomendado en bridge (max 100 fps)
- **TLS/WSS** para producción (requiere certs)

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| No llegan frames | Puerto UDP bloqueado | Firewall permitir 45810 UDP |
| Frames inválidos | MATLAB envía campos extraños | Validar struct antes de jsonencode |
| WebSocket no conecta | Bridge no iniciado | `npm run bridge:dev` |
| Datos STALE | MATLAB < 30 Hz | Aumentar rate o ajustar thresholds |
| Datos DISCONNECTED | MATLAB detenido | Verificar simulación corriendo |

## Variables de Entorno

```bash
# Bridge
BRIDGE_UDP_PORT=45810
BRIDGE_WS_PORT=45811
BRIDGE_BIND_HOST=127.0.0.1  # 0.0.0.0 para LAN
BRIDGE_MAX_FPS=100
BRIDGE_LOG_LEVEL=info

# Frontend (build time)
VITE_WS_URL=ws://localhost:45811
```

## Roadmap

- [ ] Bridge implementation completa (Node.js)
- [ ] MATLAB Function block sender
- [ ] Comando browser → MATLAB (setScenario, reset) con ACK
- [ ] TLS/WSS para deployment remoto
- [ ] Métricas de latencia end-to-end
- [ ] Buffer de reordenamiento UDP (out-of-order)