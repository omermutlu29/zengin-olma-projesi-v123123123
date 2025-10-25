import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function RequestNodeMini({ id, data, selected }) {
  const { name, method = "GET", delay = 0, runtime } = data || {};

  const isRunning = !!runtime?.running;
  const hasError = !!runtime?.error;
  const hasStatus = typeof runtime?.status === "number";
  const isSuccess = hasStatus && runtime.status >= 200 && runtime.status < 300;

  // WebSocket'ten gelen runtime status'u kullan
  const runtimeStatus = runtime?.status;
  const isFailed = runtimeStatus === 'failed';
  const isCompleted = runtimeStatus === 'completed';

  const statusClass = isRunning
    ? "status-running"
    : isFailed || hasError
    ? "status-fail"
    : isCompleted || isSuccess
    ? "status-success"
    : "status-idle";

  // HTTP method renkleri (Brand Colors)
  const getMethodColor = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET': return 'var(--method-get)';
      case 'POST': return 'var(--method-post)';
      case 'PUT': return 'var(--method-put)';
      case 'DELETE': return 'var(--method-delete)';
      case 'PATCH': return 'var(--method-patch)';
      default: return 'var(--muted)';
    }
  };

  const methodColor = getMethodColor(method);

  return (
    <div 
      className={`node-mini ${statusClass}`} 
      style={{ 
        border: selected ? "1px solid var(--accent)" : undefined
      }}
    >
      <div className="node-mini-header">
        <span className="title">{name || id}</span>
        {isRunning && <span className="spinner" title="Running" />}
        <span 
          className="tag" 
          style={{ 
            backgroundColor: methodColor,
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {method}
        </span>
        {delay ? <span className="tag">{delay}ms</span> : null}
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
export default memo(RequestNodeMini);
