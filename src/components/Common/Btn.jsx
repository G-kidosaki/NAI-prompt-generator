export default function Btn({ children, on, bg, color, border, small, disabled, style, ...rest }) {
  return (
    <button disabled={disabled} onClick={on} style={{
      padding: small ? "6px 12px" : "10px 18px", borderRadius: small ? 6 : 8,
      fontSize: small ? 12 : 14, fontWeight: 600, whiteSpace: "nowrap",
      background: bg || "var(--bg2)", color: color || "var(--dim)",
      border: border || "1px solid var(--bdr)", opacity: disabled ? 0.4 : 1,
      cursor: disabled ? "not-allowed" : "pointer", transition: "all .15s",
      WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
      ...style,
    }} {...rest}>{children}</button>
  );
}
