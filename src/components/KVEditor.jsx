export default function KVEditor({ label, objPath, obj = {}, onChangePath, onLink }) {
  const setField = (key, val) => onChangePath(`${objPath}.${key}`, val);
  const removeKey = (key) => {
    const copy = { ...obj };
    delete copy[key];
    onChangePath(objPath, copy);
  };
  const addKey = () => {
    const key = prompt(`${label} key?`);
    if (!key) return;
    const copy = { ...obj, [key]: "" };
    onChangePath(objPath, copy);
  };

  return (
    <div>
      {Object.entries(obj).map(([k, v]) => (
        <div className="kv-row" key={k}>
          <input value={k} readOnly />
          <div className="linked-input">
            <input
              value={typeof v === "string" ? v : JSON.stringify(v)}
              onChange={(e) => {
                const val = e.target.value;
                try { setField(k, JSON.parse(val)); }
                catch { setField(k, val); }
              }}
              placeholder="value or {{req-1.response[0].id}}"
            />
            <button className="btn" onClick={() => onLink(`${objPath}.${k}`)}>🔗</button>
          </div>
          <button className="btn" onClick={() => removeKey(k)}>🗑</button>
        </div>
      ))}
      <button className="btn" onClick={addKey}>+ Add {label.slice(0, -1)}</button>
    </div>
  );
}
