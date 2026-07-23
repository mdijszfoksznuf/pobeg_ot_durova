class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.canvas = document.getElementById('canvas3d');

        this.currentLevelIdx = 0;
        this.state = 'MENU';

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.player = new PlayerController(this.camera, document.body);
        this.scene.add(this.camera);

        this.wallBoxes = [];
        this.levelGroup = new THREE.Group();
        this.scene.add(this.levelGroup);

        this.keyObject = null;
        this.doorObject = null;
        this.voidDoorObject = null;
        this.staminaBoosts = [];
        this.weaponPickups = [];
        this.flickeringLights = [];
        this.enemy = null;
        this.boss = null;

        this.raycaster = new THREE.Raycaster();
        this.clock = new THREE.Clock();

        this.initUI();
        this.initResize();
    }

    initUI() {
        document.getElementById('start-btn').addEventListener('click', () => {
            window.soundManager.init();
            this.startGame();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.hideJumpscare();
            this.loadLevel(this.currentLevelIdx);
            this.state = 'PLAYING';
            this.player.requestPointerLock();
        });

        document.getElementById('next-level-btn').addEventListener('click', () => {
            document.getElementById('win-screen').classList.add('hidden');
            if (this.currentLevelIdx < window.LEVEL_DATA.length - 1) {
                this.loadLevel(this.currentLevelIdx + 1);
                this.state = 'PLAYING';
                this.player.requestPointerLock();
            } else {
                this.showVictoryScreen();
            }
        });

        document.getElementById('restart-game-btn').addEventListener('click', () => {
            document.getElementById('victory-screen').classList.add('hidden');
            this.loadLevel(0);
            this.state = 'PLAYING';
            this.player.requestPointerLock();
        });

        const whiteoutBtn = document.getElementById('whiteout-restart-btn');
        if (whiteoutBtn) {
            whiteoutBtn.addEventListener('click', () => {
                document.getElementById('whiteout-screen').classList.add('hidden');
                this.loadLevel(0);
                this.state = 'PLAYING';
                this.player.requestPointerLock();
            });
        }
    }

    initResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    startGame() {
        document.getElementById('start-screen').classList.add('hidden');
        window.textureManager.loadAll(
            (progress) => {},
            () => {
                this.loadLevel(0);
                this.state = 'PLAYING';
                this.player.requestPointerLock();
                this.animate();
            }
        );
    }

    loadLevel(levelIdx) {
        this.currentLevelIdx = levelIdx;
        const levelData = window.LEVEL_DATA[levelIdx];

        while (this.levelGroup.children.length > 0) {
            const obj = this.levelGroup.children[0];
            this.levelGroup.remove(obj);
        }
        this.wallBoxes = [];
        this.staminaBoosts = [];
        this.weaponPickups = [];
        this.flickeringLights = [];
        this.voidDoorObject = null;

        if (this.enemy) {
            this.enemy.destroy();
            this.enemy = null;
        }

        if (this.boss) {
            this.boss.destroy();
            this.boss = null;
        }

        const bossHud = document.getElementById('boss-hud');
        if (bossHud) bossHud.classList.add('hidden');

        this.scene.background = new THREE.Color(levelData.fogColor);
        this.scene.fog = new THREE.FogExp2(levelData.fogColor, levelData.fogDensity);

        const ambientLight = new THREE.AmbientLight(levelData.lightColor, levelData.lightIntensity);
        this.levelGroup.add(ambientLight);

        if (levelData.isBossLevel) {
            const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
            sunLight.position.set(20, 40, 20);
            this.levelGroup.add(sunLight);
        }

        const wallTex = window.textureManager.get(levelData.wallTexture);
        const floorTex = window.textureManager.get(levelData.floorTexture);
        const ceilingTex = window.textureManager.get(levelData.ceilingTexture);
        const doorTex = window.textureManager.get('door');
        const keyTex = window.textureManager.get('key');
        const boostTex = window.textureManager.get('stamina_boost');

        wallTex.repeat.set(1, 1);
        floorTex.repeat.set(15, 15);
        ceilingTex.repeat.set(15, 15);

        const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8 });
        const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 });
        const ceilingMat = new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.5 });

        const cellSize = 3.5;
        const wallHeight = 3.5;

        let spawnPos = new THREE.Vector3(cellSize * 1.5, 1.7, cellSize * 1.5);
        let enemySpawnPos = new THREE.Vector3(cellSize * 5.5, 1.2, cellSize * 5.5);

        const grid = levelData.grid;
        const rows = grid.length;
        const cols = grid[0].length;

        const floorGeo = new THREE.PlaneGeometry(cols * cellSize, rows * cellSize);
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.set((cols * cellSize) / 2, 0, (rows * cellSize) / 2);
        this.levelGroup.add(floorMesh);

        if (!levelData.isBossLevel) {
            const ceilingMesh = new THREE.Mesh(floorGeo, ceilingMat);
            ceilingMesh.rotation.x = Math.PI / 2;
            ceilingMesh.position.set((cols * cellSize) / 2, wallHeight, (rows * cellSize) / 2);
            this.levelGroup.add(ceilingMesh);
        }

        const boxGeo = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const type = grid[r][c];
                const x = c * cellSize + cellSize / 2;
                const z = r * cellSize + cellSize / 2;

                if (type === 1) {
                    const wallMesh = new THREE.Mesh(boxGeo, wallMat);
                    wallMesh.position.set(x, wallHeight / 2, z);
                    this.levelGroup.add(wallMesh);

                    const box = new THREE.Box3().setFromObject(wallMesh);
                    this.wallBoxes.push(box);
                } else {
                    if (type === 2) {
                        const keyMat = new THREE.SpriteMaterial({ map: keyTex, transparent: true });
                        this.keyObject = new THREE.Sprite(keyMat);
                        this.keyObject.scale.set(1.2, 1.2, 1.0);
                        this.keyObject.position.set(x, 1.2, z);
                        this.levelGroup.add(this.keyObject);
                    } else if (type === 3) {
                        const doorGeo = new THREE.BoxGeometry(cellSize * 0.9, 3.5 * 0.95, 0.2);
                        const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.5 });
                        this.doorObject = new THREE.Mesh(doorGeo, doorMat);
                        this.doorObject.position.set(x, 1.75, z);
                        this.levelGroup.add(this.doorObject);
                    } else if (type === 4) {
                        enemySpawnPos.set(x, 1.2, z);
                    } else if (type === 5) {
                        const boostMat = new THREE.SpriteMaterial({ map: boostTex, transparent: true });
                        const boostSprite = new THREE.Sprite(boostMat);
                        boostSprite.scale.set(1.0, 1.0, 1.0);
                        boostSprite.position.set(x, 1.0, z);
                        this.levelGroup.add(boostSprite);
                        this.staminaBoosts.push(boostSprite);
                    } else if (type === 6) {
                        const gunGroup = new THREE.Group();
                        const gMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.9 });
                        const bodyGeo = new THREE.BoxGeometry(0.3, 0.35, 1.0);
                        const bodyMesh = new THREE.Mesh(bodyGeo, gMat);
                        gunGroup.add(bodyMesh);
                        gunGroup.position.set(x, 1.0, z);
                        this.levelGroup.add(gunGroup);
                        this.weaponPickups.push(gunGroup);
                    }
                }
            }
        }

        this.player.reset(spawnPos);

        if (levelData.isBossLevel) {
            this.player.hasWeapon = false;
            if (this.player.weaponGroup) this.player.weaponGroup.visible = false;

            const centerC = Math.floor(cols / 2);
            const centerR = Math.floor(rows / 2);
            const pyramidCenterX = centerC * cellSize + cellSize / 2;
            const pyramidCenterZ = centerR * cellSize + cellSize / 2;

            const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
            
            const tier1Geo = new THREE.BoxGeometry(cellSize * 4, 1.0, cellSize * 4);
            const tier1Mesh = new THREE.Mesh(tier1Geo, goldMat);
            tier1Mesh.position.set(pyramidCenterX, 0.5, pyramidCenterZ);
            this.levelGroup.add(tier1Mesh);

            const tier2Geo = new THREE.BoxGeometry(cellSize * 2.5, 1.0, cellSize * 2.5);
            const tier2Mesh = new THREE.Mesh(tier2Geo, goldMat);
            tier2Mesh.position.set(pyramidCenterX, 1.5, pyramidCenterZ);
            this.levelGroup.add(tier2Mesh);

            const tier3Geo = new THREE.BoxGeometry(cellSize * 1.2, 1.0, cellSize * 1.2);
            const tier3Mesh = new THREE.Mesh(tier3Geo, goldMat);
            tier3Mesh.position.set(pyramidCenterX, 2.5, pyramidCenterZ);
            this.levelGroup.add(tier3Mesh);

            const stepHeights = [0.4, 0.8, 1.2, 1.6];
            for (let i = 0; i < stepHeights.length; i++) {
                const sGeo = new THREE.BoxGeometry(4.0, stepHeights[i], 1.2);
                const sMesh = new THREE.Mesh(sGeo, goldMat);
                sMesh.position.set(pyramidCenterX, stepHeights[i] / 2, pyramidCenterZ + 5.0 - i * 1.1);
                this.levelGroup.add(sMesh);
            }

            this.bossPyramidPos = new THREE.Vector3(pyramidCenterX, 2.5, pyramidCenterZ);
            this.boss = new BossDurov(this.scene, this.bossPyramidPos);

            setTimeout(() => {
                this.showToastNotification("FIND THE 3D BLASTER 🔫 TO FIGHT PAVEL DUROV!");
            }, 600);
        } else {
            this.player.hasWeapon = false;
            if (this.player.weaponGroup) this.player.weaponGroup.visible = false;

            this.enemy = new BrainrotEnemy(
                this.scene,
                levelData.enemyType,
                levelData.enemyName,
                levelData.enemySpeed,
                enemySpawnPos
            );
        }

        document.getElementById('level-title').textContent = levelData.name;
        document.getElementById('level-desc').textContent = levelData.subtitle;
        document.getElementById('key-slot').classList.remove('has-key');
        document.getElementById('key-slot').textContent = levelData.isBossLevel ? '🔫' : '🔒';
    }

    spawnVoidDoorOnPyramid() {
        if (!this.bossPyramidPos) return;

        const doorGeo = new THREE.BoxGeometry(2.6, 4.2, 0.3);
        const doorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.voidDoorObject = new THREE.Mesh(doorGeo, doorMat);
        this.voidDoorObject.position.set(this.bossPyramidPos.x, 4.8, this.bossPyramidPos.z);
        this.levelGroup.add(this.voidDoorObject);

        const voidLight = new THREE.PointLight(0xffffff, 8.0, 20);
        voidLight.position.set(this.bossPyramidPos.x, 5.8, this.bossPyramidPos.z);
        this.levelGroup.add(voidLight);

        this.showToastNotification("✨ PAVEL DUROV IS DEFEATED! WALK UP THE STEPS TO THE WHITE VOID DOOR!");
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.1);
        const levelData = window.LEVEL_DATA[this.currentLevelIdx];

        if (this.state === 'PLAYING') {
            this.player.update(delta, this.wallBoxes, this.scene, levelData ? levelData.isBossLevel : false);

            const time = performance.now();
            if (this.keyObject) {
                this.keyObject.position.y = 1.2 + Math.sin(time * 0.003) * 0.15;
            }

            this.staminaBoosts.forEach((boost, idx) => {
                boost.position.y = 1.0 + Math.sin(time * 0.004 + idx) * 0.12;
            });

            this.weaponPickups.forEach((gun, idx) => {
                gun.rotation.y += delta * 2.0;
                gun.position.y = 1.0 + Math.sin(time * 0.004 + idx) * 0.15;
            });

            if (this.enemy) {
                const caught = this.enemy.update(delta, this.player.camera.position, this.wallBoxes, this.player.hasKey, levelData ? levelData.grid : null);
                if (caught) {
                    this.triggerJumpscare();
                }
            }

            if (this.boss) {
                const result = this.boss.update(delta, this.player.camera.position, this.player.projectiles, this.player);
                if (this.player.health <= 0) {
                    this.triggerJumpscare();
                }

                if (result.isDead) {
                    this.boss = null;
                    this.spawnVoidDoorOnPyramid();
                }
            }

            this.checkInteractions();

            document.getElementById('health-fill').style.width = `${Math.max(0, this.player.health)}%`;
            document.getElementById('stamina-fill').style.width = `${this.player.stamina}%`;

            const staminaFill = document.getElementById('stamina-fill');
            if (this.player.boostTimer > 0) {
                staminaFill.style.background = 'linear-gradient(90deg, #ffe600, #ffaa00)';
                staminaFill.style.boxShadow = '0 0 15px #ffe600';
            } else {
                staminaFill.style.background = 'linear-gradient(90deg, #33bbff, #00d2ff)';
                staminaFill.style.boxShadow = '0 0 10px rgba(0, 210, 255, 0.5)';
            }

            this.drawRadar();
        }

        this.renderer.render(this.scene, this.camera);
    }

    checkInteractions() {
        const prompt = document.getElementById('interact-prompt');

        let showPrompt = false;
        let promptText = "";

        if (this.state === 'PLAYING' && window.justClicked) {
            this.player.fireBlaster(this.scene);
        }

        for (let i = this.weaponPickups.length - 1; i >= 0; i--) {
            const gun = this.weaponPickups[i];
            const dist = this.player.camera.position.distanceTo(gun.position);
            if (dist < 2.5) {
                showPrompt = true;
                promptText = "[CLICK / F] Pick Up Laser Blaster 🔫";

                if (window.justClicked || window.fKeyPressed) {
                    this.player.hasWeapon = true;
                    if (this.player.weaponGroup) this.player.weaponGroup.visible = true;
                    this.levelGroup.remove(gun);
                    this.weaponPickups.splice(i, 1);
                    this.showToastNotification("🔫 BLASTER UNLOCKED! LEFT CLICK / F TO SHOOT!");
                    break;
                }
            }
        }

        for (let i = this.staminaBoosts.length - 1; i >= 0; i--) {
            const boost = this.staminaBoosts[i];
            const dist = this.player.camera.position.distanceTo(boost.position);
            if (dist < 2.2) {
                showPrompt = true;
                promptText = "[CLICK / F] Drink Energy Boost ⚡";

                if (window.justClicked || window.fKeyPressed) {
                    window.soundManager.playStaminaDrink();
                    this.player.boostTimer = 7.0;
                    this.levelGroup.remove(boost);
                    this.staminaBoosts.splice(i, 1);
                    this.showToastNotification("⚡ ENERGY DRINK ACTIVATED! SUPER SPEED 7 sec!");
                    break;
                }
            }
        }

        if (this.keyObject && !this.player.hasKey) {
            const distKey = this.player.camera.position.distanceTo(this.keyObject.position);
            if (distKey < 2.5) {
                showPrompt = true;
                promptText = "[CLICK / F] Grab Key 🔑";

                if (window.justClicked || window.fKeyPressed) {
                    this.player.hasKey = true;
                    window.soundManager.playKeyPickup();
                    this.scene.remove(this.keyObject);
                    this.keyObject = null;
                    document.getElementById('key-slot').classList.add('has-key');
                    document.getElementById('key-slot').textContent = '🔑';
                }
            }
        }

        if (this.doorObject) {
            const distDoor = this.player.camera.position.distanceTo(this.doorObject.position);
            if (distDoor < 3.0) {
                showPrompt = true;
                if (this.player.hasKey) {
                    promptText = "[CLICK / F] Open Exit Door 🚪";

                    if (window.justClicked || window.fKeyPressed) {
                        window.soundManager.playDoorUnlock();
                        this.showWinScreen();
                    }
                } else {
                    promptText = "Need Key 🔑!";
                }
            }
        }

        if (this.voidDoorObject) {
            const distVoid = this.player.camera.position.distanceTo(this.voidDoorObject.position);
            if (distVoid < 4.5) {
                showPrompt = true;
                promptText = "[CLICK / F] Enter White Void Door 🚪✨";

                if (window.justClicked || window.fKeyPressed) {
                    this.showWhiteoutScreen();
                }
            }
        }

        window.justClicked = false;
        window.fKeyPressed = false;

        if (showPrompt) {
            prompt.style.display = 'block';
            prompt.textContent = promptText;
        } else {
            prompt.style.display = 'none';
        }
    }

    showToastNotification(message) {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.classList.add('show');
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    drawRadar() {
        const canvas = document.getElementById('radarCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = cx - 4;

        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(5, 12, 22, 0.85)';
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 1;
        [20, 40, 60].forEach(r => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.beginPath();
        ctx.moveTo(cx - maxRadius, cy); ctx.lineTo(cx + maxRadius, cy);
        ctx.moveTo(cx, cy - maxRadius); ctx.lineTo(cx, cy + maxRadius);
        ctx.stroke();

        const scale = 2.8;
        const playerPos = this.player.camera.position;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius - 2, 0, Math.PI * 2);
        ctx.clip();

        const levelData = window.LEVEL_DATA[this.currentLevelIdx];
        if (levelData && levelData.grid) {
            const grid = levelData.grid;
            const cellSize = 3.5;
            const sizeOnRadar = cellSize * scale;

            ctx.fillStyle = 'rgba(0, 150, 220, 0.4)';
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
            ctx.lineWidth = 1;

            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c] === 1) {
                        const wx = c * cellSize + cellSize / 2;
                        const wz = r * cellSize + cellSize / 2;

                        const dx = wx - playerPos.x;
                        const dz = wz - playerPos.z;
                        const rx = cx + dx * scale;
                        const ry = cy + dz * scale;

                        ctx.fillRect(rx - sizeOnRadar / 2, ry - sizeOnRadar / 2, sizeOnRadar, sizeOnRadar);
                        ctx.strokeRect(rx - sizeOnRadar / 2, ry - sizeOnRadar / 2, sizeOnRadar, sizeOnRadar);
                    }
                }
            }
        }
        ctx.restore();

        const worldToRadar = (worldPos) => {
            const dx = worldPos.x - playerPos.x;
            const dz = worldPos.z - playerPos.z;
            const rx = cx + dx * scale;
            const ry = cy + dz * scale;
            const distFromCenter = Math.hypot(rx - cx, ry - cy);
            return { rx, ry, inBounds: distFromCenter <= maxRadius - 4 };
        };

        if (this.enemy && this.enemy.sprite) {
            const pt = worldToRadar(this.enemy.sprite.position);
            if (pt.inBounds) {
                const pulse = Math.sin(performance.now() * 0.012) * 2;
                ctx.fillStyle = '#ff0044';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(pt.rx, pt.ry, 5 + Math.max(0, pulse), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (this.boss && this.boss.sprite) {
            const pt = worldToRadar(this.boss.sprite.position);
            if (pt.inBounds) {
                ctx.fillStyle = '#ff0055';
                ctx.shadowColor = '#ff0055';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(pt.rx, pt.ry, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-this.player.yaw);
        ctx.fillStyle = '#00ffaa';
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-4, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    triggerJumpscare() {
        this.state = 'JUMPSCARE';
        this.player.unlockPointerLock();
        window.soundManager.playJumpscare();

        const jumpscareScreen = document.getElementById('jumpscare-screen');
        const jumpscareImg = document.getElementById('jumpscare-img');
        const jumpscareText = document.getElementById('jumpscare-text');

        const enemyType = window.LEVEL_DATA[this.currentLevelIdx].enemyType;
        const imgName = enemyType.includes('boss') ? 'durov' : enemyType;
        jumpscareImg.src = `https://raw.githubusercontent.com/mdijszfoksznuf/img/main/${imgName}.png`;
        jumpscareText.textContent = `${window.LEVEL_DATA[this.currentLevelIdx].enemyName} CAUGHT YOU!`;

        jumpscareScreen.classList.remove('hidden');
    }

    hideJumpscare() {
        document.getElementById('jumpscare-screen').classList.add('hidden');
    }

    showWinScreen() {
        this.state = 'LEVEL_WIN';
        this.player.unlockPointerLock();
        document.getElementById('win-screen').classList.remove('hidden');
    }

    showVictoryScreen() {
        this.state = 'GAME_WIN';
        this.player.unlockPointerLock();
        document.getElementById('victory-screen').classList.remove('hidden');
    }

    showWhiteoutScreen() {
        this.state = 'WHITEOUT';
        this.player.unlockPointerLock();
        document.getElementById('whiteout-screen').classList.remove('hidden');
    }
}

window.addEventListener('mousedown', (e) => {
    if (e.button === 0) window.justClicked = true;
});
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' || e.code === 'KeyE') window.fKeyPressed = true;
});

window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
