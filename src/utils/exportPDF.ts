import type { Project, Character, Scene } from '../types';

export type PdfFormat = 'cinema' | 'comic';

async function urlToBase64(url: string): Promise<{ data: string; format: 'PNG' | 'JPEG' }> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const format = header.includes('png') ? 'PNG' : 'JPEG';
      resolve({ data, format });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function darkPage(doc: any, w: number, h: number) {
  doc.setFillColor(7, 7, 26);
  doc.rect(0, 0, w, h, 'F');
}

function accent(doc: any) { doc.setTextColor(167, 139, 250); }
function muted(doc: any)  { doc.setTextColor(100, 116, 139); }
function light(doc: any)  { doc.setTextColor(226, 232, 240); }
function sub(doc: any)    { doc.setTextColor(148, 163, 184); }

export async function exportStoryboardPDF(
  project: Project,
  characters: Character[],
  scenes: Scene[],
  format: PdfFormat = 'cinema',
) {
  // Dynamic import to avoid loading jsPDF unless needed
  const { default: jsPDF } = await import('jspdf');

  const landscape = format === 'cinema';
  const doc = new jsPDF({ orientation: landscape ? 'l' : 'p', unit: 'mm', format: 'a4' });

  const W = landscape ? 297 : 210;
  const H = landscape ? 210 : 297;
  const M = 15;

  // ── Cover page ────────────────────────────────────────────────────────────
  darkPage(doc, W, H);

  accent(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text(project.name, W / 2, 42, { align: 'center' });

  sub(doc);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('AI Storyboard', W / 2, 53, { align: 'center' });

  // Divider
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.4);
  doc.line(M, 60, W - M, 60);

  // Characters roster
  if (characters.length > 0) {
    accent(doc);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CAST', M, 73);

    const maxChars = Math.min(characters.length, landscape ? 7 : 5);
    const thumbW = Math.min(32, (W - 2 * M - (maxChars - 1) * 6) / maxChars);
    const thumbH = thumbW * 1.2;
    let cx = M;

    for (const char of characters.slice(0, maxChars)) {
      if (char.reference_image_url) {
        try {
          const { data, format: fmt } = await urlToBase64(char.reference_image_url);
          doc.addImage(data, fmt, cx, 77, thumbW, thumbH);
        } catch {
          doc.setFillColor(15, 15, 42);
          doc.roundedRect(cx, 77, thumbW, thumbH, 2, 2, 'F');
        }
      } else {
        doc.setFillColor(30, 27, 75);
        doc.roundedRect(cx, 77, thumbW, thumbH, 2, 2, 'F');
      }

      muted(doc);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const label = char.name.length > 10 ? char.name.slice(0, 9) + '…' : char.name;
      doc.text(label, cx + thumbW / 2, 77 + thumbH + 5, { align: 'center' });

      cx += thumbW + 6;
    }
  }

  // Description
  if (project.description) {
    sub(doc);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(project.description, W - 2 * M);
    doc.text(lines, W / 2, characters.length > 0 ? 130 : 80, { align: 'center' });
  }

  // Stats footer
  const generated = scenes.filter(s => s.generated_image_url).length;
  muted(doc);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${scenes.length} scenes  ·  ${generated} generated  ·  ${characters.length} characters`, M, H - 12);
  doc.text('ConsistentAI', W - M, H - 12, { align: 'right' });

  // ── Scene pages ───────────────────────────────────────────────────────────
  const toRender = scenes.filter(s => s.generated_image_url);

  for (const scene of toRender) {
    doc.addPage();
    darkPage(doc, W, H);

    // Header bar
    accent(doc);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`SCENE ${scene.scene_number} / ${scenes.length}`, M, 11);
    muted(doc);
    doc.setFont('helvetica', 'normal');
    doc.text(project.name.toUpperCase(), W - M, 11, { align: 'right' });

    doc.setDrawColor(30, 27, 75);
    doc.setLineWidth(0.25);
    doc.line(M, 14, W - M, 14);

    if (landscape) {
      // Cinema: image 65% width on left, text on right
      const imgW = Math.round((W - 3 * M) * 0.65);
      const imgH = H - 34;
      const textX = M + imgW + M;
      const textW = W - textX - M;

      try {
        const { data, format: fmt } = await urlToBase64(scene.generated_image_url);
        doc.addImage(data, fmt, M, 18, imgW, imgH);
      } catch {
        doc.setFillColor(15, 15, 42);
        doc.rect(M, 18, imgW, imgH, 'F');
        muted(doc);
        doc.setFontSize(8);
        doc.text('Image unavailable', M + imgW / 2, 18 + imgH / 2, { align: 'center' });
      }

      accent(doc);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('DESCRIPTION', textX, 26);

      light(doc);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(scene.prompt, textW);
      doc.text(lines, textX, 34);
    } else {
      // Comic: image fills top 62%, text below
      const imgW = W - 2 * M;
      const imgH = Math.round((H - 45) * 0.62);

      try {
        const { data, format: fmt } = await urlToBase64(scene.generated_image_url);
        doc.addImage(data, fmt, M, 18, imgW, imgH);
      } catch {
        doc.setFillColor(15, 15, 42);
        doc.rect(M, 18, imgW, imgH, 'F');
        muted(doc);
        doc.setFontSize(8);
        doc.text('Image unavailable', W / 2, 18 + imgH / 2, { align: 'center' });
      }

      const ty = 18 + imgH + 8;
      accent(doc);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('DESCRIPTION', M, ty);

      light(doc);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(scene.prompt, W - 2 * M);
      doc.text(lines, M, ty + 7);
    }

    // Page footer
    muted(doc);
    doc.setFontSize(7);
    doc.text(`Scene ${scene.scene_number}`, M, H - 7);
    doc.text('ConsistentAI', W - M, H - 7, { align: 'right' });
  }

  const safeName = project.name.replace(/[^a-z0-9]/gi, '_');
  doc.save(`${safeName}_Storyboard.pdf`);
}
