import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function CustomNode({ data, selected }) {
  return (
    <div
      style={{
        border: selected ? "2px solid #2563eb" : "1px solid #d1d5db",
        borderRadius: 8,
        padding: 10,
        background: "#fff",
        minWidth: 200,
      }}
    >
      <strong>{data.name}</strong>
      <div className="small">{data.url}</div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(CustomNode);
