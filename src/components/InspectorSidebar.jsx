import { useState, useEffect, useRef } from "react";
import KVEditor from "./KVEditor";
import JsonLinkTree from "./JsonLinkTree";
import AssertionsList from "./AssertionsList";

export default function InspectorSidebar({
  selectedNode, linking, onAddNode, onStartLink, onPickPath, onChangeField, onDelete,
  position, onPositionChange, width, onWidthChange
}) {
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  
  // Accordion state - varsayılan olarak Request ve Last Run açık
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem("sidebarExpandedSections");
    return saved ? JSON.parse(saved) : {
      request: true,
      headers: false,
      cookies: false,
      queryParams: false,
      body: false,
      response: false,
      assertions: false,
      lastRun: true
    };
  });

  // Textarea değerleri için local state
  const [bodyText, setBodyText] = useState("");
  const [responseText, setResponseText] = useState("");

  useEffect(() => {
    localStorage.setItem("sidebarExpandedSections", JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Node değiştiğinde textarea değerlerini node'dan yükle
  useEffect(() => {
    if (selectedNode) {
      setBodyText(JSON.stringify(selectedNode.data?.body || {}, null, 2));
      setResponseText(JSON.stringify(selectedNode.data?.expected || {}, null, 2));
    }
  }, [selectedNode?.id]); // Sadece ID değiştiğinde yükle

  // Body değişikliklerini kaydet
  const handleBodyChange = (value) => {
    setBodyText(value);
  };

  const handleBodyBlur = () => {
    if (!selectedNode) return;
    try {
      const parsed = JSON.parse(bodyText);
      onChangeField(selectedNode.id, "body", parsed);
    } catch (e) {
      // JSON parse hatası, kaydetme
    }
  };

  // Response değişikliklerini kaydet
  const handleResponseChange = (value) => {
    setResponseText(value);
  };

  const handleResponseBlur = () => {
    if (!selectedNode) return;
    try {
      const parsed = JSON.parse(responseText);
      onChangeField(selectedNode.id, "expected", parsed);
    } catch (e) {
      // JSON parse hatası, kaydetme
    }
  };

  // Resize handler
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (!onWidthChange) return;
      
      let newWidth;
      if (position === "left") {
        newWidth = e.clientX;
      } else {
        newWidth = window.innerWidth - e.clientX;
      }
      newWidth = Math.max(320, Math.min(newWidth, window.innerWidth * 0.6));
      
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, position, onWidthChange]);

  const positionOptions = [
    { value: "left", label: "◀" },
    { value: "right", label: "▶" },
  ];

  if (!selectedNode) {
    return (
      <aside className={`inspector inspector--${position}`} ref={sidebarRef} style={{ 
        width: `${width}px`
      }}>
        <div className="inspector__top">
          <button className="btn primary" onClick={onAddNode}>+ Add Request</button>
          <span className="small" style={{ marginLeft: 8 }}>Bir node seçin veya yeni oluşturun</span>
          
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {positionOptions.map((opt) => (
              <button
                key={opt.value}
                className={`btn icon ${position === opt.value ? "primary" : ""}`}
                onClick={() => onPositionChange?.(opt.value)}
                title={`Position: ${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="inspector__body" />
        <div 
          className={`resize-handle resize-handle--${position}`}
          onMouseDown={handleMouseDown}
        />
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
    <aside className={`inspector inspector--${position}`} ref={sidebarRef} style={{ 
      width: `${width}px`
    }}>
      <div className="inspector__top">
        <span className="small" style={{ marginLeft: 8 }}>
          Seçili node: <b>{name || id}</b>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {positionOptions.map((opt) => (
            <button
              key={opt.value}
              className={`btn icon ${position === opt.value ? "primary" : ""}`}
              onClick={() => onPositionChange?.(opt.value)}
              title={`Position: ${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="inspector__body">
        <div className="card">
          {/* Request */}
          <div className="section">
            <h4 className="section-header" onClick={() => toggleSection('request')}>
              <span className={`section-toggle ${expandedSections.request ? 'expanded' : ''}`}>▶</span>
              Request
            </h4>
            {expandedSections.request && (
              <div className="section-content">
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
            )}
          </div>

          {/* Headers / Cookies / Query */}
          <div className="section">
            <h4 className="section-header" onClick={() => toggleSection('headers')}>
              <span className={`section-toggle ${expandedSections.headers ? 'expanded' : ''}`}>▶</span>
              Headers
            </h4>
            {expandedSections.headers && (
              <div className="section-content">
                <KVEditor label="Headers" objPath="headers" obj={headers} onChangePath={(p,v)=>setField(p,v)} onLink={(p)=>onStartLink(id,p)} />
              </div>
            )}
          </div>
          <div className="section">
            <h4 className="section-header" onClick={() => toggleSection('cookies')}>
              <span className={`section-toggle ${expandedSections.cookies ? 'expanded' : ''}`}>▶</span>
              Cookies
            </h4>
            {expandedSections.cookies && (
              <div className="section-content">
                <KVEditor label="Cookies" objPath="cookies" obj={cookies} onChangePath={(p,v)=>setField(p,v)} onLink={(p)=>onStartLink(id,p)} />
              </div>
            )}
          </div>
          <div className="section">
            <h4 className="section-header" onClick={() => toggleSection('queryParams')}>
              <span className={`section-toggle ${expandedSections.queryParams ? 'expanded' : ''}`}>▶</span>
              Query Params
            </h4>
            {expandedSections.queryParams && (
              <div className="section-content">
                <KVEditor label="Query Params" objPath="queryParams" obj={queryParams} onChangePath={(p,v)=>setField(p,v)} onLink={(p)=>onStartLink(id,p)} />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="section">
            <h4 className="section-header" onClick={() => toggleSection('body')}>
              <span className={`section-toggle ${expandedSections.body ? 'expanded' : ''}`}>▶</span>
              Body (JSON)
            </h4>
            {expandedSections.body && (
              <div className="section-content">
                <textarea
                  className="code"
                  value={bodyText}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  onBlur={handleBodyBlur}
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
            )}
          </div>

          {/* Expected → UI'da response olarak gösteriyoruz */}
          <div className="section">
            <h4 className="section-header" onClick={() => toggleSection('response')}>
              <span className={`section-toggle ${expandedSections.response ? 'expanded' : ''}`}>▶</span>
              Response (Expected JSON)
            </h4>
            {expandedSections.response && (
              <div className="section-content">
                <textarea
                  className="code"
                  value={responseText}
                  onChange={(e) => handleResponseChange(e.target.value)}
                  onBlur={handleResponseBlur}
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
            )}
          </div>

          {/* Assertions */}
          <div className="section">
            <h4 className="section-header" onClick={() => toggleSection('assertions')}>
              <span className={`section-toggle ${expandedSections.assertions ? 'expanded' : ''}`}>▶</span>
              Assertions
            </h4>
            {expandedSections.assertions && (
              <div className="section-content">
                <AssertionsList label="HTTP"   list={assertions.http}      onChange={(l)=>setField("assertions.http", l)} onLink={(p)=>onStartLink(id,p)} />
                <AssertionsList label="Kafka"  list={assertions.kafka}     onChange={(l)=>setField("assertions.kafka", l)} onLink={(p)=>onStartLink(id,p)} kind="kafka" />
                <AssertionsList label="DB"     list={assertions.database}  onChange={(l)=>setField("assertions.database", l)} onLink={(p)=>onStartLink(id,p)} kind="db" />
                <AssertionsList label="Redis"  list={assertions.redis}     onChange={(l)=>setField("assertions.redis", l)} onLink={(p)=>onStartLink(id,p)} kind="redis" />
              </div>
            )}
          </div>

          {/* Last Run (salt-okunur özet) */}
          <div className="section">
            <h4 className="section-header" onClick={() => toggleSection('lastRun')}>
              <span className={`section-toggle ${expandedSections.lastRun ? 'expanded' : ''}`}>▶</span>
              Last Run
            </h4>
            {expandedSections.lastRun && (
              <div className="section-content">
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
            )}
          </div>
        </div>
      </div>
      <div 
        className={`resize-handle resize-handle--${position}`}
        onMouseDown={handleMouseDown}
      />
    </aside>
  );
}
