import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") || "dark");
  const [accent, setAccent] = useState(() => document.documentElement.getAttribute("data-accent") || "blue");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  return (
    <div style={{ display:"flex", gap:8, alignItems:"center", marginLeft:"auto" }}>
      <button className="btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title="Toggle theme">
        {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
      </button>

      <div style={{ display:"flex", gap:6 }}>
        <button className="btn icon" onClick={() => setAccent("blue")}   title="Blue">🔵</button>
        <button className="btn icon" onClick={() => setAccent("purple")} title="Purple">🟣</button>
        <button className="btn icon" onClick={() => setAccent("green")}  title="Green">🟢</button>
      </div>
    </div>
  );
}
