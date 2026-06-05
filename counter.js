// QR Code generator
export const QRCode = (() => {
  // Minimal QR code generator using Google Charts API fallback
  function generate(text, size) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }
  function render(container, text, size = 200) {
    const url = generate(text, size);
    container.innerHTML = `<img src="${url}" alt="QR Code" width="${size}" height="${size}" style="border-radius:8px;">`;
  }
  return { generate, render };
})();
