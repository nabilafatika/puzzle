const board = document.getElementById('board');
const piecesArea = document.getElementById('piecesArea');
const imageSelect = document.getElementById('imageSelect');
const uploadImage = document.getElementById('uploadImage');
const btnSquare = document.getElementById('btnSquare');
const btnJigsaw = document.getElementById('btnJigsaw');
const gridSizeSelect = document.getElementById('gridSize');
const restartBtn = document.getElementById('restartBtn');
const winPopup = document.getElementById('winPopup');

let currentImageSrc = imageSelect.value;
let gridSize = parseInt(gridSizeSelect.value);
let boardSize = window.innerWidth < 768 ? 280 : 320; 
let pieceSize = boardSize / gridSize;
let selectedShape = 'square'; // Variabel status bentuk default

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (type === 'win') {
        const winSound = document.getElementById('winSound');
        winSound.currentTime = 0;
        winSound.play().catch(err => console.log("Audio play blocked:", err));
        return;
    }

    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// Fungsi pembantu untuk menggambar bentuk liuk jigsaw path di Canvas
function drawJigsawPiecePath(ctx, x, y, size, topTab, rightTab, bottomTab, leftTab) {
    ctx.beginPath();
    let s = size;
    let tabSize = s * 0.2; // Ukuran tonjolan

    ctx.moveTo(x, y);

    // Sisi Atas
    if (topTab !== 0) {
        ctx.lineTo(x + s * 0.35, y);
        ctx.bezierCurveTo(x + s * 0.3, y - topTab * tabSize, x + s * 0.4, y - topTab * tabSize * 1.2, x + s * 0.5, y - topTab * tabSize * 1.2);
        ctx.bezierCurveTo(x + s * 0.6, y - topTab * tabSize * 1.2, x + s * 0.7, y - topTab * tabSize, x + s * 0.65, y);
    }
    ctx.lineTo(x + s, y);

    // Sisi Kanan
    if (rightTab !== 0) {
        ctx.lineTo(x + s, y + s * 0.35);
        ctx.bezierCurveTo(x + s + rightTab * tabSize, y + s * 0.3, x + s + rightTab * tabSize * 1.2, y + s * 0.4, x + s + rightTab * tabSize * 1.2, y + s * 0.5);
        ctx.bezierCurveTo(x + s + rightTab * tabSize * 1.2, y + s * 0.6, x + s + rightTab * tabSize, y + s * 0.7, x + s, y + s * 0.65);
    }
    ctx.lineTo(x + s, y + s);

    // Sisi Bawah
    if (bottomTab !== 0) {
        ctx.lineTo(x + s * 0.65, y + s);
        ctx.bezierCurveTo(x + s * 0.7, y + s + bottomTab * tabSize, x + s * 0.6, y + s + bottomTab * tabSize * 1.2, x + s * 0.5, y + s + bottomTab * tabSize * 1.2);
        ctx.bezierCurveTo(x + s * 0.4, y + s + bottomTab * tabSize * 1.2, x + s * 0.3, y + s + bottomTab * tabSize, x + s * 0.35, y + s);
    }
    ctx.lineTo(x, y + s);

    // Sisi Kiri
    if (leftTab !== 0) {
        ctx.lineTo(x, y + s * 0.65);
        ctx.bezierCurveTo(x - leftTab * tabSize, y + s * 0.7, x - leftTab * tabSize * 1.2, y + s * 0.6, x - leftTab * tabSize * 1.2, y + s * 0.5);
        ctx.bezierCurveTo(x - leftTab * tabSize * 1.2, y + s * 0.4, x - leftTab * tabSize, y + s * 0.3, x, y + s * 0.35);
    }
    ctx.lineTo(x, y);

    ctx.closePath();
}

function initGame() {
    board.innerHTML = '';
    piecesArea.innerHTML = '';
    winPopup.style.display = 'none';
    gridSize = parseInt(gridSizeSelect.value);
    pieceSize = boardSize / gridSize;

    board.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

    board.style.backgroundImage = `url(${currentImageSrc})`;
    board.style.backgroundSize = `${boardSize}px ${boardSize}px`;
    board.style.backgroundRepeat = 'no-repeat';
    board.style.backgroundBlendMode = 'overlay';
    board.style.backgroundColor = 'rgba(255, 253, 249, 0.7)'; 

    let img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImageSrc;
    img.onload = function() {
        let piecesArray = [];

        let hTabs = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
        let vTabs = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
        
        if (selectedShape === 'jigsaw') {
            for(let r=0; r<gridSize; r++) {
                for(let c=0; c<gridSize; c++) {
                    if(c < gridSize - 1) hTabs[r][c] = Math.random() < 0.5 ? 1 : -1;
                    if(r < gridSize - 1) vTabs[r][c] = Math.random() < 0.5 ? 1 : -1;
                }
            }
        }

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                // 1. Buat Slot Kosong di Papan
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.dataset.row = r;
                slot.dataset.col = c;
                slot.style.width = `${pieceSize}px`;
                slot.style.height = `${pieceSize}px`;
                slot.style.position = 'relative';

                let topTab = r > 0 ? -vTabs[r-1][c] : 0;
                let rightTab = c < gridSize - 1 ? hTabs[r][c] : 0;
                let bottomTab = r < gridSize - 1 ? vTabs[r][c] : 0;
                let leftTab = c > 0 ? -hTabs[r][c-1] : 0;

                if (selectedShape === 'square') {
                    slot.style.border = '1px solid rgba(255, 255, 255, 0.6)';
                } else {
                    slot.style.border = 'none';
                }

                if (selectedShape === 'jigsaw') {
                    let padding = pieceSize * 0.4;
                    let canvasSize = pieceSize + (padding * 2);
                    
                    const slotCanvas = document.createElement('canvas');
                    slotCanvas.width = canvasSize;
                    slotCanvas.height = canvasSize;
                    const sCtx = slotCanvas.getContext('2d');

                    sCtx.save();
                    sCtx.translate(padding - (c * pieceSize), padding - (r * pieceSize));
                    drawJigsawPiecePath(sCtx, c * pieceSize, r * pieceSize, pieceSize, topTab, rightTab, bottomTab, leftTab);
                    
                    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; 
                    sCtx.lineWidth = 1.5;
                    sCtx.stroke();
                    sCtx.restore();

                    slotCanvas.style.position = 'absolute';
                    slotCanvas.style.top = `-${padding}px`;
                    slotCanvas.style.left = `-${padding}px`;
                    slotCanvas.style.zIndex = '1';
                    slotCanvas.style.pointerEvents = 'none';
                    slot.appendChild(slotCanvas);
                } else {
                    slot.style.border = '1px solid rgba(255, 255, 255, 0.5)';
                }
                
                slot.addEventListener('dragover', (e) => e.preventDefault());
                slot.addEventListener('drop', dropPiece);
                board.appendChild(slot);

                // 2. Buat Kepingan Puzzle
                const piece = document.createElement('div');
                piece.className = 'puzzle-piece';
                piece.draggable = true;
                piece.dataset.correctRow = r;
                piece.dataset.correctCol = c;
                piece.id = `piece-${r}-${c}`;
                piece.style.zIndex = '2';

                if (selectedShape === 'square') {
                    piece.style.width = `${pieceSize}px`;
                    piece.style.height = `${pieceSize}px`;
                    piece.style.backgroundImage = `url(${currentImageSrc})`;
                    piece.style.backgroundSize = `${boardSize}px ${boardSize}px`;
                    piece.style.backgroundPosition = `-${c * pieceSize}px -${r * pieceSize}px`;
                    piece.style.boxShadow = 'none';

                    let radiusTopLeft = (r === 0 && c === 0) ? '12px' : '0px';
                    let radiusTopRight = (r === 0 && c === gridSize - 1) ? '12px' : '0px';
                    let radiusBottomRight = (r === gridSize - 1 && c === gridSize - 1) ? '12px' : '0px';
                    let radiusBottomLeft = (r === gridSize - 1 && c === 0) ? '12px' : '0px';

                    piece.style.borderRadius = `${radiusTopLeft} ${radiusTopRight} ${radiusBottomRight} ${radiusBottomLeft}`;
                } else {
                    let padding = pieceSize * 0.4;
                    let canvasSize = pieceSize + (padding * 2);
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = canvasSize;
                    canvas.height = canvasSize;
                    const ctx = canvas.getContext('2d');

                    ctx.save();
                    ctx.translate(padding - (c * pieceSize), padding - (r * pieceSize));
                    drawJigsawPiecePath(ctx, c * pieceSize, r * pieceSize, pieceSize, topTab, rightTab, bottomTab, leftTab);
                    ctx.clip();
                    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, boardSize, boardSize);
                    ctx.restore();

                    piece.style.width = `${canvasSize}px`;
                    piece.style.height = `${canvasSize}px`;
                    piece.style.marginTop = `-${padding}px`;
                    piece.style.marginLeft = `-${padding}px`;
                    piece.appendChild(canvas);
                }

                piece.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/id', e.target.id);
                });

                piecesArray.push(piece);
            }
        }

        piecesArea.addEventListener('dragover', (e) => e.preventDefault());
        piecesArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const pieceId = e.dataTransfer.getData('text/id');
            const piece = document.getElementById(pieceId);
            piecesArea.appendChild(piece);
        });

        piecesArray.sort(() => Math.random() - 0.5).forEach(p => piecesArea.appendChild(p));
    };
}

function dropPiece(e) {
    e.preventDefault();
    const pieceId = e.dataTransfer.getData('text/id');
    const piece = document.getElementById(pieceId);

    const existingPiece = Array.from(this.children).find(child => child.classList.contains('puzzle-piece'));

    if (!existingPiece) {
        this.appendChild(piece);
        playSound('snap');
        checkWin();
    }
}

function checkWin() {
    const slots = document.querySelectorAll('.slot');
    let win = true;
    slots.forEach(slot => {
        let pieceInside = Array.from(slot.children).find(child => child.classList.contains('puzzle-piece'));
        if (!pieceInside) {
            win = false;
        } else {
            if (slot.dataset.row != pieceInside.dataset.correctRow || slot.dataset.col != pieceInside.dataset.correctCol) {
                win = false;
            }
        }
    });

    if (win) {
        playSound('win');
        winPopup.style.display = 'flex';
    }
}

function resetGame() {
    const winSound = document.getElementById('winSound');
    winSound.pause();
    winSound.currentTime = 0;
    initGame();
}

btnSquare.addEventListener('click', () => {
    selectedShape = 'square';
    btnSquare.classList.add('active');
    btnJigsaw.classList.remove('active');
    initGame();
});

btnJigsaw.addEventListener('click', () => {
    selectedShape = 'jigsaw';
    btnJigsaw.classList.add('active');
    btnSquare.classList.remove('active');
    initGame();
});

imageSelect.addEventListener('change', (e) => {
    currentImageSrc = e.target.value;
    initGame();
});

uploadImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            currentImageSrc = event.target.result;
            initGame();
        }
        reader.readAsDataURL(file);
    }
});

// ==========================================
// TAMBAHAN TOUCH HANDLER AGAR DI HP BISA LANGSUNG DISERET TANPA TAHAN LAMA
// ==========================================
document.addEventListener('touchstart', function(e) {
    if (window.innerWidth < 768 && e.target.closest('.puzzle-piece')) {
        const piece = e.target.closest('.puzzle-piece');
        piece.dataset.touching = "true";
    }
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    // Mencegah layar ikut ke-scroll (tarik-tarik halaman) saat sedang menyeret kepingan puzzle
    if (window.innerWidth < 768) {
        const draggingPiece = document.querySelector('.puzzle-piece[data-touching="true"]');
        if (draggingPiece) {
            e.preventDefault(); 
        }
    }
}, { passive: false });

document.addEventListener('touchend', function(e) {
    if (window.innerWidth < 768) {
        const draggingPiece = document.querySelector('.puzzle-piece[data-touching="true"]');
        if (draggingPiece) {
            draggingPiece.removeAttribute('data-touching');
            
            // Mencari elemen kotak/slot yang sedang disentuh di bawah jari saat dilepas
            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetSlot = elementBelow ? elementBelow.closest('.slot') : null;
            
            if (targetSlot) {
                const existingPiece = Array.from(targetSlot.children).find(child => child.classList.contains('puzzle-piece'));
                if (!existingPiece) {
                    targetSlot.appendChild(draggingPiece);
                    playSound('snap');
                    checkWin();
                }
            }
        }
    }
});

gridSizeSelect.addEventListener('change', initGame);
restartBtn.addEventListener('click', initGame);

initGame();