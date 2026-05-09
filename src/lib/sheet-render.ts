// Pixel-perfect rental sheet rendering helpers.
// We render the sheet as a real DOM node (mounted off-screen but in the page)
// so html2canvas can use the loaded Poppins / Inter fonts.

export async function renderHtmlToCanvas(html: string, widthPx = 794): Promise<HTMLCanvasElement> {
  // Wait for fonts to be loaded so canvas captures real Poppins/Inter glyphs
  if (document.fonts && "ready" in document.fonts) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${widthPx}px;background:#FFFFFF;`;
  host.innerHTML = html;
  document.body.appendChild(host);
  const node = host.firstElementChild as HTMLElement;

  // Wait one paint frame for layout
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // Wait for inline images inside the sheet
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map(
      (img) =>
        new Promise<void>((res) => {
          if ((img as HTMLImageElement).complete) return res();
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        })
    )
  );

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#FFFFFF",
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: widthPx,
    });
    return canvas;
  } finally {
    host.remove();
  }
}

export async function canvasToBlob(canvas: HTMLCanvasElement, mime = "image/png", quality = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas blob failed"))),
      mime,
      quality
    );
  });
}

export async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.height / canvas.width;
  const imgW = pageW;
  const imgH = imgW * ratio;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  if (imgH <= pageH) {
    pdf.addImage(dataUrl, "JPEG", 0, 0, imgW, imgH);
  } else {
    // Multi-page: slice canvas
    let remaining = canvas.height;
    const sliceHeightPx = Math.floor((canvas.width * pageH) / pageW);
    let y = 0;
    while (remaining > 0) {
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.min(sliceHeightPx, remaining);
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      const url = slice.toDataURL("image/jpeg", 0.95);
      const sliceH = (slice.height / canvas.width) * pageW;
      if (y > 0) pdf.addPage();
      pdf.addImage(url, "JPEG", 0, 0, pageW, sliceH);
      y += slice.height;
      remaining -= slice.height;
    }
  }
  return pdf.output("blob");
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & {
    canShare?: (d: { files?: File[] }) => boolean;
    share?: (d: { files?: File[]; title?: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share?.({ files: [file], title: filename });
      return;
    } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function makeQrDataUrl(text: string, size = 120): Promise<string> {
  const QR = await import("qrcode");
  return await QR.toDataURL(text, { width: size, margin: 1, color: { dark: "#062A4D", light: "#FFFFFF" } });
}
