import ReactJson from "react18-json-view";
export default function ResponseTree({ nodeId, response, onSelectPath, title }) {
  return (
    <div className="section">
      <h3>{title ?? "Response"}</h3>
      <div className="body">
        <div className="small">Click a field to link it</div>
        <ReactJson
          src={response}
          name={false}
          collapsed={1}
          enableClipboard={false}
          onSelect={(e) => {
            // response.body[0].id -> destekli path formatı
            const path = e.namespace
              .join(".")
              .replace(/\.(\d+)\./g, "[$1].");
            onSelectPath(nodeId, path);
          }}
        />
      </div>
    </div>
  );
}
