import { useState, useMemo } from "react";

export default function HarImportModal({ onClose, onImport }) {
  const [harData, setHarData] = useState(null);
  const [likeFilter, setLikeFilter] = useState("");
  const [unlikeFilter, setUnlikeFilter] = useState("");
  const [selectedUrls, setSelectedUrls] = useState(new Set());

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setHarData(json);
        // Başlangıçta tüm URL'leri seç
        if (json?.log?.entries) {
          const urls = new Set(json.log.entries.map((_, idx) => idx));
          setSelectedUrls(urls);
        }
      } catch (err) {
        alert("HAR dosyası parse edilemedi: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const entries = useMemo(() => {
    if (!harData?.log?.entries) return [];
    return harData.log.entries.map((entry, idx) => ({
      index: idx,
      url: entry.request?.url || "",
      method: entry.request?.method || "GET",
      status: entry.response?.status || 0,
      entry,
    }));
  }, [harData]);

  const filteredEntries = useMemo(() => {
    const likePatterns = likeFilter
      .split(',')
      .map(p => p.trim().toLowerCase())
      .filter(Boolean);
    
    const unlikePatterns = unlikeFilter
      .split(',')
      .map(p => p.trim().toLowerCase())
      .filter(Boolean);

    return entries.filter((e) => {
      const url = e.url.toLowerCase();
      
      // Like: En az bir pattern'i içermeli (boşsa tümü geçer)
      const passesLike = likePatterns.length === 0 || 
        likePatterns.some(pattern => url.includes(pattern));
      
      // Unlike: Hiçbir pattern'i içermemeli (boşsa tümü geçer)
      const passesUnlike = unlikePatterns.length === 0 || 
        !unlikePatterns.some(pattern => url.includes(pattern));
      
      return passesLike && passesUnlike;
    });
  }, [entries, likeFilter, unlikeFilter]);

  const toggleUrl = (idx) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAll = () => {
    const filtered = new Set(filteredEntries.map((e) => e.index));
    const allSelected = filteredEntries.every((e) => selectedUrls.has(e.index));
    
    if (allSelected) {
      // Tümünü kaldır
      setSelectedUrls((prev) => {
        const next = new Set(prev);
        filtered.forEach((idx) => next.delete(idx));
        return next;
      });
    } else {
      // Tümünü ekle
      setSelectedUrls((prev) => new Set([...prev, ...filtered]));
    }
  };

  const handleImport = () => {
    if (!harData?.log?.entries) return;

    // Sadece filtrelenmiş VE seçili olan entry'leri al
    const selectedEntries = filteredEntries
      .filter((e) => selectedUrls.has(e.index))
      .map((e) => e.entry);

    onImport(selectedEntries);
    onClose();
  };

  const selectedCount = filteredEntries.filter((e) => selectedUrls.has(e.index)).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import HAR File</h2>
          <button className="btn icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!harData ? (
            <div className="upload-area">
              <input
                type="file"
                accept=".har,application/json"
                onChange={handleFileUpload}
                id="har-upload"
                style={{ display: "none" }}
              />
              <label htmlFor="har-upload" className="upload-label">
                <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  Choose HAR File
                </div>
                <div className="small" style={{ color: "var(--text-secondary)" }}>
                  Click to browse or drag and drop
                </div>
              </label>
            </div>
          ) : (
            <>
              <div className="filter-section">
                <div style={{ marginBottom: 12 }}>
                  <div className="small" style={{ marginBottom: 6, fontWeight: 600 }}>
                    Like (includes any, comma-separated)
                  </div>
                  <input
                    type="text"
                    placeholder="e.g., api.wiyostb.com.tr, /customer"
                    value={likeFilter}
                    onChange={(e) => setLikeFilter(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="small" style={{ marginBottom: 6, fontWeight: 600 }}>
                    Unlike (excludes any, comma-separated)
                  </div>
                  <input
                    type="text"
                    placeholder="e.g., web-event-service, basarili.json"
                    value={unlikeFilter}
                    onChange={(e) => setUnlikeFilter(e.target.value)}
                  />
                </div>

                {/* Active filters display */}
                {(likeFilter.trim() || unlikeFilter.trim()) && (
                  <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {likeFilter.split(',').filter(p => p.trim()).map((pattern, idx) => (
                      <span key={`like-${idx}`} className="filter-tag like-tag">
                        ✓ {pattern.trim()}
                      </span>
                    ))}
                    {unlikeFilter.split(',').filter(p => p.trim()).map((pattern, idx) => (
                      <span key={`unlike-${idx}`} className="filter-tag unlike-tag">
                        ✗ {pattern.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div className="small">
                    Showing {filteredEntries.length} of {entries.length} entries
                    {" • "}
                    <b>{selectedCount} selected</b>
                  </div>
                  <button className="btn" onClick={toggleAll}>
                    {selectedCount === filteredEntries.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>

              <div className="entries-list">
                {filteredEntries.map((e) => (
                  <div
                    key={e.index}
                    className={`entry-item ${selectedUrls.has(e.index) ? "selected" : ""}`}
                    onClick={() => toggleUrl(e.index)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(e.index)}
                      onChange={() => toggleUrl(e.index)}
                      onClick={(ev) => ev.stopPropagation()}
                    />
                    <div className="entry-info">
                      <div className="entry-header">
                        <span className="pill">{e.method}</span>
                        <span className="pill" style={{
                          background: e.status >= 200 && e.status < 300 ? "#22c55e" :
                                     e.status >= 400 ? "#ef4444" : "#6b7280",
                          color: "#fff"
                        }}>
                          {e.status}
                        </span>
                      </div>
                      <div className="entry-url" title={e.url}>
                        {e.url.length > 80 ? e.url.slice(0, 80) + "..." : e.url}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredEntries.length === 0 && (
                  <div className="small" style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>
                    No entries match the filter
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {harData && (
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button
              className="btn primary"
              onClick={handleImport}
              disabled={selectedCount === 0}
            >
              Import {selectedCount} Request{selectedCount !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

