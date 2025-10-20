export default function AssertionsList({ label, list = [], onChange, onLink, kind }) {
  const add = () => {
    const base =
      kind === "kafka" ? { topic: "", condition: { field: "", operator: "exists" }, timeoutMs: 5000 } :
      kind === "db"    ? { datasource: "", query: "", operator: "equals", value: "" } :
      kind === "redis" ? { key: "", operator: "equals", value: "" } :
                         { path: "", operator: "equals", value: "" };
    onChange([...(list || []), base]);
  };

  const setIdx = (i, key, val) => {
    const copy = [...(list || [])];
    if (kind === "kafka" && key.startsWith("condition.")) {
      const kk = key.split(".")[1];
      copy[i] = { ...copy[i], condition: { ...(copy[i].condition || {}), [kk]: val } };
    } else {
      copy[i] = { ...copy[i], [key]: val };
    }
    onChange(copy);
  };

  const remove = (i) => onChange([...(list || [])].filter((_, idx) => idx !== i));

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <strong>{label}</strong>
        <button className="btn" onClick={add}>+ Add</button>
      </div>
      {(list || []).map((a, i) => (
        <div className="kv-row" key={i} style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
          {kind === "kafka" ? (
            <>
              <input placeholder="topic" value={a.topic || ""} onChange={e => setIdx(i, "topic", e.target.value)} />
              <input placeholder="condition.field" value={a.condition?.field || ""} onChange={e => setIdx(i, "condition.field", e.target.value)} />
              <input placeholder="condition.operator" value={a.condition?.operator || ""} onChange={e => setIdx(i, "condition.operator", e.target.value)} />
              <button className="btn" onClick={() => onLink(`assertions.kafka.${i}.condition.field`)}>🔗</button>
              <input placeholder="timeoutMs" value={a.timeoutMs ?? ""} onChange={e => setIdx(i, "timeoutMs", parseInt(e.target.value || "0", 10))} />
              <button className="btn" onClick={() => remove(i)}>🗑</button>
            </>
          ) : kind === "db" ? (
            <>
              <input placeholder="datasource" value={a.datasource || ""} onChange={e => setIdx(i, "datasource", e.target.value)} />
              <div className="linked-input">
                <input placeholder="query" value={a.query || ""} onChange={e => setIdx(i, "query", e.target.value)} />
                <button className="btn" onClick={() => onLink(`assertions.database.${i}.query`)}>🔗</button>
              </div>
              <input placeholder="operator" value={a.operator || ""} onChange={e => setIdx(i, "operator", e.target.value)} />
              <input placeholder="value" value={a.value ?? ""} onChange={e => setIdx(i, "value", e.target.value)} />
              <button className="btn" onClick={() => remove(i)}>🗑</button>
            </>
          ) : kind === "redis" ? (
            <>
              <div className="linked-input">
                <input placeholder="key" value={a.key || ""} onChange={e => setIdx(i, "key", e.target.value)} />
                <button className="btn" onClick={() => onLink(`assertions.redis.${i}.key`)}>🔗</button>
              </div>
              <input placeholder="operator" value={a.operator || ""} onChange={e => setIdx(i, "operator", e.target.value)} />
              <input placeholder="value" value={a.value ?? ""} onChange={e => setIdx(i, "value", e.target.value)} />
              <button className="btn" onClick={() => remove(i)}>🗑</button>
            </>
          ) : (
            <>
              <div className="linked-input">
                <input placeholder="path (e.g. response[0].id)" value={a.path || ""} onChange={e => setIdx(i, "path", e.target.value)} />
                <button className="btn" onClick={() => onLink(`assertions.http.${i}.path`)}>🔗</button>
              </div>
              <input placeholder="operator" value={a.operator || ""} onChange={e => setIdx(i, "operator", e.target.value)} />
              <input placeholder="value" value={a.value ?? ""} onChange={e => setIdx(i, "value", e.target.value)} />
              <button className="btn" onClick={() => remove(i)}>🗑</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
