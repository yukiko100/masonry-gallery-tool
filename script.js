const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const uploadError = document.getElementById('uploadError');
const thumbs = document.getElementById('thumbs');
const gallery = document.getElementById('gallery');
const captureArea = document.getElementById('captureArea');
const normalPreviewStage = document.getElementById('normalPreviewStage');
const normalPreviewContent = document.getElementById('normalPreviewContent');
const normalEmpty = document.getElementById('normalEmpty');
const tiltEmpty = document.getElementById('tiltEmpty');
const tiltPreviewStage = document.getElementById('tiltPreviewStage');
const tiltPreviewContent = document.getElementById('tiltPreviewContent');
const columns = document.getElementById('columns');
const gap = document.getElementById('gap');
const radius = document.getElementById('radius');
const bgColor = document.getElementById('bgColor');
const exportWidth = document.getElementById('exportWidth');
const sizePreset = document.getElementById('sizePreset');
const angle = document.getElementById('angle');
const shadow = document.getElementById('shadow');
const shadowStrength = document.getElementById('shadowStrength');
const format = document.getElementById('format');
const bgMode = document.getElementById('bgMode');
const columnsVal = document.getElementById('columnsVal');
const gapVal = document.getElementById('gapVal');
const radiusVal = document.getElementById('radiusVal');
const angleVal = document.getElementById('angleVal');
const shadowStrengthVal = document.getElementById('shadowStrengthVal');
const downloadNormal = document.getElementById('downloadNormal');
const downloadTilted = document.getElementById('downloadTilted');
const resetAngleBtn = document.getElementById('resetAngleBtn');
const updateTiltPreview = document.getElementById('updateTiltPreview');
const resetAllBtn = document.getElementById('resetAllBtn');

let images = [];
let uploadedFiles = [];
let sortable = null;
let previewTimer = null;
let normalPreviewResizeFrame = null;
let tiltPreviewResizeFrame = null;

const MAX_UPLOAD_COUNT = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isTransparentExport() { return format.value === 'image/png' && bgMode.value === 'transparent'; }
function getShadowStrength() { return shadow.checked ? Number(shadowStrength.value) : 0; }
function updateRangeFill(input) {
  if (!input || input.type !== 'range') return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || min);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  input.style.setProperty('--range-percent', percent + '%');
}
function syncRangeFills() {
  document.querySelectorAll('input[type="range"]').forEach(updateRangeFill);
}
function setUploadError(message) { uploadError.textContent = message; }
function clearUploadError() { uploadError.textContent = ''; }
function getTotalUploadSize() {
  return uploadedFiles.reduce((total, file) => total + file.size, 0);
}
function validateFiles(files) {
  const nextFiles = Array.from(files || []);
  if (!nextFiles.length) return { valid: false, message: '' };

  const errorMessages = [];
  const nextTotalCount = images.length + nextFiles.length;
  const nextTotalSize = getTotalUploadSize() + nextFiles.reduce((total, file) => total + file.size, 0);

  if (nextTotalCount > MAX_UPLOAD_COUNT) {
    errorMessages.push('最大20枚までアップロードできます。');
  }
  if (nextFiles.some(file => !ALLOWED_FILE_TYPES.includes(file.type))) {
    errorMessages.push('JPEG / PNG / WebP形式の画像を選択してください。');
  }
  if (nextFiles.some(file => file.size > MAX_FILE_SIZE)) {
    errorMessages.push('1枚5MB以内の画像を選択してください。');
  }
  if (nextTotalSize > MAX_TOTAL_SIZE) {
    errorMessages.push('合計30MB以内にしてください。');
  }

  return {
    valid: errorMessages.length === 0,
    message: errorMessages.join('\n')
  };
}

async function readFiles(files) {
  const validation = validateFiles(files);
  if (!validation.valid) {
    if (validation.message) setUploadError(validation.message);
    fileInput.value = '';
    return;
  }

  const imageFiles = Array.from(files || []);
  clearUploadError();
  const addedImages = await Promise.all(imageFiles.map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  })));
  images = images.concat(addedImages);
  uploadedFiles = uploadedFiles.concat(imageFiles.map(file => ({
    name: file.name,
    size: file.size,
    type: file.type
  })));
  renderThumbs();
  renderGallery();
  fileInput.value = '';
}

function deleteImage(index) {
  images.splice(index, 1);
  uploadedFiles.splice(index, 1);
  clearUploadError();
  renderThumbs();
  renderGallery();
}

function moveImage(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= images.length) return;
  [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
  [uploadedFiles[index], uploadedFiles[nextIndex]] = [uploadedFiles[nextIndex], uploadedFiles[index]];
  renderThumbs();
  renderGallery();
}

function initSortable() {
  if (sortable) sortable.destroy();
  if (!window.Sortable) return;
  sortable = new Sortable(thumbs, {
    animation: 180,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    filter: '.delete-btn,.thumb-controls button',
    preventOnFilter: false,
    onEnd: event => {
      if (event.oldIndex === event.newIndex) return;
      const movedItem = images.splice(event.oldIndex, 1)[0];
      const movedFile = uploadedFiles.splice(event.oldIndex, 1)[0];
      images.splice(event.newIndex, 0, movedItem);
      uploadedFiles.splice(event.newIndex, 0, movedFile);
      renderThumbs();
      renderGallery();
    }
  });
}

function renderThumbs() {
  thumbs.innerHTML = '';
  images.forEach((src, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = document.createElement('img');
    img.src = src;
    const badge = document.createElement('div');
    badge.className = 'thumb-index';
    badge.textContent = index + 1;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete-btn';
    del.textContent = '×';
    del.addEventListener('click', e => {
      e.stopPropagation();
      deleteImage(index);
    });
    const controls = document.createElement('div');
    controls.className = 'thumb-controls';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.textContent = '← 前へ';
    prevBtn.disabled = index === 0;
    prevBtn.addEventListener('click', e => {
      e.stopPropagation();
      moveImage(index, -1);
    });
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = '次へ →';
    nextBtn.disabled = index === images.length - 1;
    nextBtn.addEventListener('click', e => {
      e.stopPropagation();
      moveImage(index, 1);
    });
    controls.append(prevBtn, nextBtn);
    thumb.append(img, badge, del, controls);
    thumbs.appendChild(thumb);
  });
  initSortable();
}

function renderGallery() {
  gallery.innerHTML = '';
  if (!images.length) {
    normalEmpty.style.display = 'grid';
    refreshNormalPreview();
    resetTiltPreview();
    return;
  }
  normalEmpty.style.display = 'none';
  const colCount = Number(columns.value);
  const columnEls = [];
  for (let i = 0; i < colCount; i++) {
    const col = document.createElement('div');
    col.className = 'column';
    gallery.appendChild(col);
    columnEls.push(col);
  }
  images.forEach((src, index) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    const inner = document.createElement('div');
    inner.className = 'gallery-item-inner';
    const img = document.createElement('img');
    img.src = src;
    inner.appendChild(img);
    item.appendChild(inner);
    columnEls[index % colCount].appendChild(item);
  });
  applySettings(false, false);
  waitImagesLoaded(captureArea).then(() => {
    refreshNormalPreview();
    scheduleTiltPreview();
  });
}

function applySettings(shouldRerender = false, shouldSchedulePreview = true) {
  columnsVal.textContent = columns.value;
  gapVal.textContent = gap.value + 'px';
  radiusVal.textContent = radius.value + 'px';
  angleVal.textContent = angle.value + '°';
  shadowStrengthVal.textContent = shadowStrength.value;
  captureArea.style.width = exportWidth.value + 'px';
  captureArea.style.background = bgColor.value;
  const strength = getShadowStrength();
  const blur = 8 + (strength * 0.46);
  const offsetY = 4 + (strength * 0.33);
  const opacity = strength === 0 ? 0 : (0.08 + (strength / 100) * 0.32);
  const capturePadding = 32 + Math.ceil(blur + offsetY);
  captureArea.style.setProperty('--shadow-strength', String(strength));
  captureArea.style.setProperty('--shadow-blur', blur.toFixed(1) + 'px');
  captureArea.style.setProperty('--shadow-offset-y', offsetY.toFixed(1) + 'px');
  captureArea.style.setProperty('--shadow-opacity', opacity.toFixed(3));
  captureArea.style.setProperty('--capture-padding', capturePadding + 'px');
  gallery.style.gridTemplateColumns = 'repeat(' + columns.value + ', 1fr)';
  gallery.style.gap = gap.value + 'px';
  document.querySelectorAll('.column').forEach(col => {
    col.style.gap = gap.value + 'px';
  });
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.style.borderRadius = radius.value + 'px';
  });
  if (shouldRerender && images.length) renderGallery();
  if (!shouldRerender) refreshNormalPreview();
  if (shouldSchedulePreview && images.length) scheduleTiltPreview();
}

async function captureNormalCanvas(scale = 1) {
  applySettings(false, false);
  await waitImagesLoaded(captureArea);
  const canvas = renderGalleryCanvas(scale);
  applySettings(false, false);
  return canvas;
}

function updateNormalPreviewScale() {
  const previewCapture = normalPreviewContent.firstElementChild;
  if (!previewCapture) return;
  const availableWidth = normalPreviewStage.clientWidth;
  const availableHeight = normalPreviewStage.clientHeight;
  const contentWidth = previewCapture.offsetWidth;
  const contentHeight = previewCapture.offsetHeight;
  if (!availableWidth || !availableHeight || !contentWidth || !contentHeight) return;
  const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1);
  normalPreviewContent.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
}

function scheduleNormalPreviewScale() {
  cancelAnimationFrame(normalPreviewResizeFrame);
  normalPreviewResizeFrame = requestAnimationFrame(updateNormalPreviewScale);
}

function createPreviewClone(className) {
  const cloneCaptureArea = captureArea.cloneNode(true);
  cloneCaptureArea.removeAttribute('id');
  cloneCaptureArea.classList.add('preview-capture');
  if (className) cloneCaptureArea.classList.add(className);
  if (getShadowStrength() > 0) {
    cloneCaptureArea.querySelectorAll('.gallery-item').forEach(item => item.classList.add('has-shadow'));
  }
  return cloneCaptureArea;
}

async function refreshNormalPreview() {
  normalPreviewContent.innerHTML = '';
  const cloneCaptureArea = createPreviewClone();
  normalPreviewContent.appendChild(cloneCaptureArea);
  await waitImagesLoaded(cloneCaptureArea);
  scheduleNormalPreviewScale();
}

function getRotatedBounds(width, height, degrees) {
  const rad = degrees * Math.PI / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  return {
    width: (width * cos) + (height * sin),
    height: (width * sin) + (height * cos)
  };
}

function rotateCanvas(sourceCanvas, degrees) {
  const rad = degrees * Math.PI / 180;
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const bounds = getRotatedBounds(w, h, degrees);
  const rotated = document.createElement('canvas');
  rotated.width = Math.ceil(bounds.width);
  rotated.height = Math.ceil(bounds.height);
  const ctx = rotated.getContext('2d');
  ctx.clearRect(0, 0, rotated.width, rotated.height);
  if (!isTransparentExport()) {
    ctx.fillStyle = bgColor.value;
    ctx.fillRect(0, 0, rotated.width, rotated.height);
  }
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(sourceCanvas, -w / 2, -h / 2);
  return rotated;
}

function getCanvasShadowSettings() {
  const strength = getShadowStrength();
  if (strength <= 0) return null;
  return {
    blur: 8 + (strength * 0.46),
    offsetY: 4 + (strength * 0.33),
    opacity: 0.08 + (strength / 100) * 0.32
  };
}

function buildRoundedRectPath(ctx, x, y, width, height, radiusValue) {
  const r = Math.max(0, Math.min(radiusValue, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function renderGalleryCanvas(scale = 1) {
  const transparent = isTransparentExport();
  const areaRect = captureArea.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(areaRect.width * scale);
  canvas.height = Math.round(areaRect.height * scale);

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, areaRect.width, areaRect.height);

  if (!transparent) {
    ctx.fillStyle = bgColor.value;
    ctx.fillRect(0, 0, areaRect.width, areaRect.height);
  }

  const shadowSettings = getCanvasShadowSettings();
  const cardRadius = Number(radius.value);
  const itemEls = Array.from(captureArea.querySelectorAll('.gallery-item'));

  itemEls.forEach(item => {
    const itemRect = item.getBoundingClientRect();
    const x = itemRect.left - areaRect.left;
    const y = itemRect.top - areaRect.top;
    const width = itemRect.width;
    const height = itemRect.height;
    const img = item.querySelector('img');
    if (!img) return;

    if (shadowSettings) {
      ctx.save();
      ctx.shadowColor = 'rgba(15,23,42,' + shadowSettings.opacity.toFixed(3) + ')';
      ctx.shadowBlur = shadowSettings.blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = shadowSettings.offsetY;
      buildRoundedRectPath(ctx, x, y, width, height, cardRadius);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    buildRoundedRectPath(ctx, x, y, width, height, cardRadius);
    ctx.clip();
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
  });

  return canvas;
}

function updateTiltPreviewScale() {
  const cloneCaptureArea = tiltPreviewContent.firstElementChild;
  if (!cloneCaptureArea) return;
  const availableWidth = tiltPreviewStage.clientWidth;
  const availableHeight = tiltPreviewStage.clientHeight;
  const contentWidth = cloneCaptureArea.offsetWidth;
  const contentHeight = cloneCaptureArea.offsetHeight;
  if (!availableWidth || !availableHeight || !contentWidth || !contentHeight) return;
  const bounds = getRotatedBounds(contentWidth, contentHeight, Number(angle.value));
  const scale = Math.min(availableWidth / bounds.width, availableHeight / bounds.height, 1);
  tiltPreviewContent.style.transform = 'translate(-50%, -50%) rotate(' + angle.value + 'deg) scale(' + scale + ')';
}

function scheduleTiltPreviewScale() {
  cancelAnimationFrame(tiltPreviewResizeFrame);
  tiltPreviewResizeFrame = requestAnimationFrame(updateTiltPreviewScale);
}

async function refreshTiltPreview() {
  if (!images.length) {
    resetTiltPreview();
    return;
  }
  tiltEmpty.textContent = 'プレビュー生成中…';
  tiltEmpty.style.display = 'block';
  tiltPreviewStage.style.display = 'none';
  try {
    applySettings(false, false);
    await waitImagesLoaded(captureArea);
    const cloneCaptureArea = createPreviewClone('tilt-preview-capture');
    tiltPreviewContent.innerHTML = '';
    tiltPreviewContent.appendChild(cloneCaptureArea);
    await waitImagesLoaded(cloneCaptureArea);
    tiltPreviewStage.style.display = 'block';
    tiltEmpty.style.display = 'none';
    scheduleTiltPreviewScale();
  } catch (error) {
    tiltEmpty.textContent = 'プレビュー生成に失敗しました。\n画像枚数やサイズを減らして再試行してください。';
    tiltEmpty.style.display = 'block';
    tiltPreviewStage.style.display = 'none';
    tiltPreviewContent.innerHTML = '';
    console.error(error);
  }
}

function scheduleTiltPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshTiltPreview, 350);
}

function resetTiltPreview() {
  tiltEmpty.textContent = '画像をアップロードすると\n傾けた状態のプレビューが表示されます';
  tiltEmpty.style.display = 'block';
  tiltPreviewStage.style.display = 'none';
  tiltPreviewContent.innerHTML = '';
  tiltPreviewContent.style.transform = 'translate(-50%, -50%)';
}

function resetAll() {
  clearTimeout(previewTimer);
  images = [];
  uploadedFiles = [];
  fileInput.value = '';
  thumbs.innerHTML = '';
  clearUploadError();
  columns.value = 3;
  gap.value = 16;
  radius.value = 8;
  bgColor.value = '#ffffff';
  exportWidth.value = 1200;
  sizePreset.value = '';
  angle.value = -15;
  shadow.checked = false;
  shadowStrength.value = 30;
  format.value = 'image/png';
  bgMode.value = 'solid';
  renderGallery();
  applySettings(false, false);
  resetTiltPreview();
}

function downloadCanvas(canvas, filename, mimeType) {
  const url = canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.92 : undefined);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function waitImagesLoaded(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  return Promise.all(imgs.map(img => (
    img.complete && img.naturalWidth > 0
      ? Promise.resolve()
      : new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      })
  )));
}

fileInput.addEventListener('change', e => readFiles(e.target.files));
// label要素の標準動作でファイル選択を開くため、
// JavaScriptで fileInput.click() は呼ばない。
// 二重発火すると、初回選択が反映されないブラウザがあります。
['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, e => {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.add('is-dragover');
}));
['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, e => {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.remove('is-dragover');
}));
dropzone.addEventListener('drop', e => readFiles(e.dataTransfer.files));
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
window.addEventListener('resize', scheduleNormalPreviewScale);
window.addEventListener('resize', scheduleTiltPreviewScale);

[gap, radius, bgColor, exportWidth, angle, bgMode].forEach(input => {
  input.addEventListener('input', () => applySettings(false, true));
  input.addEventListener('change', () => applySettings(false, true));
});
[shadowStrength].forEach(input => {
  input.addEventListener('input', () => applySettings(false, true));
  input.addEventListener('change', () => applySettings(false, true));
});
document.querySelectorAll('input[type="range"]').forEach(input => {
  input.addEventListener('input', () => updateRangeFill(input));
  input.addEventListener('change', () => updateRangeFill(input));
});
shadow.addEventListener('change', () => {
  renderGallery();
  applySettings(false, true);
});
format.addEventListener('change', () => {
  if (format.value === 'image/jpeg') bgMode.value = 'solid';
  applySettings(false, true);
});
columns.addEventListener('input', () => applySettings(true, true));
sizePreset.addEventListener('change', () => {
  if (!sizePreset.value) return;
  exportWidth.value = sizePreset.value;
  applySettings(false, true);
});
resetAngleBtn.addEventListener('click', () => {
  angle.value = -15;
  applySettings(false, true);
});
updateTiltPreview.addEventListener('click', refreshTiltPreview);
resetAllBtn.addEventListener('click', resetAll);
downloadNormal.addEventListener('click', async () => {
  if (!images.length) return alert('画像をアップロードしてください。');
  const canvas = await captureNormalCanvas(1);
  const ext = format.value === 'image/png' ? 'png' : 'jpg';
  downloadCanvas(canvas, 'masonry-gallery.' + ext, format.value);
});
downloadTilted.addEventListener('click', async () => {
  if (!images.length) return alert('画像をアップロードしてください。');
  const baseCanvas = await captureNormalCanvas(1);
  const rotatedCanvas = rotateCanvas(baseCanvas, Number(angle.value));
  const ext = format.value === 'image/png' ? 'png' : 'jpg';
  downloadCanvas(rotatedCanvas, 'masonry-gallery-tilt-' + angle.value + '.' + ext, format.value);
});

applySettings(false, false);
syncRangeFills();
refreshNormalPreview();
