import { jsPDF } from 'jspdf';

export function generateInvoicePDF(booking) {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(22, 163, 74); // Emerald 600
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('SAHKAAR / SEVASETU', 15, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Cooperative Gig Services Platform • Ministry of Cooperation Initiative', 15, 25);

  // Invoice Details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITAL SERVICE INVOICE', 15, 45);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Booking ID: ${booking.id}`, 15, 53);
  doc.text(`Date: ${new Date(booking.createdAt || Date.now()).toLocaleDateString()}`, 15, 60);
  doc.text(`Payment Status: ${booking.paymentStatus || 'PAID (UPI)'}`, 150, 53);

  // Customer & Cooperative Box
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 68, 180, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', 20, 76);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${booking.customerName}`, 20, 83);
  doc.text(`Address: ${booking.address}`, 20, 90);

  doc.setFont('helvetica', 'bold');
  doc.text('WORKER & COOPERATIVE', 110, 76);
  doc.setFont('helvetica', 'normal');
  doc.text(`Worker: ${booking.workerName}`, 110, 83);
  doc.text(`Cooperative: ${booking.coopName}`, 110, 90);
  doc.text(`Service: ${booking.serviceName}`, 110, 97);

  // Financial Breakdown Table
  let y = 115;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, y + 7);
  doc.text('Amount (INR)', 160, y + 7);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.text(`Base Service Fee (${booking.serviceName})`, 20, y);
  doc.text(`₹${booking.pricing?.baseFee || 450}`, 160, y);

  y += 10;
  doc.text('Service Taxes (GST 5%)', 20, y);
  doc.text(`₹${booking.pricing?.serviceTax || 25}`, 160, y);

  y += 10;
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 195, y);

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT PAID', 20, y);
  doc.text(`₹${booking.pricing?.totalAmount || 475}`, 160, y);

  // Cooperative Welfare & Fair Distribution Transparency Note
  y += 20;
  doc.setFillColor(240, 253, 244); // Light emerald
  doc.rect(15, y, 180, 30, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.rect(15, y, 180, 30, 'D');

  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('COOPERATIVE TRANSPARENCY & WORKER WELFARE BREAKDOWN', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Direct Worker Earning (90%): ₹${booking.pricing?.workerPayout || 427.50}`, 20, y + 15);
  doc.text(`• Worker Welfare Fund Contribution (5%): ₹${booking.pricing?.welfareContribution || 23.75}`, 20, y + 21);
  doc.text(`• Cooperative Platform Operations (5%): ₹${booking.pricing?.coopPlatformFee || 23.75}`, 20, y + 27);

  // Rationale
  y += 38;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Matching Reason: ${booking.matchRationale || 'Assigned via Sahkaar Income Equalization Engine.'}`, 15, y);
  
  doc.text('Thank you for supporting cooperative worker welfare! Powered by Sahkaar Platform.', 15, y + 8);

  doc.save(`SevaSetu_Invoice_${booking.id}.pdf`);
}
