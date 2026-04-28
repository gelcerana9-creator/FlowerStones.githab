(function() {
   
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');


    const W = 1200, H = 700;
    canvas.width = W;
    canvas.height = H;


    const mainMenuScreen = document.getElementById('mainMenuScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startBtn = document.getElementById('startGameBtn');
    const restartBtn = document.getElementById('restartBtn');
    const menuBtn = document.getElementById('menuBtn');
    const playerNameInput = document.getElementById('playerNameInput');


    const soundFone = new Audio('music/SoundFone.mp3');
    const soundButton = new Audio('music/SoundButton.mp3');
    const soundJump = new Audio('music/SoundJump.mp3');
    

    soundFone.loop = true;
    soundFone.volume = 0.5;

    soundButton.volume = 0.4;
    soundJump.volume = 0.4;
    
    let soundEnabled = true;
    
    function playSound(sound) {
        if (soundEnabled) {
            if (sound === soundFone) {
                soundFone.play().catch(e => console.log("Ошибка воспроизведения фоновой музыки:", e));
            } else {
                sound.currentTime = 0;
                sound.play().catch(e => console.log("Ошибка воспроизведения звука:", e));
            }
        }
    }
    
    function stopBackgroundMusic() {
        soundFone.pause();
        soundFone.currentTime = 0;
    }
    
    function toggleSound() {
        soundEnabled = !soundEnabled;
        if (!soundEnabled) {
            soundFone.pause();
        } else {
            if (currentScreen === 'game') {
                soundFone.play().catch(e => console.log("Ошибка воспроизведения фоновой музыки:", e));
            }
        }
        console.log("Звук " + (soundEnabled ? "включен" : "выключен"));
        return soundEnabled;
    }
    
    function setSoundVolume(volume) {
        soundFone.volume = Math.max(0, Math.min(1, volume));
        soundButton.volume = Math.max(0, Math.min(1, volume)) * 0.8;
        soundJump.volume = Math.max(0, Math.min(1, volume)) * 0.8;
    }
    
    function initSoundSettings() {
        let soundToggleBtn = document.getElementById('soundToggleBtn');
        if (!soundToggleBtn) {
            soundToggleBtn = document.createElement('button');
            soundToggleBtn.id = 'soundToggleBtn';
            soundToggleBtn.textContent = '🔊';
            soundToggleBtn.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; padding: 8px 15px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 14px;';
            document.body.appendChild(soundToggleBtn);
        }
        
        soundToggleBtn.addEventListener('click', () => {
            const isEnabled = toggleSound();
            soundToggleBtn.textContent = isEnabled ? '🔊' : '🔇';
        });
    }

    const images = {
        player: new Image(),
        flower: new Image(),
        stone: new Image(),
        playerJump: new Image()
    };
    
    let imagesLoaded = 0;
    const totalImages = 4;
    let useFallbackGraphics = true;
    
    
    function loadImage(image, src, name) {
        return new Promise((resolve, reject) => {
            image.onload = () => {
                console.log(`✅ Загружено: ${name}`);
                imagesLoaded++;
                resolve();
            };
            image.onerror = () => {
                console.warn(`⚠️ Не удалось загрузить: ${name}, будет использован fallback`);
                reject();
            };
            image.src = src;
        });
    }
    
    async function loadAssets() {
        const assetUrls = {
            player: 'assets/player.png',
            flower: 'assets/flower.png',
            stone: 'assets/stone.png',
            playerJump: 'assets/player_jump.png'
        };
        
        try {
            await Promise.all([
                loadImage(images.player, assetUrls.player, 'Игрок'),
                loadImage(images.flower, assetUrls.flower, 'Цветок'),
                loadImage(images.stone, assetUrls.stone, 'Камень'),
                loadImage(images.playerJump, assetUrls.playerJump, 'Прыжок игрока')
            ]);
            useFallbackGraphics = false;
            console.log('🎨 Все ассеты успешно загружены!');
        } catch (error) {
            console.log('⚠️ Используются встроенные графические элементы');
            useFallbackGraphics = true;
        }
    }

    let currentScreen = 'menu';
    let animationFrameId = null;
    let playerName = "Explorer";
    let score = 0;
    let timeLeft = 45.0;
    let gameActive = true;
    let timerInterval = null;

    const player = {
        x: 170,
        y: (H / 2) - 24,
        width: 48,
        height: 48,
        vy: 0,
        grounded: true,
        jumpPower: -10.5,
        gravity: 0.6,
        startY: (H / 2) - 24
    };

    const GROUND_Y = H - 170;
    let obstacles = [];
    let flowers = [];
    
    let nextSpawnX = W + 50;
    let lastSpawnType = null;
    let consecutiveCount = 0;
    let totalSpawnedObjects = 0;
    const MIN_OBJECTS_TO_SPAWN = 40;
    
    let worldSpeed = 5.0;

    let leaderboard = [];

    function loadLeaderboard() {
        const stored = localStorage.getItem('flowers_stones_top');
        if (stored) {
            try {
                leaderboard = JSON.parse(stored);
            } catch(e) { leaderboard = []; }
        }
        if (!leaderboard.length) {
            leaderboard = [
                { name: "Mia", flowers: 28 },
                { name: "Leo", flowers: 24 },
                { name: "Sam", flowers: 19 },
                { name: "Zoe", flowers: 17 }
            ];
            saveLeaderboard();
        }
        leaderboard.sort((a,b) => b.flowers - a.flowers);
        if (leaderboard.length > 10) leaderboard = leaderboard.slice(0,10);
    }

    function saveLeaderboard() {
        localStorage.setItem('flowers_stones_top', JSON.stringify(leaderboard));
    }

    function addScoreToLeaderboard(name, flowerCount) {
        if (!name || name.trim() === "") name = "Anonymous";
        leaderboard.push({ name: name.substring(0,16), flowers: flowerCount });
        leaderboard.sort((a,b) => b.flowers - a.flowers);
        if (leaderboard.length > 10) leaderboard = leaderboard.slice(0,10);
        saveLeaderboard();
    }

    function resetGameVariables() {
        score = 0;
        timeLeft = 45.0;
        gameActive = true;
        obstacles = [];
        flowers = [];
        nextSpawnX = W + 50;
        lastSpawnType = null;
        consecutiveCount = 0;
        totalSpawnedObjects = 0;
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.grounded = true;
        player.startY = GROUND_Y - player.height;
    }

    
    function isValidDistance(position, minDistance = 150, maxDistance = 200) {
        for (let stone of obstacles) {
            const distance = Math.abs(stone.x - position);
            if (distance < minDistance) return false;
        }
        for (let flower of flowers) {
            const distance = Math.abs(flower.x - position);
            if (distance < minDistance) return false;
        }
        return true;
    }

    function findOptimalSpawnPosition(basePosition) {
        let position = basePosition;
        let attempts = 0;
        const maxAttempts = 25;
        
        let lastObjectX = 0;
        for (let obj of obstacles) {
            if (obj.x > lastObjectX) lastObjectX = obj.x;
        }
        for (let obj of flowers) {
            if (obj.x > lastObjectX) lastObjectX = obj.x;
        }
        
        if (lastObjectX > 0 && position <= lastObjectX + 150) {
            position = lastObjectX + 160;
        }
        
        while (attempts < maxAttempts) {
            if (isValidDistance(position, 150, 200)) return position;
            position += 10;
            attempts++;
        }
        
        if (lastObjectX > 0) return Math.max(position, lastObjectX + 165);
        return position;
    }

    function spawnObjectAt(position) {
        let spawnType;
        
        if (lastSpawnType === null) {
            spawnType = Math.random() < 0.5 ? 'flower' : 'stone';
        } else {
            if (consecutiveCount >= 2) {
                spawnType = lastSpawnType === 'flower' ? 'stone' : 'flower';
            } else {
                if (Math.random() < 0.35) {
                    spawnType = lastSpawnType === 'flower' ? 'stone' : 'flower';
                } else {
                    spawnType = lastSpawnType;
                }
            }
        }
        
        if (spawnType === lastSpawnType) {
            consecutiveCount++;
        } else {
            consecutiveCount = 1;
            lastSpawnType = spawnType;
        }
        
        const optimalPosition = findOptimalSpawnPosition(position);
        
        if (spawnType === 'flower') {
            flowers.push({
                x: optimalPosition,
                y: GROUND_Y - 40,
                width: 40,
                height: 40
            });
        } else {
            obstacles.push({
                x: optimalPosition,
                y: GROUND_Y - 38,
                width: 38,
                height: 38
            });
        }
        
        totalSpawnedObjects++;
        const distance = 155 + Math.random() * 35;
        nextSpawnX = optimalPosition + distance;
    }

    function checkAndSpawnObjects() {
        let farthestX = 0;
        for (let obj of obstacles) {
            if (obj.x > farthestX) farthestX = obj.x;
        }
        for (let obj of flowers) {
            if (obj.x > farthestX) farthestX = obj.x;
        }
        
        if (farthestX === 0) {
            nextSpawnX = Math.max(nextSpawnX, W + 50);
            spawnObjectAt(nextSpawnX);
            return;
        }
        
        const distanceToEdge = (W + 100) - farthestX;
        
        if (distanceToEdge < 250) {
            const newPosition = Math.max(nextSpawnX, farthestX + 155);
            if (newPosition <= farthestX + 200) {
                spawnObjectAt(newPosition);
            } else if (newPosition > farthestX + 200) {
                const adjustedPosition = farthestX + 170 + Math.random() * 20;
                spawnObjectAt(adjustedPosition);
            }
        }
        
        if (totalSpawnedObjects < MIN_OBJECTS_TO_SPAWN && timeLeft > 5) {
            const lastPosition = farthestX;
            if (lastPosition < W + 400) {
                const newPosition = lastPosition + 165;
                spawnObjectAt(newPosition);
            }
        }
        
        if (obstacles.length + flowers.length < 3) {
            const lastPosition = farthestX > 0 ? farthestX : W + 50;
            const newPosition = lastPosition + 165;
            spawnObjectAt(newPosition);
        }
    }

    function checkCollisionWithStone(stone) {
        const playerLeft = player.x;
        const playerRight = player.x + player.width;
        const playerTop = player.y;
        const playerBottom = player.y + player.height;
        
        const stoneLeft = stone.x;
        const stoneRight = stone.x + stone.width;
        const stoneTop = stone.y;
        const stoneBottom = stone.y + stone.height;
        
        const horizontalCollision = playerLeft < stoneRight && playerRight > stoneLeft;
        
        if (!horizontalCollision) return false;
        
        if (playerBottom <= stoneTop + 10) {
            if (!player.grounded && player.vy < 0) return false;
            return false;
        }
        
        if (player.vy > 0 && playerBottom > stoneTop && playerTop < stoneTop) return true;
        if (player.grounded && playerBottom > stoneTop + 15) return true;
        if (!player.grounded && playerTop + player.height/2 < stoneTop) return false;
        if (!player.grounded && playerBottom < stoneBottom && player.vy < 0) return false;
        
        const verticalCollision = playerBottom > stoneTop && playerTop < stoneBottom;
        
        if (verticalCollision) {
            if (playerBottom - stoneTop < 15 && player.vy < 0) return false;
            return true;
        }
        
        return false;
    }

    function updateWorld() {
        if (!gameActive) return;

        for (let i = 0; i < obstacles.length; i++) obstacles[i].x -= worldSpeed;
        for (let i = 0; i < flowers.length; i++) flowers[i].x -= worldSpeed;

        obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
        flowers = flowers.filter(fl => fl.x + fl.width > 0);

        checkAndSpawnObjects();

        player.vy += player.gravity;
        player.y += player.vy;
        
        if (player.y >= GROUND_Y - player.height) {
            player.y = GROUND_Y - player.height;
            player.vy = 0;
            player.grounded = true;
        } else {
            player.grounded = false;
        }

        for (let i = 0; i < flowers.length; i++) {
            const f = flowers[i];
            if (player.x < f.x + f.width && player.x + player.width > f.x &&
                player.y < f.y + f.height && player.y + player.height > f.y) {
                score++;
                flowers.splice(i,1);
                i--;
            }
        }

        for (let i = 0; i < obstacles.length; i++) {
            const stone = obstacles[i];
            if (checkCollisionWithStone(stone)) {
                gameActive = false;
                endGame();
                return;
            }
        }
    }

    function endGame() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        addScoreToLeaderboard(playerName, score);
        updateLeaderboardUI();
        showGameOverScreen();
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!gameActive) return;
            if (timeLeft <= 0.01) {
                clearInterval(timerInterval);
                timerInterval = null;
                gameActive = false;
                addScoreToLeaderboard(playerName, score);
                updateLeaderboardUI();
                showGameOverScreen();
            } else {
                timeLeft = Math.max(0, timeLeft - 0.1);
            }
        }, 100);
    }

    
    function drawPlayer() {
        if (!useFallbackGraphics && images.player.complete && images.player.src) {
            if (!player.grounded && images.playerJump.complete && images.playerJump.src) {
                ctx.drawImage(images.playerJump, player.x, player.y, player.width, player.height);
            } else {
                ctx.drawImage(images.player, player.x, player.y, player.width, player.height);
            }
        } else {
            ctx.fillStyle = "#61c0ff";
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(player.x+8, player.y+10, 8, 8);
            ctx.fillRect(player.x+player.width-16, player.y+10, 8, 8);
            ctx.fillStyle = "#2c1c0c";
            ctx.fillRect(player.x+player.width/2-4, player.y+player.height-12, 8, 8);
            ctx.fillStyle = "#ffaa44";
            ctx.fillRect(player.x+player.width/2-6, player.y+player.height-8, 12, 6);
            
            if (!player.grounded) {
                ctx.fillStyle = "rgba(255,255,255,0.3)";
                ctx.beginPath();
                ctx.moveTo(player.x+player.width/2-10, player.y+player.height);
                ctx.lineTo(player.x+player.width/2, player.y+player.height+15);
                ctx.lineTo(player.x+player.width/2+10, player.y+player.height);
                ctx.fill();
            }
        }
    }
    
    function drawFlower(x, y, width, height) {
        if (!useFallbackGraphics && images.flower.complete && images.flower.src) {
            ctx.drawImage(images.flower, x, y, width, height);
        } else {
            ctx.fillStyle = "#4caf50";
            ctx.fillRect(x+width/2-3, y+height-15, 6, 15);
            ctx.fillStyle = "#f7d44a";
            ctx.fillRect(x, y, width, height);
            ctx.fillStyle = "#e86f2c";
            ctx.beginPath();
            ctx.arc(x+width/2, y-6, 9, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "#f9e05e";
            ctx.beginPath();
            ctx.arc(x+width/2, y-6, 5, 0, Math.PI*2);
            ctx.fill();
        }
    }
    
    function drawStone(x, y, width, height) {
        if (!useFallbackGraphics && images.stone.complete && images.stone.src) {
            ctx.drawImage(images.stone, x, y, width, height);
        } else {
            ctx.fillStyle = "#5a4a3a";
            ctx.beginPath();
            ctx.ellipse(x+width/2, y+height-8, width/2, 12, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "#3e2e22";
            ctx.fillRect(x+5, y+5, width-10, height-8);
            ctx.fillStyle = "#897a64";
            ctx.fillRect(x+8, y+14, 6, 8);
        }
    }

    function draw() {
    ctx.clearRect(0, 0, W, H);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#bfe9ff");
    sky.addColorStop(0.55, "#e8fbff");
    sky.addColorStop(1, "#d9f7d2");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.ellipse(150, 90, 55, 35, 0, 0, Math.PI * 2);
    ctx.ellipse(210, 85, 48, 30, 0, 0, Math.PI * 2);
    ctx.ellipse(95, 85, 42, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(900, 125, 60, 38, 0, 0, Math.PI * 2);
    ctx.ellipse(965, 120, 50, 32, 0, 0, Math.PI * 2);
    ctx.ellipse(845, 120, 45, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8ed081";
    ctx.fillRect(0, Math.floor(GROUND_Y * 0.55), W, Math.floor(GROUND_Y * 0.45));

    ctx.fillStyle = "#5fbf5a";
    ctx.fillRect(0, GROUND_Y - 18, W, H - (GROUND_Y - 18));

    ctx.fillStyle = "rgba(20, 70, 20, 0.35)";
    ctx.fillRect(0, GROUND_Y - 18, W, 4);

    ctx.strokeStyle = "rgba(20, 90, 20, 0.25)";
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 14) {
        const h = 6 + (x % 5);
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y - 2);
        ctx.lineTo(x + 2, GROUND_Y - 2 - h);
        ctx.stroke();
    }

    for (let i = 0; i < 45; i++) {
        const x = (i * 97 + (Date.now() * 0.02)) % W;
        const y = GROUND_Y + 30 + (i * 13) % (H - GROUND_Y - 40);
        ctx.fillStyle = "rgba(255, 240, 120, 0.35)";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let f of flowers) {
        drawFlower(f.x, f.y, f.width, f.height);
    }
    for (let s of obstacles) {
        drawStone(s.x, s.y, s.width, s.height);
    }

    drawPlayer();

    ctx.font = "bold 32px 'Segoe UI', monospace";
    ctx.fillStyle = "#173016";
    ctx.fillText("🌸 " + score, 30, 70);
    ctx.fillStyle = "#fff6d8";
    ctx.fillText("🌸 " + score, 28, 68);

    const seconds = Math.ceil(timeLeft);
    ctx.fillStyle = "#173016";
    ctx.fillText(`⏱️ ${seconds}s`, W - 160, 70);
    ctx.fillStyle = "#fff6d8";
    ctx.fillText(`⏱️ ${seconds}s`, W - 162, 68);

    const timePercent = timeLeft / 45;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(W - 250, 85, 200, 15);
    ctx.fillStyle = timePercent > 0.5 ? "#4caf50" : (timePercent > 0.25 ? "#ff9800" : "#f44336");
    ctx.fillRect(W - 250, 85, 200 * timePercent, 15);

    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Объектов: ${totalSpawnedObjects}`, W - 140, 130);

    if (!gameActive && currentScreen === "game") {
        ctx.font = "bold 48px monospace";
        ctx.fillStyle = "#c02a1c";
        ctx.fillText("☠️ CRASH! ☠️", W / 2 - 140, H / 2);
    }
}

    function gameLoop() {
        if (currentScreen === 'game') {
            if (gameActive) {
                updateWorld();
            }
            draw();
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    function handleJump(e) {
        if (e.code === 'Space' && currentScreen === 'game' && gameActive) {
            e.preventDefault();
            if (player.grounded) {
                player.vy = player.jumpPower;
                player.grounded = false;
                playSound(soundJump);
            }
        }
    }

    function startGameSession() {
        playerName = playerNameInput.value.trim();
        if (playerName === "") playerName = "Explorer";
        
        resetGameVariables();
        gameActive = true;
        currentScreen = 'game';
        
        nextSpawnX = W + 50;
        for(let i = 0; i < 4; i++) {
            spawnObjectAt(nextSpawnX);
        }
        
        mainMenuScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        
        if (timerInterval) clearInterval(timerInterval);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        if (soundEnabled) {
            soundFone.currentTime = 0;
            soundFone.play().catch(e => console.log("Ошибка воспроизведения фоновой музыки:", e));
        }
        
        startTimer();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function showGameOverScreen() {
        currentScreen = 'gameover';
        
        stopBackgroundMusic();
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        mainMenuScreen.style.display = 'none';
        gameOverScreen.style.display = 'flex';
        drawStaticBackground();
    }

    function drawStaticBackground() {
        ctx.clearRect(0,0,W,H);
        ctx.fillStyle = "#7faa5f";
        ctx.fillRect(0,0,W,H);
        ctx.fillStyle = "#dfb87a";
        ctx.fillRect(0, GROUND_Y, W, H-GROUND_Y);
        ctx.font = "36px monospace";
        ctx.fillStyle = "#ffebaa";
        ctx.fillText("🌸 FLOWERS & STONES", W/2-200, H/2);
    }

    function updateLeaderboardUI() {
        const container = document.getElementById('leaderboardDiv');
        let html = `<strong>🏆 TOP 10 FLOWER MASTERS 🏆</strong><ol style="margin-top:8px;">`;
        leaderboard.slice(0,10).forEach(entry => {
            html += `<li>🌸 ${entry.name}  —  ✨${entry.flowers} цветов</li>`;
        });
        html += `</ol><div style="margin-top:12px;">🏅 Ваш результат: ${score} цветов 🎉</div>`;
        container.innerHTML = html;
    }

    function restartGame() {
        startGameSession();
    }

    function backToMenu() {
        currentScreen = 'menu';
        
        stopBackgroundMusic();
        
        if (timerInterval) clearInterval(timerInterval);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        timerInterval = null;
        animationFrameId = null;
        
        mainMenuScreen.style.display = 'flex';
        gameOverScreen.style.display = 'none';
        drawStaticBackground();
    }

    async function init() {
        await loadAssets();
        loadLeaderboard();
        initSoundSettings();
        backToMenu();
        
        startBtn.addEventListener('click', () => {
            playSound(soundButton); 
            startGameSession();
        });
        
        restartBtn.addEventListener('click', () => {
            playSound(soundButton); 
            restartGame();
        });
        
        menuBtn.addEventListener('click', () => {
            playSound(soundButton); 
            backToMenu();
        });
        
        window.addEventListener('keydown', handleJump);
        
        window.addEventListener('keydown', function(e) {
            if (e.code === 'Space' && currentScreen === 'game') {
                e.preventDefault();
            }
        });
    }
    
    init();
})();