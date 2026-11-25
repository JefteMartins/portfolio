import fs from 'node:fs';
import path from 'node:path';

// Gera um PDF 1.4 válido (WinAnsi / Latin-1) a partir de src/data/portfolio.json
const portfolio = JSON.parse(
  fs.readFileSync(path.resolve('c:/Jefte/PortfolioTestes/src/data/portfolio.json'), 'utf8')
);

function pdfEscape(str) {
  // Converte caracteres fora de WinAnsi simples e escapa parênteses/barras
  const normalized = str
    .replace(/[—–]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code === 40 || code === 41 || code === 92) {
      out += '\\' + normalized[i];
    } else if (code >= 32 && code <= 126) {
      out += normalized[i];
    } else if (code >= 160 && code <= 255) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else {
      out += ' ';
    }
  }
  return out;
}

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const ops = [];
let y = 785;

function line(text, font = 'F1', size = 10, step = 14) {
  ops.push(`BT /${font} ${size} Tf 52 ${y} Td (${pdfEscape(text)}) Tj ET`);
  y -= step;
}

line('JEFTE MARTINS', 'F2', 18, 22);
line(portfolio.hero.subtitle, 'F2', 11, 16);
line(`${portfolio.hero.metadata.join(' | ')} | ${portfolio.contact.email}`, 'F1', 9, 14);
line('LinkedIn: linkedin.com/in/jeftemartins | GitHub: github.com/JefteMartins', 'F1', 9, 22);

line('RESUMO PROFISSIONAL', 'F2', 11, 15);
for (const l of wrapText(portfolio.about.summary, 88)) {
  line(l, 'F1', 9.5, 13);
}
y -= 8;

line('EXPERIENCIA PROFISSIONAL', 'F2', 11, 16);
for (const exp of portfolio.experiences) {
  line(`${exp.company} - ${exp.role} (${exp.period})`, 'F2', 10, 13);
  for (const l of wrapText(exp.description, 88)) {
    line(l, 'F1', 9.2, 12.5);
  }
  y -= 6;
}

y -= 4;
line('FORMACAO E CERTIFICACOES', 'F2', 11, 15);
for (const edu of portfolio.about.education) {
  line(`- ${edu.credential} - ${edu.institution}`, 'F1', 9.5, 13);
}

y -= 8;
line('STACK TECNICA', 'F2', 11, 15);
for (const cat of portfolio.stackSection.categories) {
  for (const l of wrapText(`${cat.name}: ${cat.items.join(', ')}`, 88)) {
    line(l, 'F1', 9.2, 12.5);
  }
}

y -= 10;
line('[Nota: PDF gerado automaticamente dos dados do portfolio - substituivel pelo arquivo final]', 'F1', 8, 12);

const streamContent = ops.join('\n');
const objects = [
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj',
  '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj',
  '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj',
  `6 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'latin1')} >>\nstream\n${streamContent}\nendstream\nendobj`
];

let pdf = '%PDF-1.4\n';
const offsets = [0];
for (const obj of objects) {
  offsets.push(Buffer.byteLength(pdf, 'latin1'));
  pdf += obj + '\n';
}
const xrefStart = Buffer.byteLength(pdf, 'latin1');
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

fs.writeFileSync(
  path.resolve('c:/Jefte/PortfolioTestes/public/curriculo.pdf'),
  Buffer.from(pdf, 'latin1')
);
console.log('Generated public/curriculo.pdf');
