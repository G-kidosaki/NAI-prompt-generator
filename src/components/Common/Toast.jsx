export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 999,
      padding: "12px 28px", borderRadius: 10, background: "var(--acc)", color: "#000",
      fontSize: 15, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,.5)",
      animation: "fi .2s ease-out",
    }}>{message}</div>
  );
}
