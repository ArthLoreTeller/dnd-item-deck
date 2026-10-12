// Synthetic acceptance sheet; no real player's data. Standard AcroForm names.
export function createCharacterPdf(fields = { CharacterName: 'Acceptance Hero', PlayerName: 'Test Player', ClassLevel: 'Wizard 3', STR: '10', DEX: '12', CON: '14', INT: '16', WIS: '13', CHA: '8', Size: 'Medium', AC: '15', HPMax: '20', HPCurrent: '18', Equipment: 'Rope\nTorch', GP: '25' }, { portrait = false } = {}) {
  const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\n/g, '\\n');
  const entries = Object.entries(fields);
  const refs = entries.map((_, index) => `${index + 6} 0 R`).join(' ');
  const stream = 'BT /F1 16 Tf 50 740 Td (Synthetic character import acceptance sheet) Tj ET' + (portrait ? '\nq 128 0 0 128 430 600 cm /Portrait Do Q' : '');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [' + refs + '] /DA (/F1 10 Tf 0 g) /DR << /Font << /F1 5 0 R >> >> >> >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> ${portrait ? `/XObject << /Portrait ${entries.length + 6} 0 R >>` : ''} >> /Contents 4 0 R /Annots [${refs}] >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ...entries.map(([key, value], index) => `<< /Type /Annot /Subtype /Widget /FT /Tx /T (${escape(key)}) /V (${escape(value)}) /Rect [50 ${690 - index * 30} 400 ${710 - index * 30}] /P 3 0 R /F 4 >>`),
  ];
  if (portrait) {
    const pixels = Array.from({length:64*64},(_,index)=>{const x=index%64,y=Math.floor(index/64);return (x-32)**2+(y-28)**2<400?'efb57e':'264d73';}).join('')+'>';
    objects.push(`<< /Type /XObject /Subtype /Image /Width 64 /Height 64 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${pixels.length} >>\nstream\n${pixels}\nendstream`);
  }
  let pdf = '%PDF-1.7\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
