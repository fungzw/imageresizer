(function () {
  "use strict";

  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const lockCheck = document.getElementById("lockRatio");
  const formatSelect = document.getElementById("formatSelect");
  const qualityRow = document.getElementById("qualityRow");
  const qualitySlider = document.getElementById("qualitySlider");
  const qualityValue = document.getElementById("qualityValue");
  const previewCanvas = document.getElementById("previewCanvas");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  const previewMeta = document.getElementById("previewMeta");
  const fileInfo = document.getElementById("fileInfo");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");

  if (!fileInput || !previewCanvas) return;

  let originalImage = null;
  let originalWidth = 0;
  let originalHeight = 0;
  let originalFileName = "image";
  let aspectRatio = 1;
  let currentBlob = null;

  // ---- File handling ----
  function handleFile(file) {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/i.test(file.type)) {
      alert("Please select a JPG, PNG, WebP, or GIF image.");
      return;
    }
    originalFileName = file.name.replace(/\.[^.]+$/, "") || "image";
    fileInfo.textContent = file.name + " — " + (file.size / 1024).toFixed(1) + " KB";
    fileInfo.classList.add("show");

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        originalImage = img;
        originalWidth = img.naturalWidth;
        originalHeight = img.naturalHeight;
        aspectRatio = originalWidth / originalHeight;
        widthInput.value = originalWidth;
        heightInput.value = originalHeight;
        // Auto-set format to match source
        if (/jpe?g/i.test(file.type)) formatSelect.value = "image/jpeg";
        else if (/png/i.test(file.type)) formatSelect.value = "image/png";
        else if (/webp/i.test(file.type)) formatSelect.value = "image/webp";
        else if (/gif/i.test(file.type)) formatSelect.value = "image/png";
        toggleQualityRow();
        renderPreview();
        downloadBtn.disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- Drop zone events ----
  dropZone.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () { handleFile(this.files[0]); });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault(); dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", function () { dropZone.classList.remove("dragover"); });
  dropZone.addEventListener("drop", function (e) {
    e.preventDefault(); dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  // ---- Dimension controls ----
  function clampInt(val, min, max) {
    let n = parseInt(val, 10);
    if (isNaN(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  widthInput.addEventListener("input", function () {
    if (!originalImage) return;
    const w = clampInt(this.value, 1, 10000);
    if (lockCheck.checked) heightInput.value = Math.round(w / aspectRatio);
    renderPreview();
  });

  heightInput.addEventListener("input", function () {
    if (!originalImage) return;
    const h = clampInt(this.value, 1, 10000);
    if (lockCheck.checked) widthInput.value = Math.round(h * aspectRatio);
    renderPreview();
  });

  lockCheck.addEventListener("change", function () {
    if (this.checked && originalImage) {
      heightInput.value = Math.round(parseInt(widthInput.value, 10) / aspectRatio);
      renderPreview();
    }
  });

  // ---- Format & quality ----
  function toggleQualityRow() {
    if (formatSelect.value === "image/jpeg") qualityRow.style.display = "";
    else qualityRow.style.display = "none";
  }
  formatSelect.addEventListener("change", function () { toggleQualityRow(); renderPreview(); });
  qualitySlider.addEventListener("input", function () {
    qualityValue.textContent = this.value + "%";
    renderPreview();
  });

  // ---- Render preview ----
  function renderPreview() {
    if (!originalImage) return;
    const w = clampInt(widthInput.value, 1, 10000);
    const h = clampInt(heightInput.value, 1, 10000);

    previewCanvas.width = w;
    previewCanvas.height = h;
    const ctx = previewCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(originalImage, 0, 0, w, h);

    previewPlaceholder.style.display = "none";
    previewCanvas.style.display = "block";

    const fmt = formatSelect.value;
    const q = parseInt(qualitySlider.value, 10) / 100;
    const dataUrl = previewCanvas.toDataURL(fmt, fmt === "image/jpeg" ? q : undefined);
    currentBlob = dataUrlToBlob(dataUrl);

    // Estimate output size
    const bytes = currentBlob ? currentBlob.size : 0;
    const sizeText = bytes >= 1048576 ? (bytes / 1048576).toFixed(2) + " MB" : (bytes / 1024).toFixed(1) + " KB";

    previewMeta.innerHTML =
      "<strong>Dimensions:</strong> " + w + " × " + h + " px &nbsp;|&nbsp; " +
      "<strong>Format:</strong> " + fmt.replace("image/", "").toUpperCase() + " &nbsp;|&nbsp; " +
      "<strong>Size:</strong> " + sizeText;
    previewMeta.classList.add("show");
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const byteStr = atob(parts[1]);
    const mime = parts[0].match(/:(.*?);/)[1];
    const arr = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // ---- Download ----
  downloadBtn.addEventListener("click", function () {
    if (!currentBlob) return;
    const ext = formatSelect.value === "image/jpeg" ? "jpg" :
                formatSelect.value === "image/png" ? "png" : "webp";
    const w = clampInt(widthInput.value, 1, 10000);
    const h = clampInt(heightInput.value, 1, 10000);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(currentBlob);
    link.download = originalFileName + "_" + w + "x" + h + "." + ext;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 2000);
  });

  // ---- Reset ----
  resetBtn.addEventListener("click", function () {
    fileInput.value = "";
    originalImage = null;
    currentBlob = null;
    widthInput.value = "";
    heightInput.value = "";
    fileInfo.classList.remove("show");
    previewCanvas.style.display = "none";
    previewPlaceholder.style.display = "block";
    previewMeta.classList.remove("show");
    downloadBtn.disabled = true;
    const ctx = previewCanvas.getContext("2d");
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  });

  // ---- Mobile nav ----
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () { mainNav.classList.toggle("open"); });
  }
})();
