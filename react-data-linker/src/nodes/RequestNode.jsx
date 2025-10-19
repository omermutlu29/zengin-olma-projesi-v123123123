import { memo, useCallback, useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import KVEditor from "../components/KVEditor";
import JsonLinkTree from "../components/JsonLinkTree";
import AssertionsList from "../components/AssertionsList";

function RequestNode({ id, data, selected }) {
  const {
    name, method, url, headers = {}, cookies = {}, queryParams = {},
    body = {}, expected = {}, delay = 0,
    assertions = { http:[], kafka:[], database:[], redis:[] },
    onChange, onLink, onPickPath
  } = data;

  /* Collapse/Expand durumu */
  const [collapsed, setCollapsed] = useState(false);

  /* Bölümler için aç/kapa state */
  const [open, setOpen] = useState({
    req:true, headers:true, cookies:false, qp:false, body:true, expected:true, assertions:false
  });

  /* Canlı JSON editörleri */
  const [expectedRaw, setExpectedRaw] = useState(JSON.stringify(expected, null, 2));
  const [expectedErr, setExpectedErr] = useState("");
  const [bodyRaw, setBodyRaw] = useState(JSON.stringify(body, null, 2));
  const [bodyErr, setBodyErr] = useState("");

  const setField = useCallback((path, val) => onChange(id, path, val), [id, onChange]);

  const expectedObj = useMemo(() => {
    try { return JSON.parse(expectedRaw || "{}"); } catch { return expected || {}; }
  }, [expectedRaw, expected]);

  const bodyObj = useMemo(() => {
    try { return JSON.parse(bodyRaw || "{}"); } catch { return body || {}; }
  }, [bodyRaw, body]);

  const startLink = (path) => onLink(id, path);
  const pickPath  = (srcPath) => onPickPath(id, srcPath);

  /* Header özet: method + kısa URL + delay */
  const summaryUrl = (url || "").length > 56 ? (url || "").slice(0, 56) + "…" : (url || "");
  const headerSummary = (
    <div className="header-summary">
      <span className="pill">{method}</span>
      {summaryUrl && <span title={url}>{summaryUrl}</span>}
      {delay ? <span className="pill">{delay}ms</span> : null}
    </div>
  );

  return (
    <div className={`node-card ${collapsed ? "collapsed" : ""}`} style={{ border: selected ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
      {/* HEADER */}
      <div className="node-header" onDoubleClick={() => setCollapsed(c => !c)}>
        <button
          className="btn icon"
          onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}
          title={collapsed ? "Expand" : "Collapse"}
          aria-label={collapsed ? "Expand node" : "Collapse node"}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <span className="title" tabIndex={0}>{name || id}</span>
        <div className="header-actions" style={{ marginLeft: "auto" }}>
          {headerSummary}
        </div>
      </div>

      {/* === collapsed ise aşağıdaki .section blokları CSS ile gizlenir === */}

      {/* REQUEST */}
      <div className="section">
        <h4 onClick={() => setOpen(s => ({ ...s, req: !s.req }))}>Request</h4>
        {open.req && (
          <>
            <div className="row" style={{ marginBottom: 8 }}>
              <div>
                <div className="small">Method</div>
                <select value={method} onChange={(e) => setField("method", e.target.value)}>
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
                </select>
              </div>
              <div>
                <div className="small">URL</div>
                <div className="linked-input">
                  <input
                    value={url || ""}
                    placeholder="https://api/... or /posts/{{req-1.expected.body[0].id}}"
                    onChange={(e) => setField("url", e.target.value)}
                  />
                  <button className="btn" onClick={() => startLink("url")}>🔗</button>
                </div>
              </div>
            </div>

            <div className="row" style={{ marginBottom: 8 }}>
              <div>
                <div className="small">Delay (ms)</div>
                <input
                  type="number" min={0} value={delay}
                  onChange={(e) => setField("delay", parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div>
                <div className="small">Name</div>
                <input value={name || ""} placeholder="Node name" onChange={(e) => setField("name", e.target.value)} />
              </div>
            </div>

            <div className="row">
              <div>
                <div className="small">Order</div>
                <input
                  value={data.order ?? ""}
                  placeholder="1,2,3…"
                  onChange={(e) => setField("order", e.target.value ? parseInt(e.target.value,10) : undefined)}
                />
              </div>
              <div style={{ alignSelf:"end" }} className="small">Placeholders supported everywhere ↑</div>
            </div>
          </>
        )}
      </div>

      {/* KV EDITORLAR */}
      <div className="section">
        <h4 onClick={() => setOpen(s => ({ ...s, headers: !s.headers }))}>Headers</h4>
        {open.headers && (
          <KVEditor
            label="Headers"
            objPath="headers"
            obj={headers}
            onChangePath={(p,v)=>setField(p,v)}
            onLink={(p)=>startLink(p)}
          />
        )}
      </div>

      <div className="section">
        <h4 onClick={() => setOpen(s => ({ ...s, cookies: !s.cookies }))}>Cookies</h4>
        {open.cookies && (
          <KVEditor
            label="Cookies"
            objPath="cookies"
            obj={cookies}
            onChangePath={(p,v)=>setField(p,v)}
            onLink={(p)=>startLink(p)}
          />
        )}
      </div>

      <div className="section">
        <h4 onClick={() => setOpen(s => ({ ...s, qp: !s.qp }))}>Query Params</h4>
        {open.qp && (
          <KVEditor
            label="Query Params"
            objPath="queryParams"
            obj={queryParams}
            onChangePath={(p,v)=>setField(p,v)}
            onLink={(p)=>startLink(p)}
          />
        )}
      </div>

      {/* BODY */}
      <div className="section">
        <h4 onClick={() => setOpen(s => ({ ...s, body: !s.body }))}>Body (JSON)</h4>
        {open.body && (
          <>
            <textarea
              className="code"
              value={bodyRaw}
              onChange={(e) => {
                setBodyRaw(e.target.value);
                try { const parsed = JSON.parse(e.target.value || "{}"); setField("body", parsed); setBodyErr(""); }
                catch (err) { setBodyErr(String(err)); }
              }}
            />
            <div className="small" style={{ marginBottom: 8 }}>
              {bodyErr ? <span style={{ color:"#f87171" }}>JSON error: {bodyErr}</span> : "Placeholders allowed (e.g. {{req-1.expected.body[0].id}})"}
            </div>
            <JsonLinkTree basePath="body" value={bodyObj} onPick={(p)=>pickPath(p)} maxDepth={3} />
          </>
        )}
      </div>

      {/* EXPECTED */}
      <div className="section">
        <h4 onClick={() => setOpen(s => ({ ...s, expected: !s.expected }))}>Expected (JSON)</h4>
        {open.expected && (
          <>
            <textarea
              className="code"
              value={expectedRaw}
              onChange={(e) => {
                setExpectedRaw(e.target.value);
                try { const parsed = JSON.parse(e.target.value || "{}"); setField("expected", parsed); setExpectedErr(""); }
                catch (err) { setExpectedErr(String(err)); }
              }}
            />
            <div className="small" style={{ marginBottom: 8 }}>
              {expectedErr ? <span style={{ color:"#f87171" }}>JSON error: {expectedErr}</span> : "Link from fields below"}
            </div>
            <JsonLinkTree basePath="expected" value={expectedObj} onPick={(p)=>pickPath(p)} maxDepth={3} />
          </>
        )}
      </div>

      {/* ASSERTIONS */}
      <div className="section">
        <h4 onClick={() => setOpen(s => ({ ...s, assertions: !s.assertions }))}>Assertions</h4>
        {open.assertions && (
          <>
            <AssertionsList label="HTTP"   list={assertions.http}      onChange={(l)=>setField("assertions.http", l)} onLink={(p)=>startLink(p)} />
            <AssertionsList label="Kafka"  list={assertions.kafka}     onChange={(l)=>setField("assertions.kafka", l)} onLink={(p)=>startLink(p)} kind="kafka" />
            <AssertionsList label="DB"     list={assertions.database}  onChange={(l)=>setField("assertions.database", l)} onLink={(p)=>startLink(p)} kind="db" />
            <AssertionsList label="Redis"  list={assertions.redis}     onChange={(l)=>setField("assertions.redis", l)} onLink={(p)=>startLink(p)} kind="redis" />
          </>
        )}
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(RequestNode);
