import KVEditor from "./KVEditor";
import JsonLinkTree from "./JsonLinkTree";
import AssertionsList from "./AssertionsList";

export default function InspectorSidebar({
  selectedNode, linking, onAddNode, onStartLink, onPickPath, onChangeField, onDelete
}) {
  if (!selectedNode) {
    return (
      <aside className="inspector">
        <div className="inspector__top">
          <button className="btn primary" onClick={onAddNode}>+ Add Request</button>
          <span className="small" style={{ marginLeft: 8 }}>Bir node seçin veya yeni oluşturun</span>
        </div>
        <div className="inspector__body" />
      </aside>
    );
  }

  const id = selectedNode.id;
  const data = selectedNode.data || {};
  const {
    name, method, url, order, headers = {}, cookies = {}, queryParams = {},
    body = {}, expected = {}, delay = 0,
    assertions = { http:[], kafka:[], database:[], redis:[] },
    runtime = {}
  } = data;

  const setField = (path, val) => onChangeField(id, path, val);

  return (
    <aside className="inspector">
      <div className="inspector__top">
      
        <span className="small" style={{ marginLeft: 8 }}>
          Seçili node: <b>{name || id}</b>
        </span>
        <div style={{ marginLeft: "auto" }}>
        
        </div>
      </div>

      <div className="inspector__body">
        <div className="card">
          {/* Request */}
          <div className="section">
            <h4>Request</h4>
            <div className="row" style={{ marginBottom: 8 }}>
              <div>
                <div className="small">Name</div>
                <input value={name || ""} onChange={(e)=>setField("name", e.target.value)} placeholder="Node name" />
              </div>
              <div>
                <div className="small">Order</div>
                <input value={order ?? ""} onChange={(e)=>setField("order", e.target.value ? parseInt(e.target.value,10) : undefined)} placeholder="1,2,3…" />
              </div>
            </div>
            <div className="row" style={{ marginBottom: 8 }}>
              <div>
                <div className="small">Method</div>
                <select value={method} onChange={(e)=>setField("method", e.target.value)}>
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
                </select>
              </div>
              <div>
                <div className="small">URL</div>
                <div className="linked-input">
                  <input value={url || ""} placeholder="/posts/{{req-1.response[5].id}}" onChange={(e)=>setField("url", e.target.value)} />
                  <button className="btn" onClick={()=>onStartLink(id, "url")}>🔗</button>
                </div>
              </div>
            </div>
            <div className="row">
              <div>
                <div className="small">Delay (ms)</div>
                <input type="number" min={0} value={delay} onChange={(e)=>setField("delay", parseInt(e.target.value||"0",10))} />
              </div>
              <div style={{ alignSelf:"end" }} className="small">Placeholders supported everywhere ↑</div>
            </div>
          </div>

          {/* Headers / Cookies / Query */}
          <div className="section">
            <h4>Headers</h4>
            <KVEditor label="Headers" objPath="headers" obj={headers} onChangePath={(p,v)=>setField(p,v)} onLink={(p)=>onStartLink(id,p)} />
          </div>
          <div className="section">
            <h4>Cookies</h4>
            <KVEditor label="Cookies" objPath="cookies" obj={cookies} onChangePath={(p,v)=>setField(p,v)} onLink={(p)=>onStartLink(id,p)} />
          </div>
          <div className="section">
            <h4>Query Params</h4>
            <KVEditor label="Query Params" objPath="queryParams" obj={queryParams} onChangePath={(p,v)=>setField(p,v)} onLink={(p)=>onStartLink(id,p)} />
          </div>

          {/* Body */}
          <div className="section">
            <h4>Body (JSON)</h4>
            <textarea
              className="code"
              defaultValue={JSON.stringify(body || {}, null, 2)}
              onBlur={(e)=>{ try{ setField("body", JSON.parse(e.target.value||"{}")); } catch{} }}
            />
            <div className="small" style={{ margin: "8px 0" }}>Body Fields (🔗 ile linkle, 📋 ile kopyala)</div>
            <JsonLinkTree
              basePath="body"
              value={body || {}}
              onPick={(p)=>onPickPath(id,p)}
              maxDepth={3}
              nodeId={id}
              copyMode="placeholder"
            />
          </div>

          {/* Expected → UI'da response olarak gösteriyoruz */}
          <div className="section">
            <h4>Response (Expected JSON)</h4>
            <textarea
              className="code"
              defaultValue={JSON.stringify(expected || {}, null, 2)}
              onBlur={(e)=>{ try{ setField("expected", JSON.parse(e.target.value||"{}")); } catch{} }}
            />
            <div className="small" style={{ margin: "8px 0" }}>Response Fields</div>
            <JsonLinkTree
              basePath="response"
              value={expected || {}}
              onPick={(p)=>onPickPath(id,p)}
              maxDepth={3}
              nodeId={id}
              copyMode="placeholder"
            />
          </div>

          {/* Assertions */}
          <div className="section">
            <h4>Assertions</h4>
            <AssertionsList label="HTTP"   list={assertions.http}      onChange={(l)=>setField("assertions.http", l)} onLink={(p)=>onStartLink(id,p)} />
            <AssertionsList label="Kafka"  list={assertions.kafka}     onChange={(l)=>setField("assertions.kafka", l)} onLink={(p)=>onStartLink(id,p)} kind="kafka" />
            <AssertionsList label="DB"     list={assertions.database}  onChange={(l)=>setField("assertions.database", l)} onLink={(p)=>onStartLink(id,p)} kind="db" />
            <AssertionsList label="Redis"  list={assertions.redis}     onChange={(l)=>setField("assertions.redis", l)} onLink={(p)=>onStartLink(id,p)} kind="redis" />
          </div>

          {/* Last Run (salt-okunur özet) */}
          <div className="section">
            <h4>Last Run</h4>
            <div className="small" style={{ marginBottom: 6 }}>
              Status: <b>{runtime?.status ?? "—"}</b>
              {runtime?.error ? <> — <span style={{ color: "#b91c1c" }}>{runtime.error}</span></> : null}
            </div>
            <div className="scroll-area" style={{ maxHeight: 180 }}>
              <pre style={{ margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word", fontSize:12 }}>
                {runtime?.response != null ? JSON.stringify(runtime.response, null, 2) : "—"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
