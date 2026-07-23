class TextureManager {
    constructor() {
        this.loader = new THREE.TextureLoader();
        this.loader.setCrossOrigin('anonymous');
        this.textures = {};
    }

    loadAll(onProgress, onComplete) {
        const assetsList = [
            { id: 'wall_yellow', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/wall_yellow.png' },
            { id: 'carpet', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/carpet.png' },
            { id: 'ceiling', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/ceiling.png' },
            { id: 'tiles_pool', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/tiles_pool.png' },
            { id: 'wall_red', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/wall_red.png' },
            { id: 'door', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/door.png' },
            { id: 'key', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/key.png' },
            { id: 'durov', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/durov.png' },
            { id: 'stamina_boost', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/stamina_boost.png' },
            { id: 'toncoin', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/toncoin.png' },
            { id: 'hamster', url: 'https://raw.githubusercontent.com/mdijszfoksznuf/img/main/hamster.png' }
        ];

        let loadedCount = 0;
        const total = assetsList.length;

        assetsList.forEach(asset => {
            this.loader.load(
                asset.url,
                (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    this.textures[asset.id] = texture;

                    loadedCount++;
                    if (onProgress) onProgress(loadedCount / total);
                    if (loadedCount === total && onComplete) onComplete();
                },
                undefined,
                (err) => {
                    console.warn(`Failed to load ${asset.url}, using procedural fallback.`, err);
                    this.textures[asset.id] = this.createFallbackTexture(asset.id);
                    loadedCount++;
                    if (onProgress) onProgress(loadedCount / total);
                    if (loadedCount === total && onComplete) onComplete();
                }
            );
        });
    }

    get(id) {
        return this.textures[id] || this.createFallbackTexture(id);
    }

    createFallbackTexture(id) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        if (id.includes('yellow')) {
            ctx.fillStyle = '#d7c36e';
            ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = '#b9a550';
            ctx.lineWidth = 4;
            for (let i = 0; i < 256; i += 32) {
                ctx.strokeRect(i, i, 32, 32);
            }
        } else if (id.includes('pool')) {
            ctx.fillStyle = '#a0e1f0';
            ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = '#60b0d0';
            ctx.lineWidth = 3;
            for (let i = 0; i < 256; i += 32) {
                ctx.strokeRect(i, 0, 32, 256);
                ctx.strokeRect(0, i, 256, 32);
            }
        } else if (id.includes('red')) {
            ctx.fillStyle = '#801414';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#a02020';
            for (let i = 0; i < 256; i += 16) {
                ctx.fillRect(0, i, 256, 4);
            }
        } else if (id === 'carpet') {
            ctx.fillStyle = '#8c7d5f';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#6e6146';
            for (let i = 0; i < 500; i++) {
                ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
            }
        } else if (id === 'ceiling') {
            ctx.fillStyle = '#c8c8c3';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#fffffa';
            ctx.fillRect(64, 64, 128, 128);
            ctx.strokeRect(64, 64, 128, 128);
        } else {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#000000';
            ctx.fillText(id, 20, 120);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
}

window.textureManager = new TextureManager();
