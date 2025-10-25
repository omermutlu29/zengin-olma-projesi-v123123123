import { useMemo, useState } from "react";

function NodeRow({ path, label, value, onPick, copyText }) {
  const isObj = value && typeof value === "object";
  return (
    <div className="json-row" style={{ marginLeft: 0 }}>
      <code className="path">{label}</code>
      {isObj ? <code className="ghost">{Array.isArray(value) ? "[…]" : "{…}"}</code>
             : <code className="val">{typeof value === "string" ? JSON.stringify(value) : String(value)}</code>}
      {!isObj && (
        <>
          <button className="btn" onClick={() => onPick(path)} title="Link this path">🔗</button>
          <button className="btn" onClick={() => navigator.clipboard?.writeText(copyText)} title="Copy path">📋</button>
        </>
      )}
    </div>
  );
}

/**
 * Props:
 * - basePath: "body" | "response" ...
 * - value: any
 * - onPick: (fullPath) => void   // fullPath = `${basePath}....`
 * - maxDepth: number
 * - nodeId?: string
 * - copyMode?: "raw" | "qualified" | "placeholder"
 *    raw         -> body[0].id
 *    qualified   -> req-1.body[0].id
 *    placeholder -> {{req-1.body[0].id}}
 */
export default function JsonLinkTree({
  basePath, value, onPick, maxDepth = 3,
  nodeId, copyMode = "placeholder", collapsedByDefault = true
}) {
  const entries = useMemo(() => {
    if (Array.isArray(value)) return value.map((v, i) => ({ k: i, v, isIndex: true }));
    if (value && typeof value === "object") return Object.entries(value).map(([k, v]) => ({ k, v, isIndex: false }));
    return [];
  }, [value]);

  const [open, setOpen] = useState(() => {
    const o = new Map();
    entries.forEach((e) => o.set(String(e.k), !collapsedByDefault));
    return o;
  });

  const toggle = (key) => setOpen((m) => new Map(m).set(key, !(m.get(key) ?? false)));

  const buildCopy = (fullPath) => {
    if (copyMode === "raw") return fullPath.replace(/^.*?\./, ""); // body[0].x ya da response[...]
    if (copyMode === "placeholder") {
      const q = nodeId ? `${nodeId}.${fullPath}` : fullPath;
      return `{{${q}}}`;
    }
    return nodeId ? `${nodeId}.${fullPath}` : fullPath; // qualified
  };

  const renderNode = (node, depth, parentPath) => {
    const seg = node.isIndex ? `[${node.k}]` : node.k;
    const fullPath = node.isIndex ? `${parentPath}${seg}` : `${parentPath}.${seg}`;
    const isObj = node.v && typeof node.v === "object";
    const key = String(node.k);
    const isOpen = open.get(key) ?? false;

    return (
      <div key={fullPath} style={{ marginLeft: depth * 12 }}>
        <div className="json-row">
          <button className="btn" onClick={() => isObj && toggle(key)} style={{ padding: "2px 8px" }}>
            {isObj ? (isOpen ? "▾" : "▸") : "•"}
          </button>
          <NodeRow
            path={fullPath}
            label={node.isIndex ? `[${node.k}]` : node.k}
            value={node.v}
            onPick={onPick}
            copyText={buildCopy(fullPath)}
          />
        </div>

        {isObj && isOpen && depth < maxDepth && (
          <div>
            {Array.isArray(node.v)
              ? node.v.map((vv, ii) => renderNode({ k: ii, v: vv, isIndex: true }, depth + 1, fullPath))
              : Object.entries(node.v).map(([kk, vv]) => renderNode({ k: kk, v: vv, isIndex: false }, depth + 1, fullPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="scroll-area">
      {entries.map((e) => renderNode(e, 0, basePath))}
      {!entries.length && <div className="small">No fields</div>}
    </div>
  );
}
