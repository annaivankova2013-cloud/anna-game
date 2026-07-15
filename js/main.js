import { NetworkManager } from './network/NetworkManager.js';
import { BootScene } from './scenes/BootScene.js';
import { RoomScene } from './scenes/RoomScene.js';
import { CharacterScene } from './scenes/CharacterScene.js';
import { GameScene } from './scenes/GameScene.js';

// Конфігурація Supabase (заміни на свої дані після реєстрації)
const SUPABASE_CONFIG = {
    url: 'https://zvnaoexafvxbanxbmnjm.supabase.co',
    anonKey: 'sb_publishable__betbVznwB3E5AjpM9gJJg_56zcmqIp
'
};

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, RoomScene, CharacterScene, GameScene]
};

// Глобальний мережевий менеджер
window.networkManager = new NetworkManager(SUPABASE_CONFIG);
window.gameState = {
    playerName: '',
    playerGender: 'boy',
    playerAppearance: {
        dressColor: 0,
        shirtColor: 0,
        pantsColor: 0,
        hairColor: 0,
        hairStyle: 0
    },
    houseId: null,
    resources: {
        coins: 15,
        cardBalance: 50,
        energy: 100
    },
    gameTime: { hour: 8, minute: 0 },
    roomId: null,
    players: new Map()
};

const game = new Phaser.Game(config);
