import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, Controls, Background, MiniMap,
  useNodesState, useEdgesState, addEdge, MarkerType
} from "@xyflow/react";
import { nodeTypes } from "./flow/nodeTypes";
import InspectorSidebar from "./components/InspectorSidebar";
import HarImportModal from "./components/HarImportModal";
import axios from "axios";

// Axios interceptor - API URL'lerini proxy'ye yönlendir
axios.interceptors.request.use((config) => {
  if (config.url?.startsWith('https://api.wiyostb.com.tr')) {
    config.url = config.url.replace('https://api.wiyostb.com.tr', '/api');
  }
  return config;
});

export default function App() {
  // Tema
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Sidebar pozisyon ve genişlik
  const [sidebarPosition, setSidebarPosition] = useState(() => {
    const saved = localStorage.getItem("sidebarPosition") || "left";
    // Eski top/bottom değerleri varsa left'e çevir
    return (saved === "top" || saved === "bottom") ? "left" : saved;
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebarWidth");
    return saved ? parseInt(saved, 10) : 450;
  });

  useEffect(() => {
    localStorage.setItem("sidebarPosition", sidebarPosition);
  }, [sidebarPosition]);

  useEffect(() => {
    localStorage.setItem("sidebarWidth", sidebarWidth.toString());
  }, [sidebarWidth]);

  // State'ler - localStorage'dan yükle
  const [nodes, setNodes, onNodesChange] = useNodesState(() => {
    const saved = localStorage.getItem("flow-nodes");
    return saved ? JSON.parse(saved) : [];
  });
  const [edges, setEdges, onEdgesChange] = useEdgesState(() => {
    const saved = localStorage.getItem("flow-edges");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedEdges, setSelectedEdges] = useState([]);
  const [linking, setLinking] = useState(null); // { nodeId, fieldPath }
  const [running, setRunning] = useState(false);
  const [showHarModal, setShowHarModal] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [savedScenarioId, setSavedScenarioId] = useState(null);
  const [executionId, setExecutionId] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  
  // Senaryo yükleme state'leri
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [showScenarioList, setShowScenarioList] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const rf = useRef(null);

  // Undo/Redo & Clipboard
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState(null);
  const initializedRef = useRef(false);

  // History'ye snapshot ekle
  const saveToHistory = useCallback(() => {
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      // Max 50 history tut
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [nodes, edges, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Copy - seçili tüm node'ları kopyala
  const copySelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length > 0) {
      setClipboard({ nodes: selectedNodes });
    }
  }, [nodes]);

  // Paste
  const pasteFromClipboard = useCallback(() => {
    if (!clipboard?.nodes) return;

    saveToHistory();
    const maxOrder = Math.max(0, ...nodes.map((node) => node.data.order || 0));
    const newNodes = clipboard.nodes.map((n, idx) => ({
      ...n,
      id: `${n.id}-copy-${Date.now()}-${idx}`,
      selected: false,
      position: {
        x: n.position.x + 50,
        y: n.position.y + 50,
      },
      data: {
        ...n.data,
        order: maxOrder + idx + 1,
      },
    }));
    setNodes((nds) => [...nds, ...newNodes]);
  }, [clipboard, nodes, setNodes, saveToHistory]);

  // Select All - tüm node'ları seç
  const selectAll = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: true,
      }))
    );
  }, [setNodes]);

  const addNode = () => {
    saveToHistory();
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

  // HAR entries'lerini node formatına çevir
  const importHarEntries = useCallback((harEntries) => {
    saveToHistory();
    const currentMaxOrder = Math.max(0, ...nodes.map(n => n.data.order || 0));
    const startX = 100;
    const startY = 100;
    const spacingY = 180;

    const newNodes = harEntries.map((entry, idx) => {
      const req = entry.request || {};
      const res = entry.response || {};
      
      // Headers'ı objeye çevir
      const headers = {};
      (req.headers || []).forEach(h => {
        if (h.name && !h.name.startsWith(':')) { // HTTP/2 pseudo-headers'ları atla
          headers[h.name] = h.value;
        }
      });

      // Cookies'leri objeye çevir
      const cookies = {};
      (req.cookies || []).forEach(c => {
        if (c.name) cookies[c.name] = c.value;
      });

      // Query parameters'ı objeye çevir
      const queryParams = {};
      (req.queryString || []).forEach(q => {
        if (q.name) queryParams[q.name] = q.value;
      });

      // POST data varsa parse et
      let body = {};
      if (req.postData) {
        try {
          if (req.postData.mimeType?.includes('json')) {
            body = JSON.parse(req.postData.text || '{}');
          } else if (req.postData.params) {
            req.postData.params.forEach(p => {
              if (p.name) body[p.name] = p.value;
            });
          }
        } catch (e) {
          // JSON parse hatası, body'yi text olarak bırak
          if (req.postData.text) {
            body = { _raw: req.postData.text };
          }
        }
      }

      // Response data varsa parse et
      let expected = {};
      if (res.content?.text) {
        try {
          if (res.content.mimeType?.includes('json')) {
            expected = JSON.parse(res.content.text);
          }
        } catch (e) {
          // JSON değilse boş bırak
        }
      }

      // URL'den isim oluştur
      const urlObj = new URL(req.url);
      const pathname = urlObj.pathname;
      const urlName = pathname.split('/').filter(Boolean).pop() || urlObj.hostname;

      return {
        id: `req-har-${Date.now()}-${idx}`,
        type: "custom",
        position: {
          x: startX + (idx % 3) * 320,
          y: startY + Math.floor(idx / 3) * spacingY
        },
        data: {
          name: `${req.method} ${urlName}`,
          order: currentMaxOrder + idx + 1,
          method: req.method || "GET",
          url: req.url,
          headers,
          cookies,
          queryParams,
          body,
          expected,
          delay: 0,
          assertions: { http: [], kafka: [], database: [], redis: [] },
          runtime: { status: null, response: null, error: null, running: false }
        }
      };
    });

    // Node'ları ekle
    setNodes((nds) => [...nds, ...newNodes]);

    // Sıralı edge'ler oluştur (her node bir sonrakine bağlı)
    if (newNodes.length > 1) {
      const newEdges = [];
      for (let i = 0; i < newNodes.length - 1; i++) {
        newEdges.push({
          id: `edge-har-${Date.now()}-${i}`,
          source: newNodes[i].id,
          target: newNodes[i + 1].id,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
      setEdges((eds) => [...eds, ...newEdges]);
    }
  }, [nodes, setNodes, setEdges, saveToHistory]);

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
    saveToHistory();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, [saveToHistory, setNodes, setEdges, setSelectedId]);

  const deleteSelectedEdges = useCallback(() => {
    if (!selectedEdges?.length) return;
    saveToHistory();
    const ids = new Set(selectedEdges.map((e) => e.id));
    setEdges((eds) => eds.filter((e) => !ids.has(e.id)));
    setSelectedEdges([]);
  }, [selectedEdges, saveToHistory, setEdges]);

  const deleteSelected = useCallback(() => {
    // Önce edge'leri kontrol et
    const selectedEdgesList = edges.filter(e => e.selected);
    if (selectedEdgesList.length > 0) {
      saveToHistory();
      const ids = new Set(selectedEdgesList.map((e) => e.id));
      setEdges((eds) => eds.filter((e) => !ids.has(e.id)));
      return;
    }

    // Seçili node'ları bul (selected: true olanlar)
    const selectedNodesList = nodes.filter((n) => n.selected);
    if (selectedNodesList.length > 0) {
      saveToHistory();
      const nodeIds = new Set(selectedNodesList.map((n) => n.id));
      setNodes((nds) => nds.filter((n) => !nodeIds.has(n.id)));
      setEdges((eds) => eds.filter((e) => !nodeIds.has(e.source) && !nodeIds.has(e.target)));
      setSelectedId(null);
    }
  }, [nodes, edges, saveToHistory, setNodes, setEdges, setSelectedId]);

  const nodesWithHandlers = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        // Node'un kendi selected değerini kullan (multi-selection için)
        selected: n.selected || n.id === selectedId,
        data: { ...n.data },
      })),
    [nodes, selectedId]
  );

  // Node click - tek tıklamada diğer seçimleri temizle
  const handleNodeClick = useCallback((event, node) => {
    // Shift/Ctrl basılı değilse, diğer seçimleri temizle
    if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
      setNodes((nds) => nds.map((n) => ({ 
        ...n, 
        selected: n.id === node.id 
      })));
    }
    setSelectedId(node?.id ?? null);
  }, [setNodes]);

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
      return textOrObj.replace(/{{(req-[^\s.}]+)\.([^}]+)}}/g, (_, refId, pth) => {
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

  // İlk yüklemede history snapshot'ı al
  useEffect(() => {
    if (!initializedRef.current && nodes.length > 0) {
      initializedRef.current = true;
      saveToHistory();
    }
  }, [nodes.length, saveToHistory]);

  // Otomatik kaydetme - nodes ve edges değiştiğinde
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      localStorage.setItem("flow-nodes", JSON.stringify(nodes));
      localStorage.setItem("flow-edges", JSON.stringify(edges));
    }
  }, [nodes, edges]);

  // WebSocket bağlantısı
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnection(ws);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      
      switch(data.type) {
        case 'execution_update':
          setExecutionStatus(data);
          if (data.event === 'execution_completed' || data.event === 'execution_failed') {
            setRunning(false);
          }
          break;
        case 'node_update':
          console.log('Node update:', data);
          
          // Node'un görsel durumunu güncelle
          if (data.nodeId && data.event) {
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === data.nodeId) {
                  let nodeStatus = 'pending';
                  let nodeColor = '#e1e5e9'; // default color
                  
                  switch (data.event) {
                    case 'node_started':
                      nodeStatus = 'running';
                      break;
                    case 'node_completed':
                      nodeStatus = 'completed';
                      break;
                    case 'node_failed':
                      nodeStatus = 'failed';
                      break;
                    case 'node_skipped':
                      nodeStatus = 'skipped';
                      break;
                  }
                  
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      runtime: {
                        ...node.data.runtime,
                        status: nodeStatus,
                        running: data.event === 'node_started'
                      }
                    }
                    // Style'ları kaldırdık - CSS class'ları kullanacağız
                  };
                }
                return node;
              })
            );
          }
          break;
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnection(null);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      ws.close();
    };
  }, []);

  // Export JSON
  const exportToJSON = () => {
    const data = {
      nodes,
      edges,
      version: "1.0.0",
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const importFromJSON = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.nodes && data.edges) {
          saveToHistory();
          setNodes(data.nodes);
          setEdges(data.edges);
          setSelectedId(null);
        } else {
          alert("Invalid JSON format");
        }
      } catch (error) {
        alert("Error reading file: " + error.message);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = "";
  };

  // Clear all
  const clearAll = () => {
    if (confirm("Are you sure you want to clear all nodes and edges? This cannot be undone.")) {
      saveToHistory();
      setNodes([]);
      setEdges([]);
      setSelectedId(null);
      localStorage.removeItem("flow-nodes");
      localStorage.removeItem("flow-edges");
    }
  };

  // Senaryo kaydetme
  const saveScenario = async () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    try {
      const scenarioData = {
        name: scenarioName,
        description: scenarioDescription,
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            label: node.data.name,
            method: node.data.method,
            url: node.data.url,
            headers: node.data.headers,
            body: node.data.body,
            assertions: node.data.assertions?.http || []
          }
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: edge.type
        }))
      };

      const response = await fetch('http://localhost:3001/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenarioData)
      });

      if (response.ok) {
        const result = await response.json();
        setSavedScenarioId(result._id);
        alert('Scenario saved successfully!');
      } else {
        const error = await response.json();
        alert('Error saving scenario: ' + error.error);
      }
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('Error saving scenario: ' + error.message);
    }
  };

  // Senaryo çalıştırma
  const executeScenario = async () => {
    if (!savedScenarioId) {
      alert('Please save the scenario first');
      return;
    }

    try {
      setRunning(true);
      setExecutionStatus(null);

      const response = await fetch(`http://localhost:3001/api/execution/start/${savedScenarioId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: {},
          settings: {}
        })
      });

      if (response.ok) {
        const result = await response.json();
        setExecutionId(result.executionId);
        
        // WebSocket'e execution'a subscribe ol
        if (wsConnection) {
          wsConnection.send(JSON.stringify({
            type: 'subscribe_execution',
            payload: { executionId: result.executionId }
          }));
        }
      } else {
        const error = await response.json();
        alert('Error starting execution: ' + error.error);
        setRunning(false);
      }
    } catch (error) {
      console.error('Error starting execution:', error);
      alert('Error starting execution: ' + error.message);
      setRunning(false);
    }
  };

  // Senaryo yükleme fonksiyonları
  const loadScenarios = async () => {
    try {
      setLoadingScenarios(true);
      const response = await fetch('http://localhost:3001/api/scenarios');
      if (!response.ok) throw new Error('Failed to load scenarios');
      
      const data = await response.json();
      setSavedScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Error loading scenarios:', error);
      alert('Failed to load scenarios: ' + error.message);
    } finally {
      setLoadingScenarios(false);
    }
  };

  const loadScenario = async (scenarioId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/scenarios/${scenarioId}`);
      if (!response.ok) throw new Error('Failed to load scenario');
      
      const scenario = await response.json();
      
      // Scenario data'sını flow'a yükle
      if (scenario.nodes && scenario.edges) {
        setNodes(scenario.nodes);
        setEdges(scenario.edges);
        setScenarioName(scenario.name);
        setScenarioDescription(scenario.description);
        setSavedScenarioId(scenarioId);
        
        // UI'yi güncelle
        setShowScenarioList(false);
        
        console.log('Scenario loaded:', scenario.name);
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
      alert('Failed to load scenario: ' + error.message);
    }
  };

  const deleteScenario = async (scenarioId) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/scenarios/${scenarioId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete scenario');
      
      // Listeyi yenile
      await loadScenarios();
      console.log('Scenario deleted');
    } catch (error) {
      console.error('Error deleting scenario:', error);
      alert('Failed to delete scenario: ' + error.message);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Input/textarea içindeyse shortcut'ları devre dışı bırak
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+Z (Undo)
      if (ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z veya Ctrl+Y (Redo)
      else if ((ctrlKey && e.shiftKey && e.key === 'z') || (ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      // Ctrl+C (Copy)
      else if (ctrlKey && e.key === 'c') {
        e.preventDefault();
        copySelected();
      }
      // Ctrl+V (Paste)
      else if (ctrlKey && e.key === 'v') {
        e.preventDefault();
        pasteFromClipboard();
      }
      // Ctrl+A (Select All)
      else if (ctrlKey && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }
      // Delete (Seçili node'ları sil)
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        const hasSelection = nodes.some(n => n.selected) || edges.some(e => e.selected);
        if (hasSelection) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copySelected, pasteFromClipboard, selectAll, selectedId, selectedEdges, deleteSelected, nodes, edges]);

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
    <div className={`shell shell--${sidebarPosition}`}>
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
        position={sidebarPosition}
        onPositionChange={setSidebarPosition}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
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
            className="btn"
            onClick={() => setShowHarModal(true)}
            title="Import HAR file"
            style={{ marginLeft: 8 }}
          >
            📁 Import HAR
          </button>

          {/* Senaryo kaydetme */}
          <div style={{ marginLeft: 8, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Scenario name"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "12px" }}
            />
            <button
              className="btn"
              onClick={saveScenario}
              disabled={!scenarioName.trim()}
              title="Save scenario to backend"
            >
              💾 Save Scenario
            </button>
          </div>

          {/* Senaryo yükleme */}
          <button
            className="btn"
            onClick={() => {
              setShowScenarioList(true);
              loadScenarios();
            }}
            style={{ marginLeft: 8 }}
          >
            📂 Load Scenario
          </button>

          {/* Senaryo çalıştırma */}
          <button
            className={`btn ${running ? "loading" : ""}`}
            onClick={executeScenario}
            disabled={running || !savedScenarioId}
            title="Execute scenario via backend"
            style={{ marginLeft: 8 }}
          >
            {running ? (<><span className="spinner" /> Executing...</>) : "🚀 Execute Scenario"}
          </button>

          {/* Local run (eski) */}
          <button
            className={`btn ${running ? "loading" : ""}`}
            onClick={runAll}
            disabled={running}
            title="Run scenario locally"
            style={{ marginLeft: 8 }}
          >
            {running ? (<><span className="spinner" /> Running...</>) : "🏃 Run Local"}
          </button>

          {/* Save/Load buttons */}
          <div style={{ marginLeft: 8, display: "flex", gap: 8 }}>
            <button
              className="btn"
              onClick={exportToJSON}
              title="Export to JSON file"
            >
              💾 Export
            </button>
            
            <label className="btn" style={{ cursor: "pointer", margin: 0 }} title="Import from JSON file">
              📂 Import
              <input
                type="file"
                accept="application/json"
                onChange={importFromJSON}
                style={{ display: "none" }}
              />
            </label>

            <button
              className="btn danger"
              onClick={clearAll}
              title="Clear all nodes and edges"
            >
              🗑 Clear All
            </button>
          </div>

          {/* Execution Status */}
          {executionStatus && (
            <div style={{ marginLeft: 8, padding: "4px 8px", backgroundColor: "#f0f0f0", borderRadius: "4px", fontSize: "12px" }}>
              <strong>Execution:</strong> {executionStatus.event} 
              {executionStatus.data?.summary && (
                <span style={{ marginLeft: 8 }}>
                  ({executionStatus.data.summary.completedNodes}/{executionStatus.data.summary.totalNodes} nodes)
                </span>
              )}
            </div>
          )}

          {/* WebSocket Status */}
          <div style={{ marginLeft: 8, fontSize: "12px", color: wsConnection ? "#4CAF50" : "#f44336" }}>
            {wsConnection ? "🟢 Connected" : "🔴 Disconnected"}
          </div>

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
            onNodeClick={handleNodeClick}
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

      {/* HAR Import Modal */}
      {showHarModal && (
        <HarImportModal
          onClose={() => setShowHarModal(false)}
          onImport={importHarEntries}
        />
      )}

      {/* Senaryo Listesi Modal */}
      {showScenarioList && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>📂 Load Scenario</h3>
              <button 
                className="btn-close" 
                onClick={() => setShowScenarioList(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {loadingScenarios ? (
                <div className="loading-state">
                  <span className="spinner" /> Loading scenarios...
                </div>
              ) : savedScenarios.length === 0 ? (
                <div className="empty-state">
                  <p>No saved scenarios found.</p>
                  <p>Create and save a scenario first.</p>
                </div>
              ) : (
                <div className="scenario-list">
                  {savedScenarios.map((scenario) => (
                    <div key={scenario._id} className="scenario-item">
                      <div className="scenario-info">
                        <h4>{scenario.name}</h4>
                        <p>{scenario.description || 'No description'}</p>
                        <div className="scenario-meta">
                          <span>Nodes: {scenario.nodes?.length || 0}</span>
                          <span>Status: {scenario.status}</span>
                          <span>Created: {new Date(scenario.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="scenario-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => loadScenario(scenario._id)}
                        >
                          Load
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => deleteScenario(scenario._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
