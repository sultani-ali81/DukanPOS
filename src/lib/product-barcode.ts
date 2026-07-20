import JsBarcode from "jsbarcode";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function renderProductBarcode(
  svg: SVGSVGElement,
  productCode: string,
) {
  JsBarcode(svg, productCode, {
    format: "CODE128",
    width: 2,
    height: 56,
    displayValue: true,
    font: "monospace",
    fontSize: 16,
    margin: 10,
    textMargin: 5,
    background: "#ffffff",
    lineColor: "#000000",
  });
}

interface PrintProductLabelInput {
  productCode: string;
  productName: string;
}

export function printProductLabel({
  productCode,
  productName,
}: PrintProductLabelInput): boolean {
  const printWindow = window.open(
    "",
    "product-barcode-label",
    "popup,width=520,height=420",
  );
  if (!printWindow) return false;

  const { document } = printWindow;
  document.title = `${productCode} label`;

  const style = document.createElement("style");
  style.textContent = `
    @page {
      size: 50mm 25mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 50mm;
      height: 25mm;
      margin: 0;
      background: #fff;
      color: #000;
      font-family: Arial, sans-serif;
    }

    .label {
      display: flex;
      width: 50mm;
      height: 25mm;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 1.5mm 2.5mm;
    }

    .product-name {
      width: 100%;
      margin: 0 0 1mm;
      overflow: hidden;
      font-size: 8pt;
      font-weight: 700;
      line-height: 1.1;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    svg {
      display: block;
      width: 45mm;
      height: 18mm;
    }
  `;
  document.head.append(style);

  const label = document.createElement("main");
  label.className = "label";

  const name = document.createElement("p");
  name.className = "product-name";
  name.textContent = productName;
  label.append(name);

  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("aria-label", `Barcode ${productCode}`);
  renderProductBarcode(svg, productCode);
  label.append(svg);
  document.body.append(label);

  printWindow.onafterprint = () => printWindow.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 150);

  return true;
}
