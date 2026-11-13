import { apiAssetUrl } from "../lib/api";

function safeName(value) {
  return (value || "friend")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function decodeMemberId(member) {
  if (!member) return "FZ-0000";
  if (member.membershipId) return String(member.membershipId);
  if (member.memberId) return String(member.memberId);
  if (member._id) return `FZ-${String(member._id).slice(-6).toUpperCase()}`;
  return "FZ-0000";
}

function formatJoinedAt(value) {
  if (!value) return "Member";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Member";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function loadImageDataUrl(imageUrl) {
  if (!imageUrl) return Promise.resolve("");

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = imageUrl;
  });
}

async function loadExternalImage(imageUrl) {
  if (!imageUrl) return "";
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Image load failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export async function downloadMembershipCard(member) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const center = pageWidth / 2;

  const logoDataUrl = await loadExternalImage("/friendszone-logo.png");
  const qrDataUrl = await loadExternalImage(
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      `https://friendszone.app/members/${member?._id || ""}`
    )}`
  );
  const photoUrl = member?.imageUrl ? apiAssetUrl(member.imageUrl) : "";
  const photoDataUrl = photoUrl ? await loadImageDataUrl(photoUrl) : "";

  pdf.setFillColor(248, 245, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setDrawColor(146, 113, 255);
  pdf.setLineWidth(1.1);
  pdf.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 7, 7, "S");

  pdf.setFillColor(241, 233, 255);
  pdf.roundedRect(13, 12, pageWidth - 26, pageHeight - 24, 6, 6, "F");

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", 24, 16, 48, 18);
  }

  pdf.setTextColor(87, 75, 120);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("MEMBERSHIP CARD", center, 39, { align: "center" });

  pdf.setDrawColor(189, 171, 255);
  pdf.setLineWidth(0.6);
  pdf.line(22, 43, pageWidth - 22, 43);

  if (photoDataUrl) {
    pdf.roundedRect(22, 49, 42, 52, 6, 6, "S");
    pdf.addImage(photoDataUrl, "PNG", 24, 51, 38, 48, undefined, "FAST");
  } else {
    pdf.setFillColor(216, 196, 255);
    pdf.roundedRect(22, 49, 42, 52, 6, 6, "F");
    pdf.setTextColor(109, 40, 217);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    const initials = (member?.name || "FZ")
      .split(" ")
      .slice(0, 2)
      .map((piece) => piece[0] || "")
      .join("")
      .toUpperCase();
    pdf.text(initials || "FZ", 43, 81, { align: "center" });
  }

  pdf.setTextColor(41, 30, 63);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  const nameLines = pdf.splitTextToSize(member?.name || "FriendsZone Member", 90);
  pdf.text(nameLines, 74, 62, { maxWidth: 90 });

  pdf.setTextColor(124, 58, 237);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  const role = (member?.role || "FriendsZone Member").toUpperCase();
  pdf.text(role, 74, 74);

  pdf.setTextColor(75, 82, 103);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Member since ${formatJoinedAt(member?.joinedAt)}`, 74, 82);

  pdf.setTextColor(109, 40, 217);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("MEMBERSHIP ID", 22, 111);

  const membershipId = decodeMemberId(member);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(22, 116, 86, 15, 4, 4, "F");
  pdf.setTextColor(51, 41, 79);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(membershipId, 27, 126);

  pdf.setTextColor(87, 75, 120);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const cityText = member?.city ? `Location: ${member.city}` : "Community member";
  pdf.text(cityText, 22, 142);

  pdf.setTextColor(109, 40, 217);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("VERIFY WITH QR", pageWidth - 22, 112, { align: "right" });
  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, "PNG", pageWidth - 72, 118, 50, 50);
  }

  pdf.setTextColor(38, 32, 53);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("FRIENDSZONE", center, 175, { align: "center" });

  pdf.setTextColor(112, 96, 137);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("Together we create unforgettable memories.", center, 182, { align: "center" });

  const fileName = `${safeName(member?.name || "friend")}-membership-card.pdf`;
  pdf.save(fileName);
}
