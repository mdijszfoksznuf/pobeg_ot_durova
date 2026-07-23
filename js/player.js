class PlayerController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.health = 100;
        this.stamina = 100;
        this.hasKey = false;
        this.hasWeapon = false;
        this.isLocked = false;
        this.isSprinting = false;
        this.noclip = false;

        this.velocity = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;

        this.walkSpeed = 5.5;
        this.sprintSpeed = 10.0;
        this.height = 1.7;

        this.posY = 1.7;
        this.velocityY = 0;
        this.gravity = 26.0;
        this.isGrounded = true;
        this.maxHeight = 2.95;

        this.pitch = 0;
        this.yaw = 0;
        this.targetPitch = 0;
        this.targetYaw = 0;
        this.roll = 0;
        this.targetRoll = 0;
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

        this.bobTimer = 0;
        this.bobAmountY = 0;
        this.bobAmountX = 0;

        this.baseFov = 75;
        this.sprintFov = 87;

        this.radius = 0.45;

        this.flashlightGroup = new THREE.Group();
        this.flashlight = new THREE.SpotLight(0xfffae0, 3.2, 28, Math.PI / 5, 0.4, 1);
        this.flashlight.castShadow = true;
        this.flashlight.position.set(0.3, -0.25, -0.2);
        
        this.flashlightTarget = new THREE.Object3D();
        this.flashlightTarget.position.set(0, 0, -5);
        this.flashlightGroup.add(this.flashlight);
        this.flashlightGroup.add(this.flashlightTarget);
        this.flashlight.target = this.flashlightTarget;

        this.camera.add(this.flashlightGroup);
        this.flashlightOn = true;

        this.initWeaponModel();

        this.projectiles = [];
        this.lastFireTime = 0;
        this.recoilZ = 0;

        this.initEventListeners();
    }

    initWeaponModel() {
        this.weaponGroup = new THREE.Group();

        const metalMat = new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.3, metalness: 0.8 });
        const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

        const bodyGeo = new THREE.BoxGeometry(0.08, 0.10, 0.35);
        const bodyMesh = new THREE.Mesh(bodyGeo, metalMat);

        const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.38, 12);
        barrelGeo.rotateX(Math.PI / 2);
        const barrelMesh = new THREE.Mesh(barrelGeo, metalMat);
        barrelMesh.position.set(0, 0.02, -0.1);

        const coreGeo = new THREE.TorusGeometry(0.04, 0.012, 8, 16);
        const coreMesh = new THREE.Mesh(coreGeo, cyanGlowMat);
        coreMesh.position.set(0, 0.02, -0.05);

        const tipGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const tipMesh = new THREE.Mesh(tipGeo, cyanGlowMat);
        tipMesh.position.set(0, 0.02, -0.28);

        const handleGeo = new THREE.BoxGeometry(0.06, 0.16, 0.08);
        handleGeo.rotateX(-0.3);
        const handleMesh = new THREE.Mesh(handleGeo, metalMat);
        handleMesh.position.set(0, -0.09, 0.05);

        this.weaponGroup.add(bodyMesh);
        this.weaponGroup.add(barrelMesh);
        this.weaponGroup.add(coreMesh);
        this.weaponGroup.add(tipMesh);
        this.weaponGroup.add(handleMesh);

        this.weaponGroup.position.set(0.32, -0.24, -0.45);
        this.weaponGroup.visible = false;

        this.camera.add(this.weaponGroup);
    }

    initEventListeners() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        this.domElement.addEventListener('click', () => {
            if (!this.isLocked) {
                this.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        });
    }

    requestPointerLock() {
        this.domElement.requestPointerLock();
    }

    unlockPointerLock() {
        document.exitPointerLock();
    }

    onKeyDown(event) {
        if (!this.isLocked) return;
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
            case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
            case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
            case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
            case 'ShiftLeft': case 'ShiftRight': this.isSprinting = true; break;
            case 'Space': this.jump(); break;
            case 'KeyF': this.toggleFlashlight(); break;
            case 'KeyP': this.toggleNoclip(); break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
            case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
            case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
            case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
            case 'ShiftLeft': case 'ShiftRight': this.isSprinting = false; break;
        }
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.targetYaw -= movementX * 0.0022;
        this.targetPitch -= movementY * 0.0022;

        this.targetPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.targetPitch));
        this.targetRoll -= movementX * 0.0003;
    }

    toggleNoclip() {
        this.noclip = !this.noclip;
        if (window.game && window.game.showToastNotification) {
            window.game.showToastNotification(this.noclip ? "👻 NOCLIP MODE: ON (PASS THROUGH WALLS)" : "👻 NOCLIP MODE: OFF");
        }
    }

    jump() {
        if (this.isGrounded) {
            this.velocityY = 11.5;
            this.isGrounded = false;
        }
    }

    fireBlaster(scene) {
        if (!this.hasWeapon) return;
        if (performance.now() - this.lastFireTime < 220) return;
        this.lastFireTime = performance.now();

        this.recoilZ = 0.08;

        const geo = new THREE.SphereGeometry(0.18, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const mesh = new THREE.Mesh(geo, mat);

        const spawnPos = this.camera.position.clone();
        mesh.position.copy(spawnPos);

        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);
        dir.normalize();

        scene.add(mesh);

        this.projectiles.push({
            mesh: mesh,
            dir: dir,
            speed: 28.0,
            life: 2.5
        });

        if (window.soundManager && window.soundManager.ctx) {
            const osc = window.soundManager.ctx.createOscillator();
            const gain = window.soundManager.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, window.soundManager.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, window.soundManager.ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.2, window.soundManager.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, window.soundManager.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(window.soundManager.ctx.destination);
            osc.start();
            osc.stop(window.soundManager.ctx.currentTime + 0.13);
        }
    }

    toggleFlashlight() {
        this.flashlightOn = !this.flashlightOn;
        this.flashlight.intensity = this.flashlightOn ? 3.2 : 0;
    }

    reset(spawnPosition) {
        this.posY = this.height;
        this.velocityY = 0;
        this.isGrounded = true;
        this.noclip = false;
        this.hasWeapon = false;
        if (this.weaponGroup) this.weaponGroup.visible = false;
        this.camera.position.set(spawnPosition.x, this.height, spawnPosition.z);
        this.velocity.set(0, 0, 0);
        this.health = 100;
        this.stamina = 100;
        this.hasKey = false;
        this.pitch = 0;
        this.yaw = 0;
        this.targetPitch = 0;
        this.targetYaw = 0;
        this.roll = 0;
        this.targetRoll = 0;
        this.bobTimer = 0;
        this.euler.set(0, 0, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(this.euler);
    }

    update(delta, walls, scene, isBossLevel = false) {
        if (!this.isLocked) return;

        const moving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
        let speed = this.walkSpeed;

        if (this.boostTimer > 0) {
            this.boostTimer -= delta;
            this.stamina = 100;
            if (this.isSprinting && moving) {
                speed = 14.0;
            }
        } else {
            if (this.isSprinting && moving && this.stamina > 5) {
                speed = this.sprintSpeed;
                this.stamina = Math.max(0, this.stamina - delta * 30);
            } else {
                this.stamina = Math.min(100, this.stamina + delta * 20);
            }
        }

        const dir = new THREE.Vector3();
        if (this.moveForward) dir.z -= 1;
        if (this.moveBackward) dir.z += 1;
        if (this.moveLeft) dir.x -= 1;
        if (this.moveRight) dir.x += 1;
        dir.normalize();

        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        if (moving && this.isGrounded) {
            if (!this.lastStepTime) this.lastStepTime = 0;
            const stepInterval = (speed === this.sprintSpeed) ? 0.26 : 0.42;
            if (performance.now() - this.lastStepTime > stepInterval * 1000) {
                window.soundManager.playFootstep(speed === this.sprintSpeed);
                this.lastStepTime = performance.now();
            }
        }

        const targetVelocityX = dir.x * speed;
        const targetVelocityZ = dir.z * speed;
        this.velocity.x += (targetVelocityX - this.velocity.x) * Math.min(1, delta * 12);
        this.velocity.z += (targetVelocityZ - this.velocity.z) * Math.min(1, delta * 12);

        const newPosX = this.camera.position.x + this.velocity.x * delta;
        const newPosZ = this.camera.position.z + this.velocity.z * delta;

        if (!this.checkCollision(newPosX, this.camera.position.z, walls)) {
            this.camera.position.x = newPosX;
        } else {
            this.velocity.x = 0;
        }

        if (!this.checkCollision(this.camera.position.x, newPosZ, walls)) {
            this.camera.position.z = newPosZ;
        } else {
            this.velocity.z = 0;
        }

        if (!this.isGrounded) {
            this.velocityY -= this.gravity * delta;
            this.posY += this.velocityY * delta;

            if (!isBossLevel && !this.noclip && this.posY >= 2.95) {
                this.posY = 2.95;
                this.velocityY = 0;
            }

            if (this.posY <= this.height) {
                this.posY = this.height;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        }

        this.pitch += (this.targetPitch - this.pitch) * Math.min(1, delta * 25);
        this.yaw += (this.targetYaw - this.yaw) * Math.min(1, delta * 25);

        let strafeRoll = 0;
        if (this.moveLeft) strafeRoll += 0.035;
        if (this.moveRight) strafeRoll -= 0.035;
        this.targetRoll = strafeRoll;
        this.roll += (this.targetRoll - this.roll) * Math.min(1, delta * 10);

        this.euler.x = this.pitch;
        this.euler.y = this.yaw;
        this.euler.z = this.roll;
        this.camera.quaternion.setFromEuler(this.euler);

        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);

        if (currentSpeed > 0.5 && this.isGrounded) {
            const bobFrequency = (speed === this.sprintSpeed) ? 14 : 9.5;
            const bobHeight = (speed === this.sprintSpeed) ? 0.09 : 0.045;
            const bobWidth = (speed === this.sprintSpeed) ? 0.045 : 0.025;

            this.bobTimer += delta * bobFrequency;
            this.bobAmountY = Math.sin(this.bobTimer) * bobHeight;
            this.bobAmountX = Math.cos(this.bobTimer * 0.5) * bobWidth;
        } else if (this.isGrounded) {
            this.bobTimer += delta * 1.8;
            this.bobAmountY = Math.sin(this.bobTimer) * 0.015;
            this.bobAmountX = Math.cos(this.bobTimer * 0.5) * 0.008;
        } else {
            this.bobAmountY = 0;
            this.bobAmountX = 0;
        }

        this.camera.position.y = this.posY + this.bobAmountY;
        this.camera.position.x += this.bobAmountX * delta * 5;

        const targetFov = (speed === this.sprintSpeed && currentSpeed > 1) ? this.sprintFov : this.baseFov;
        if (Math.abs(this.camera.fov - targetFov) > 0.1) {
            this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, delta * 8);
            this.camera.updateProjectionMatrix();
        }

        if (this.weaponGroup && this.hasWeapon) {
            this.recoilZ += (0 - this.recoilZ) * Math.min(1, delta * 10);
            this.weaponGroup.position.z = -0.45 + this.recoilZ;
            this.weaponGroup.position.x = 0.32 + this.bobAmountX * 0.3;
            this.weaponGroup.position.y = -0.24 + this.bobAmountY * 0.3;
        }

        if (this.flashlightGroup) {
            this.flashlightGroup.rotation.x += (-this.bobAmountY * 0.5 - this.flashlightGroup.rotation.x) * Math.min(1, delta * 15);
            this.flashlightGroup.rotation.y += (-this.bobAmountX * 0.5 - this.flashlightGroup.rotation.y) * Math.min(1, delta * 15);
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= delta;
            p.mesh.position.addScaledVector(p.dir, p.speed * delta);
            if (p.life <= 0) {
                if (scene) scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }
    }

    checkCollision(px, pz, walls) {
        if (this.noclip) return false;

        for (let i = 0; i < walls.length; i++) {
            const wall = walls[i];
            const closestX = Math.max(wall.min.x, Math.min(px, wall.max.x));
            const closestZ = Math.max(wall.min.z, Math.min(pz, wall.max.z));

            const distX = px - closestX;
            const distZ = pz - closestZ;
            const distanceSquared = (distX * distX) + (distZ * distZ);

            if (distanceSquared < (this.radius * this.radius)) {
                return true;
            }
        }
        return false;
    }
}

window.PlayerController = PlayerController;
