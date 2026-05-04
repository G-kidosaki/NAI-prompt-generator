export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      :root{--bg0:#0b0e14;--bg1:#111620;--bg2:#1a2030;--bdr:#2a3548;--txt:#e2e8f0;--dim:#7a8a9e;
        --pos:#34d399;--posBg:#064e3b;--posBdr:#047857;--neg:#fb7185;--negBg:#4c0519;--negBdr:#be123c;
        --acc:#38bdf8;--accDim:#0c4a6e;--gold:#fbbf24;--goldBg:#451a03;--goldBdr:#b45309;
        --safe-b:env(safe-area-inset-bottom,0px);--safe-t:env(safe-area-inset-top,0px)}
      *{box-sizing:border-box;margin:0;padding:0}
      html{height:100%;overflow:hidden}
      body{background:var(--bg0);color:var(--txt);font-family:'M PLUS 1','Hiragino Sans','Meiryo',sans-serif;
        height:100%;overflow:hidden;overscroll-behavior:none;-webkit-text-size-adjust:100%}
      #root{height:100%;overflow:hidden;display:flex;flex-direction:column}
      .mono{font-family:'JetBrains Mono','Menlo',monospace}
      input,textarea,select{background:var(--bg0);border:1px solid var(--bdr);color:var(--txt);border-radius:8px;
        padding:10px 14px;font-family:inherit;font-size:16px;outline:none;transition:border-color .2s;width:100%;
        -webkit-appearance:none;appearance:none}
      input:focus,textarea:focus{border-color:var(--acc)}
      select{cursor:pointer;padding-right:30px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237a8a9e' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
      button{font-family:inherit;cursor:pointer;border:none;transition:all .15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
      ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:var(--bdr);border-radius:2px}
      @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}} .fi{animation:fi .22s ease-out}
      @keyframes pop{0%{transform:scale(.94);opacity:.6}100%{transform:scale(1);opacity:1}} .pop{animation:pop .15s ease-out}
      @media(min-width:1024px){.main-content{display:grid;grid-template-columns:200px 1fr;gap:0}}
    `}</style>
  );
}
