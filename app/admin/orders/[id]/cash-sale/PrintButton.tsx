"use client";

export function PrintButton() {
  return (
    <button className="invoice-print-button" type="button" onClick={() => window.print()}>
      Print / Save PDF
    </button>
  );
}
