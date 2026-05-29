"use client";

export function PrintButton() {
  function printInvoice() {
    document.body.classList.add("is-printing-invoice");
    requestAnimationFrame(() => window.print());
  }

  return (
    <button className="invoice-print-button" type="button" onClick={printInvoice}>
      Print / Save PDF
    </button>
  );
}
