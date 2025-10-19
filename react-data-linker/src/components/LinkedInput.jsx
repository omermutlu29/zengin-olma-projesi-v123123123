export default function LinkedInput({ value, onChange, onLink }) {
  return (
    <div className="linked-input">
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="value or {{req-1.response.body[0].id}}"
      />
      <button onClick={onLink} title="Link from another request">🔗</button>
    </div>
  );
}
