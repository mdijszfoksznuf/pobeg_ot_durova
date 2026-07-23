const LEVEL_DATA = [
    {
        id: 0,
        name: "Level 0: The Yellow Rooms",
        subtitle: "Total darkness! Escape from Pavel Durov and find the Key 🔑!",
        wallTexture: 'wall_yellow',
        floorTexture: 'carpet',
        ceilingTexture: 'ceiling',
        fogColor: 0x000000,
        fogDensity: 0.10,
        lightColor: 0xfffae0,
        lightIntensity: 0.08,
        enemyType: 'durov',
        enemyName: 'Pavel Durov (Phase 1)',
        enemySpeed: 0.048,
        grid: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1, 0, 5, 0, 0, 0, 1, 0, 2, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 5, 0, 0, 1, 0, 0, 0, 1, 0, 4, 0, 0, 5, 1],
            [1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
            [1, 0, 1, 0, 5, 0, 0, 0, 0, 0, 1, 0, 0, 3, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
    },
    {
        id: 1,
        name: "Level 1: The Poolrooms",
        subtitle: "Pavel Durov is hunting you in the flooded pools! Collect Energy Drinks ⚡!",
        wallTexture: 'tiles_pool',
        floorTexture: 'tiles_pool',
        ceilingTexture: 'ceiling',
        fogColor: 0x000000,
        fogDensity: 0.20,
        lightColor: 0x80e5ff,
        lightIntensity: 0.08,
        enemyType: 'durov',
        enemyName: 'Pavel Durov (Phase 2)',
        enemySpeed: 0.048,
        grid: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 5, 0, 0, 0, 1, 2, 1, 0, 0, 5, 0, 0, 1],
            [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1, 4, 0, 0, 0, 0, 1, 0, 0, 0, 1],
            [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
            [1, 0, 5, 0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
    },
    {
        id: 2,
        name: "Level 2: Durov's Sky Island Arena",
        subtitle: "FINAL BOSS FIGHT! Find the 3D Blaster 🔫 and defeat Pavel Durov!",
        wallTexture: 'wall_red',
        floorTexture: 'tiles_pool',
        ceilingTexture: 'ceiling',
        fogColor: 0x120826,
        fogDensity: 0.003,
        lightColor: 0xffffff,
        lightIntensity: 0.65,
        enemyType: 'durov_boss',
        enemyName: 'Pavel Durov (Final Boss)',
        enemySpeed: 0.0,
        isBossLevel: true,
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0],
            [0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ]
    }
];

window.LEVEL_DATA = LEVEL_DATA;
