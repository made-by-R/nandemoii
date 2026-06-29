document.addEventListener('DOMContentLoaded', () => {
  // 元のオープニング動画制御ロジックのフック
  const video = document.getElementById('op-video');
  function switchToMainContent() {
    document.body.classList.add('loaded');
    sessionStorage.setItem('visited', 'true');
  }
  if (video && !document.body.classList.contains('no-video')) {
    video.addEventListener('timeupdate', () => {
      if (video.currentTime >= 9.0) switchToMainContent();
    });
    video.addEventListener('ended', switchToMainContent);
  }

  // 物理ドット絵エンジンコアシステム
  const charCanvas = document.getElementById('charCanvas');
  const charCtx = charCanvas.getContext('2d');

  function resizeCanvas() {
    charCanvas.width = window.innerWidth;
    charCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ドット絵の表示倍率（サイトの雰囲気に合わせて3倍）
  const spriteScale = 2; 
  let charAnimFrame = 0;
  setInterval(() => { charAnimFrame = (charAnimFrame + 1) % 4; }, 150);

  // 座標と物理演算用変数
  let charMouseX = window.innerWidth / 2;
  let charMouseY = window.innerHeight / 2;
  let charX = charMouseX;
  let charY = charMouseY;
  let charState = "standing"; 
  let lastMoveTime = Date.now();
  let isMouseMoving = false;
  let fallVelocity = 0;
  const gravityForce = 0.6;

  // マウスイベントの監視
  window.addEventListener('mousemove', (e) => {
    charMouseX = e.clientX;
    charMouseY = e.clientY;
    lastMoveTime = Date.now();
    isMouseMoving = true;
  });

  // 設計図から1ピクセルずつキャンバスにレンダリングする関数
  function drawComp(comp, compCx, compCy, flip) {
    let w = comp[0].length;
    let h = comp.length;
    let startX = compCx - (w * spriteScale) / 2;
    let startY = compCy - (h * spriteScale);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        let char = comp[r][flip ? w - 1 - c : c];
        if (char !== '0') {
          charCtx.fillStyle = palette[char];
          charCtx.fillRect(startX + c * spriteScale, startY + r * spriteScale, spriteScale, spriteScale);
        }
      }
    }
  }

  // パーツ位置の計算・組み立て
  function assembleChar(cx, cy, currentState, frame) {
    let hY = -6, bY = 4, laX = -11, raX = 11, laY = 6, raY = 6;
    let llX = -6, rlX = 6, llY = 14, rlY = 14;
    let laType = cArmDown, raType = cArmDown, llType = cLegDown, rlType = cLegDown;

    if (currentState === 'standing') {
      if (frame === 1 || frame === 3) { hY += 1; bY += 1; laY += 1; raY += 1; } // アイドル時の呼吸
    } else if (currentState === 'lifted') {
      hY -= 2; bY -= 1; laType = cArmUp; raType = cArmUp; laY -= 8; raY -= 8; laX = -13; raX = 13;
      if (frame === 1 || frame === 3) { llY -= 1; rlY -= 1; }
    } else if (currentState === 'swinging') {
      hY -= 2; bY -= 1; laType = cArmUp; raType = cArmUp; laY -= 8; raY -= 8; laX = -13; raX = 13;
      let tilt = [-2, 0, 2, 0][frame];
      let bob = [0, -1, 0, -1][frame];
      hY += bob; bY += bob; laY += bob; raY += bob; llX += tilt; rlX += tilt; llY += bob; rlY += bob;
    } else if (currentState === 'falling') {
      laType = cArmUp; raType = cArmUp; laX = -14; raX = 14; laY -= 10; raY -= 10;
      let drop = [-1, 0, -1, -2][frame];
      hY += drop; bY += drop; laY += drop; raY += drop; llY += drop; rlY += drop; llX = -9; rlX = 9;
    } else if (currentState === 'landing') {
      bY += 6; laY += 6; raY += 6; hY += 8;
      llType = cLegBent; rlType = cLegBent; llX = -11; rlX = 11; llY = 12; rlY = 12;
    }

    // レンダリングサイクル
    drawComp(llType, cx + llX * spriteScale, cy + llY * spriteScale, false);
    drawComp(rlType, cx + rlX * spriteScale, cy + rlY * spriteScale, true);
    if (laType === cArmUp) {
      drawComp(laType, cx + laX * spriteScale, cy + laY * spriteScale, false);
      drawComp(raType, cx + raX * spriteScale, cy + raY * spriteScale, true);
    }
    drawComp(cBody, cx, cy + bY * spriteScale, false);
    if (laType === cArmDown) {
      drawComp(laType, cx + laX * spriteScale, cy + laY * spriteScale, false);
      drawComp(raType, cx + raX * spriteScale, cy + raY * spriteScale, true);
    }
    drawComp(cHead, cx, cy + hY * spriteScale, false);
  }

  // 物理演算ループ
  function physicsUpdate() {
    // 動画再生中は処理をスキップ
    if (!document.body.classList.contains('loaded') && !document.body.classList.contains('no-video')) {
      requestAnimationFrame(physicsUpdate);
      return;
    }

    charCtx.clearRect(0, 0, charCanvas.width, charCanvas.height);

    const currentTime = Date.now();
    if (currentTime - lastMoveTime > 100) isMouseMoving = false;

    if (isMouseMoving) {
      // 持ち上げ・イージング移動
      let targetX = charMouseX;
      let targetY = charMouseY + 30;
      let dx = targetX - charX;
      let dy = targetY - charY;
      charX += dx * 0.2; 
      charY += dy * 0.2;
      charState = Math.abs(dx) > 2 ? "swinging" : "lifted"; 
      fallVelocity = 0;
    } else {
      // 自由落下・着地判定
      if (charY < charMouseY + 30) {
        charState = "falling";
        fallVelocity += gravityForce;
        charY += fallVelocity;
        if (charY >= charMouseY + 30) {
          charY = charMouseY + 30;
          charState = "landing";
          fallVelocity = 0;
          setTimeout(() => {
            if (!isMouseMoving && charState === "landing") charState = "standing";
          }, 250);
        }
      }
    }

    // キャンバスにキャラを描画
    assembleChar(charX, charY, charState, charAnimFrame);
    requestAnimationFrame(physicsUpdate);
  }

  // システム起動
  requestAnimationFrame(physicsUpdate);
});