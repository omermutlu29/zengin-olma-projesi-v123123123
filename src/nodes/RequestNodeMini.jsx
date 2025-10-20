import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function RequestNodeMini({ id, data, selected }) {
  const { name, method = "GET", delay = 0, runtime } = data || {};

  const isRunning = !!runtime?.running;
  const hasError = !!runtime?.error;
  const hasStatus = typeof runtime?.status === "number";
  const isSuccess = hasStatus && runtime.status >= 200 && runtime.status < 300;

  const statusClass = isRunning
    ? "status-running"
    : hasError
    ? "status-fail"
    : isSuccess
    ? "status-success"
    : "status-idle";

  return (
    <div className={`node-mini ${statusClass}`} style={{ border: selected ? "1px solid var(--accent)" : undefined }}>
      <div className="node-mini-header">
        <span className="title">{name || id}</span>
        {isRunning && <span className="spinner" title="Running" />}
        <span className="tag">{method}</span>
        {delay ? <span className="tag">{delay}ms</span> : null}
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
export default memo(RequestNodeMini);
