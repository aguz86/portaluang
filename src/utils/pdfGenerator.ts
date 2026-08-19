import html2pdf from 'html2pdf.js';

export const generatePDF = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId) || document.body;
  
  // A bit of styling adjustment before printing
  const originalBackground = document.body.style.backgroundColor;
  // If you want a light theme print, you could toggle a class here, 
  // but html2pdf takes a screenshot, so we just let it take what's on screen.

  const opt = {
    margin:       0.4,
    filename:     filename,
    image:        { type: 'jpeg' as const, quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  } as any;

  html2pdf().set(opt).from(element).save();
};
