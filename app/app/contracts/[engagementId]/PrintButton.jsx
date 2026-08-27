"use client";

export default function PrintButton({ style, children }) {
  return (
    <button className="btn-ghost" style={style} onClick={() => window.print()}>
      {children}
    </button>
  );
}
