export default function Sidebar({ nodes = [], onAdd, onFocus }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <button className="btn primary" onClick={onAdd}>+ Add Request</button>
      </div>
      <div className="sidebar__list">
        {nodes.map((n) => (
          <div key={n.id} className="sidebar__item" onClick={() => onFocus?.(n.id)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <strong>{n.data?.name || n.id}</strong>
              <span style={{ fontSize:12, color:"#6b7280" }}>{n.data?.method || "GET"}</span>
            </div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>
              {(n.data?.url || "").slice(0, 48) || "—"}
            </div>
          </div>
        ))}
        {!nodes.length && <div style={{ color:"#6b7280", fontSize:12 }}>No requests yet</div>}
      </div>
    </aside>
  );
}
