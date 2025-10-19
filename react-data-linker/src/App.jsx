import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, Controls, Background, MiniMap,
  useNodesState, useEdgesState, addEdge, MarkerType
} from "@xyflow/react";
import { nodeTypes } from "./flow/nodeTypes";
import InspectorSidebar from "./components/InspectorSidebar";
import axios from "axios";

export default function App() {
  // Tema
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: "req-1",
      type: "custom",
      position: { x: 420, y: 80 },
      data: {
        name: "List Posts",
        order: 1,
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/posts",
        headers: {}, cookies: {}, queryParams: {},
        body: {}, expected: {}, delay: 0,
        assertions: { http: [], kafka: [], database: [], redis: [] },
        runtime: { status: null, response: null, error: null, running: false }
      },
    },
    {
      id: "req-2",
      type: "custom",
      position: { x: 900, y: 320 },
      data: {
        name: "Get Post by 5th index id",
        order: 2,
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/posts/{{req-1.response[5].id}}",
        headers: { "x-post-id": "{{req-1.response[5].id}}" },
        cookies: {}, queryParams: {},
        body: {}, expected: {}, delay: 200,
        assertions: { http: [], kafka: [], database: [], redis: [] },
        runtime: { status: null, response: null, error: null, running: false }
      },
    },
  ]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([
    { id: "e1", source: "req-1", target: "req-2", markerEnd: { type: MarkerType.ArrowClosed } },
  ]);

  const [selectedId, setSelectedId] = useState("req-1");
  const [selectedEdges, setSelectedEdges] = useState([]);
  const [linking, setLinking] = useState(null); // { nodeId, fieldPath }
  const [running, setRunning] = useState(false);
  const rf = useRef(null);

  const addNode = () => {
    const id = `req-${nodes.length + 1}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "custom",
        position: { x: 460 + Math.random() * 160, y: 120 + Math.random() * 160 },
        data: {
          name: `Request ${nodes.length + 1}`,
          order: nodes.length + 1,
          method: "GET",
          url: "",
          headers: {}, cookies: {}, queryParams: {},
          body: {}, expected: {}, delay: 0,
          assertions: { http: [], kafka: [], database: [], redis: [] },
          runtime: { status: null, response: null, error: null, running: false }
        },
      },
    ]);
  };

  const updateNodeField = useCallback((nodeId, fieldPath, value) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const clone = structuredClone(n);
        const parts = fieldPath.split(".");
        let cur = clone.data;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i];
          if (!cur[p]) cur[p] = {};
          cur = cur[p];
        }
        cur[parts.at(-1)] = value;
        return clone;
      })
    );
  }, [setNodes]);

  // SİLME
  const deleteNodeById = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const deleteSelectedEdges = useCallback(() => {
    if (!selectedEdges?.length) return;
    const ids = new Set(selectedEdges.map((e) => e.id));
    setEdges((eds) => eds.filter((e) => !ids.has(e.id)));
    setSelectedEdges([]);
  }, [selectedEdges]);

  const deleteSelected = () => {
    if (selectedEdges?.length) return deleteSelectedEdges();
    if (selectedId) return deleteNodeById(selectedId);
  };

  const nodesWithHandlers = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedId,
        data: { ...n.data },
      })),
    [nodes, selectedId]
  );

  const onConnect = useCallback(
    (p) => setEdges((eds) => addEdge({ ...p, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    []
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  // ----- RUN: placeholder çözme + axios sıralı çalıştırma -----

  const getByPath = (obj, path) => {
    try {
      const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
      return parts.reduce((acc, p) => (acc == null ? undefined : acc[p]), obj);
    } catch {
      return undefined;
    }
  };

  const resolvePlaceholders = (textOrObj, nodeMap) => {
    if (textOrObj == null) return textOrObj;

    if (typeof textOrObj === "string") {
      return textOrObj.replace(/{{(req-\d+)\.([^}]+)}}/g, (_, refId, pth) => {
        const refNode = nodeMap.get(refId);
        const source = refNode?.data?.runtime?.response ?? refNode?.data?.expected;
        const val = getByPath({ response: source, body: refNode?.data?.body, expected: refNode?.data?.expected }, pth);
        return val != null ? String(val) : "";
      });
    }

    if (Array.isArray(textOrObj)) return textOrObj.map((v) => resolvePlaceholders(v, nodeMap));

    if (typeof textOrObj === "object") {
      const out = Array.isArray(textOrObj) ? [] : {};
      for (const [k, v] of Object.entries(textOrObj)) out[k] = resolvePlaceholders(v, nodeMap);
      return out;
    }

    return textOrObj;
  };

  const buildUrlWithQuery = (baseUrl, query) => {
    if (!query || !Object.keys(query).length) return baseUrl;
    const usp = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v == null) return;
      usp.append(k, typeof v === "string" ? v : JSON.stringify(v));
    });
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}${usp.toString()}`;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const runAll = async () => {
    if (running) return;
    setRunning(true);

    try {
      // sıraya göre
      const ordered = nodes.slice().sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
      let shadow = ordered.map((n) => ({ ...n }));

      for (const n of shadow) {
        // running ON (renk sarı)
        setNodes((nds) =>
          nds.map((x) =>
            x.id === n.id
              ? { ...x, data: { ...x.data, runtime: { ...(x.data.runtime || {}), running: true, error: null } } }
              : x
          )
        );

        const nodeMap = new Map((shadow || []).map((x) => [x.id, x]));

        const delay = Number(n.data.delay || 0);
        if (delay > 0) await sleep(delay);

        const resolvedUrl = resolvePlaceholders(n.data.url, nodeMap);
        const resolvedHeaders = resolvePlaceholders(n.data.headers, nodeMap);
        const resolvedQuery = resolvePlaceholders(n.data.queryParams, nodeMap);
        const resolvedBody = resolvePlaceholders(n.data.body, nodeMap);
        const finalUrl = buildUrlWithQuery(resolvedUrl, resolvedQuery);

        try {
          const resp = await axios({
            method: (n.data.method || "GET").toLowerCase(),
            url: finalUrl,
            headers: resolvedHeaders,
            data: resolvedBody,
          });

          // success
          setNodes((nds) =>
            nds.map((x) =>
              x.id === n.id
                ? {
                    ...x,
                    data: {
                      ...x.data,
                      runtime: {
                        status: resp.status,
                        response: resp.data,
                        headers: resp.headers,
                        error: null,
                        running: false, // renk yeşil
                      },
                    },
                  }
                : x
            )
          );

          // shadow’u da güncelle ki sonraki istek placeholder çözerken runtime’ı görsün
          const idx = shadow.findIndex((s) => s.id === n.id);
          if (idx >= 0) {
            shadow[idx] = {
              ...shadow[idx],
              data: {
                ...shadow[idx].data,
                runtime: { status: resp.status, response: resp.data, headers: resp.headers, error: null, running: false },
              },
            };
          }
        } catch (err) {
          // fail
          const status = err?.response?.status ?? null;
          const respData = err?.response?.data ?? null;
          setNodes((nds) =>
            nds.map((x) =>
              x.id === n.id
                ? {
                    ...x,
                    data: {
                      ...x.data,
                      runtime: {
                        status,
                        response: respData,
                        headers: err?.response?.headers ?? null,
                        error: err?.message || "Request failed",
                        running: false, // renk kırmızı
                      },
                    },
                  }
                : x
            )
          );

          const idx = shadow.findIndex((s) => s.id === n.id);
          if (idx >= 0) {
            shadow[idx] = {
              ...shadow[idx],
              data: {
                ...shadow[idx].data,
                runtime: { status, response: respData, headers: err?.response?.headers ?? null, error: err?.message || "Request failed", running: false },
              },
            };
          }
          // zinciri durdurmak istemiyorsan devam et; durdurmak istersen break;
        }
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="shell">
      {/* ◀︎ Inspector Sidebar */}
      <InspectorSidebar
        selectedNode={useMemo(() => nodes.find((n)=>n.id===selectedId) || null, [nodes, selectedId])}
        linking={linking}
        onAddNode={addNode}
        onStartLink={(nodeId, fieldPath) => setLinking({ nodeId, fieldPath })}
        onPickPath={(_, sourcePath) => {
          const selectedNode = nodes.find((n)=>n.id===selectedId);
          if (!linking || !selectedNode) return;
          const expr = `{{${selectedNode.id}.${sourcePath}}}`;
          updateNodeField(linking.nodeId, linking.fieldPath, expr);
          setEdges((eds) => [
            ...eds,
            {
              id: `link-${Date.now()}`,
              source: selectedNode.id,
              target: linking.nodeId,
              type: "smoothstep",
              animated: true,
              style: { stroke: "var(--accent)", strokeWidth: 2, strokeDasharray: "5 5" },
              data: { from: sourcePath, to: linking.fieldPath },
            },
          ]);
          setLinking(null);
        }}
        onChangeField={updateNodeField}
        onDelete={deleteNodeById}
      />

      {/* ▶︎ Main (Toolbar + Canvas) */}
      <div className="main">
        <div className="app__toolbar">
          
          <button className="btn primary" onClick={addNode}>+ Add Request</button>

       

          <button
            className="btn danger"
            onClick={deleteSelected}
            disabled={!selectedId && !(selectedEdges?.length)}
            title="Delete selected node or edges"
            style={{ marginLeft: 8 }}
          >
            🗑 Delete Selected
          </button>
          <button
  className={`btn ${running ? "loading" : ""}`}
  onClick={runAll}
  disabled={running}
  title="Run scenario"
  style={{ marginLeft: 8 }}
>
  {running ? (<><span className="spinner" /> Running...</>) : "🚀 Run"}
</button>

          {/* sağa yasla + theme switch */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <label className="switch" title="Toggle dark mode">
              <span className="small">🌞</span>
              <input
                type="checkbox"
                checked={theme === "dark"}
                onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
              />
              <span className="small">🌙</span>
            </label>
          </div>
        </div>

        <div className="flow-wrap">
          <ReactFlow
            ref={rf}
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => setSelectedId(node?.id ?? null)}
            onSelectionChange={(sel) => {
              const first = sel?.nodes?.[0];
              setSelectedId(first?.id ?? null);
              setSelectedEdges(sel?.edges ?? []);
            }}
          >
            <MiniMap pannable zoomable />
            <Controls />
            <Background gap={20} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
