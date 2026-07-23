class BrainrotEnemy {
    constructor(scene, enemyType, enemyName, speed, spawnPos) {
        this.scene = scene;
        this.type = enemyType;
        this.name = enemyName;
        this.baseSpeed = speed;

        const texture = window.textureManager.get(enemyType);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(2.4, 2.4, 1.0);
        this.sprite.position.copy(spawnPos);
        this.sprite.position.y = 1.2;

        this.scene.add(this.sprite);

        this.lastSoundTime = 0;
        this.isChasing = false;
        this.currentSpeed = this.baseSpeed;

        this.targetWorldPos = new THREE.Vector3().copy(spawnPos);
        this.lastCell = { r: -1, c: -1 };
        this.moveDir = new THREE.Vector3(1, 0, 0);
    }

    reset(spawnPos) {
        this.sprite.position.copy(spawnPos);
        this.sprite.position.y = 1.2;
        this.isChasing = false;
        this.targetWorldPos.copy(spawnPos);
        this.lastCell = { r: -1, c: -1 };
        this.currentSpeed = this.baseSpeed;
    }

    hasLineOfSight(playerPos, walls) {
        const fromPos = this.sprite.position;
        const samples = 10;
        for (let i = 1; i < samples; i++) {
            const t = i / samples;
            const sx = fromPos.x + (playerPos.x - fromPos.x) * t;
            const sz = fromPos.z + (playerPos.z - fromPos.z) * t;
            if (this.checkWallCollision(sx, sz, walls)) {
                return false;
            }
        }
        return true;
    }

    pickNextPatrolTarget(grid) {
        const cellSize = 3.5;
        const currC = Math.floor(this.sprite.position.x / cellSize);
        const currR = Math.floor(this.sprite.position.z / cellSize);

        if (!grid || currR < 0 || currR >= grid.length || currC < 0 || currC >= grid[0].length) {
            return;
        }

        const neighbors = [
            { r: currR - 1, c: currC, dir: new THREE.Vector3(0, 0, -1) },
            { r: currR + 1, c: currC, dir: new THREE.Vector3(0, 0, 1) },
            { r: currR, c: currC - 1, dir: new THREE.Vector3(-1, 0, 0) },
            { r: currR, c: currC + 1, dir: new THREE.Vector3(1, 0, 0) }
        ];

        let openDirs = neighbors.filter(n => 
            n.r >= 0 && n.r < grid.length && 
            n.c >= 0 && n.c < grid[0].length && 
            grid[n.r][n.c] !== 1
        );

        if (openDirs.length === 0) return;

        let forwardDirs = openDirs.filter(n => !(n.r === this.lastCell.r && n.c === this.lastCell.c));
        let chosen = (forwardDirs.length > 0) ? forwardDirs[Math.floor(Math.random() * forwardDirs.length)] 
                                              : openDirs[Math.floor(Math.random() * openDirs.length)];

        this.lastCell = { r: currR, c: currC };
        this.moveDir.copy(chosen.dir);
        this.targetWorldPos.set(chosen.c * cellSize + cellSize / 2, 1.2, chosen.r * cellSize + cellSize / 2);
    }

    update(delta, playerPos, walls, hasKey = false, grid = null) {
        if (!this.sprite) return;

        const distToPlayer = this.sprite.position.distanceTo(playerPos);
        const canSeePlayer = this.hasLineOfSight(playerPos, walls);

        if (distToPlayer < 12 && performance.now() - this.lastSoundTime > 3500) {
            window.soundManager.playEnemySound(this.type);
            this.lastSoundTime = performance.now();
        }

        if ((canSeePlayer && distToPlayer < 12.0) || hasKey) {
            this.isChasing = true;
        } else if (distToPlayer > 14.0 || (!canSeePlayer && distToPlayer > 8.0)) {
            this.isChasing = false;
        }

        let targetX = this.targetWorldPos.x;
        let targetZ = this.targetWorldPos.z;

        if (this.isChasing) {
            const targetSpeed = hasKey ? this.baseSpeed * 1.5 : this.baseSpeed * 1.35;
            this.currentSpeed += (targetSpeed - this.currentSpeed) * Math.min(1, delta * 5);
            targetX = playerPos.x;
            targetZ = playerPos.z;
        } else {
            const targetSpeed = this.baseSpeed * 0.9;
            this.currentSpeed += (targetSpeed - this.currentSpeed) * Math.min(1, delta * 3);

            const distToWaypoint = Math.hypot(this.sprite.position.x - this.targetWorldPos.x, this.sprite.position.z - this.targetWorldPos.z);
            if (distToWaypoint < 0.6 || performance.now() - (this.lastWaypointTime || 0) > 3000) {
                this.pickNextPatrolTarget(grid);
                this.lastWaypointTime = performance.now();
                targetX = this.targetWorldPos.x;
                targetZ = this.targetWorldPos.z;
            }
        }

        const dir = new THREE.Vector3(targetX - this.sprite.position.x, 0, targetZ - this.sprite.position.z);
        if (dir.lengthSq() > 0.001) {
            dir.normalize();
        }

        const moveAmount = this.currentSpeed * (1 + delta * 2);
        const newPosX = this.sprite.position.x + dir.x * moveAmount;
        const newPosZ = this.sprite.position.z + dir.z * moveAmount;

        let collidedX = this.checkWallCollision(newPosX, this.sprite.position.z, walls);
        let collidedZ = this.checkWallCollision(this.sprite.position.x, newPosZ, walls);

        if (!collidedX) {
            this.sprite.position.x = newPosX;
        } else if (!this.isChasing) {
            this.pickNextPatrolTarget(grid);
        }

        if (!collidedZ) {
            this.sprite.position.z = newPosZ;
        } else if (!this.isChasing) {
            this.pickNextPatrolTarget(grid);
        }

        if (collidedX && collidedZ && this.isChasing) {
            this.sprite.position.x += (Math.random() - 0.5) * 0.1;
            this.sprite.position.z += (Math.random() - 0.5) * 0.1;
        }

        const finalDist = this.sprite.position.distanceTo(playerPos);
        if (finalDist < 1.1) {
            return true;
        }

        return false;
    }

    checkWallCollision(px, pz, walls) {
        const radius = 0.5;
        for (let i = 0; i < walls.length; i++) {
            const wall = walls[i];
            const closestX = Math.max(wall.min.x, Math.min(px, wall.max.x));
            const closestZ = Math.max(wall.min.z, Math.min(pz, wall.max.z));

            const distX = px - closestX;
            const distZ = pz - closestZ;
            if ((distX * distX + distZ * distZ) < (radius * radius)) {
                return true;
            }
        }
        return false;
    }

    destroy() {
        if (this.sprite) {
            this.scene.remove(this.sprite);
            this.sprite = null;
        }
    }
}

class BossDurov {
    constructor(scene, pyramidCenterPos) {
        this.scene = scene;
        this.centerPos = pyramidCenterPos.clone();

        const texture = window.textureManager.get('durov');
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true
        });

        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(4.2, 4.2, 1.0);
        this.sprite.position.copy(this.centerPos);
        this.sprite.position.y = 5.2;

        this.scene.add(this.sprite);

        this.maxHp = 350;
        this.hp = 350;
        this.phase = 1;

        this.toncoins = [];
        this.hamsters = [];

        this.lastCoinTime = 0;
        this.lastHamsterWaveTime = 0;

        const bossHud = document.getElementById('boss-hud');
        if (bossHud) bossHud.classList.remove('hidden');
        this.updateHpBar();
    }

    updateHpBar() {
        const fill = document.getElementById('boss-hp-fill');
        const phaseText = document.getElementById('boss-phase-text');
        const pct = Math.max(0, (this.hp / this.maxHp) * 100);
        if (fill) fill.style.width = `${pct}%`;

        if (phaseText) {
            if (this.phase === 1) phaseText.textContent = `PHASE 1: TONCOIN ATTACK (${Math.ceil(this.hp)} HP)`;
            else phaseText.textContent = `PHASE 2: CEO HAMSTER INVASION (4 HAMSTERS / 5s) (${Math.ceil(this.hp)} HP)`;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 200 && this.phase === 1) {
            this.phase = 2;
        }
        this.updateHpBar();
    }

    spawnToncoin(playerPos) {
        const tonTex = window.textureManager.get('toncoin');
        const mat = new THREE.SpriteMaterial({ map: tonTex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.5, 1.5, 1.0);
        sprite.position.copy(this.sprite.position);

        const dir = new THREE.Vector3().subVectors(playerPos, sprite.position).normalize();

        this.scene.add(sprite);
        this.toncoins.push({
            sprite: sprite,
            dir: dir,
            speed: 13.0
        });
    }

    spawnHamsterWave(playerPos) {
        const hTex = window.textureManager.get('hamster');
        for (let i = 0; i < 4; i++) {
            const mat = new THREE.SpriteMaterial({ map: hTex, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(1.8, 1.8, 1.0);

            const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 5.0 + Math.random() * 2.0;
            sprite.position.set(this.centerPos.x + Math.cos(angle) * dist, 1.0, this.centerPos.z + Math.sin(angle) * dist);

            this.scene.add(sprite);
            this.hamsters.push({
                sprite: sprite,
                speed: 7.2
            });
        }
    }

    update(delta, playerPos, playerProjectiles, playerController) {
        if (this.hp <= 0) {
            this.destroy();
            return { isDead: true };
        }

        const time = performance.now();

        for (let i = playerProjectiles.length - 1; i >= 0; i--) {
            const proj = playerProjectiles[i];
            const dist = proj.mesh.position.distanceTo(this.sprite.position);
            if (dist < 2.8) {
                this.takeDamage(5.0);
                this.scene.remove(proj.mesh);
                playerProjectiles.splice(i, 1);
            }
        }

        const coinInterval = (this.phase === 2) ? 1200 : 1500;
        if (time - this.lastCoinTime > coinInterval) {
            this.spawnToncoin(playerPos);
            this.lastCoinTime = time;
        }

        if (this.phase === 2 && time - this.lastHamsterWaveTime > 5000 && this.hamsters.length < 12) {
            this.spawnHamsterWave(playerPos);
            this.lastHamsterWaveTime = time;
        }

        for (let i = this.toncoins.length - 1; i >= 0; i--) {
            const coin = this.toncoins[i];
            coin.sprite.position.addScaledVector(coin.dir, coin.speed * delta);

            const dist = coin.sprite.position.distanceTo(playerPos);
            if (dist < 1.4) {
                playerController.health -= 22;
                if (window.soundManager && window.soundManager.playFootstep) {
                    window.soundManager.playFootstep(true);
                }
                this.scene.remove(coin.sprite);
                this.toncoins.splice(i, 1);
            } else if (coin.sprite.position.distanceTo(this.centerPos) > 40) {
                this.scene.remove(coin.sprite);
                this.toncoins.splice(i, 1);
            }
        }

        for (let i = this.hamsters.length - 1; i >= 0; i--) {
            const h = this.hamsters[i];
            const dir = new THREE.Vector3().subVectors(playerPos, h.sprite.position);
            dir.y = 0;
            if (dir.lengthSq() > 0.001) dir.normalize();
            h.sprite.position.addScaledVector(dir, h.speed * delta);

            const dist = h.sprite.position.distanceTo(playerPos);
            if (dist < 1.2) {
                playerController.health -= 15 * delta;
            }
        }

        return { isDead: false };
    }

    destroy() {
        if (this.sprite) {
            this.scene.remove(this.sprite);
            this.sprite = null;
        }

        this.toncoins.forEach(c => this.scene.remove(c.sprite));
        this.hamsters.forEach(h => this.scene.remove(h.sprite));
        this.toncoins = [];
        this.hamsters = [];

        const bossHud = document.getElementById('boss-hud');
        if (bossHud) bossHud.classList.add('hidden');
    }
}

window.BrainrotEnemy = BrainrotEnemy;
window.BossDurov = BossDurov;
