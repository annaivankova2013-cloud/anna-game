// ============================================
// ☀️ ЛІТО І ДИТИНСТВО - ПОВНИЙ КОД ГРИ
// ============================================

// Глобальний стан гри
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
    players: new Map(),
    npcs: [],
    busPosition: 0,
    busPassengers: []
};

// ============================================
// СИСТЕМА ЧАСУ
// ============================================
class TimeSystem {
    constructor() {
        this.hour = 8;
        this.minute = 0;
        this.timeSpeed = 1500; // 1.5 секунди = 1 ігрова хвилина
        this.timer = null;
        this.isNight = false;
    }

    start() {
        this.timer = setInterval(() => this.update(), this.timeSpeed);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    update() {
        this.minute++;
        if (this.minute >= 60) {
            this.minute = 0;
            this.hour++;
            if (this.hour >= 24) {
                this.hour = 0;
            }
        }

        window.gameState.gameTime = {
            hour: this.hour,
            minute: this.minute
        };

        this.isNight = (this.hour >= 23 || this.hour < 7);
    }

    getCurrentPeriod() {
        if (this.hour >= 7 && this.hour < 8) return '🌅 Ранок';
        if (this.hour >= 8 && this.hour < 9) return '🥞 Сніданок';
        if (this.hour >= 9 && this.hour < 10) return '🚶 До школи';
        if (this.hour >= 10 && this.hour < 13) return '🏫 Уроки';
        if (this.hour >= 13 && this.hour < 14) return '🍲 Обід';
        if (this.hour >= 14 && this.hour < 18) return '🎮 Вільний час';
        if (this.hour >= 18 && this.hour < 19) return '🍽️ Вечеря';
        if (this.hour >= 19 && this.hour < 22) return '🌆 Вечір';
        if (this.hour >= 22 && this.hour < 23) return '😴 Час спати';
        return '🌙 Ніч';
    }

    getTimeString() {
        return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
    }

    skipToMorning() {
        this.hour = 7;
        this.minute = 0;
        this.isNight = false;
        window.gameState.resources.energy = 100;
    }
}

// ============================================
// МЕРЕЖЕВИЙ МЕНЕДЖЕР (PeerJS + WebRTC)
// ============================================
class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = new Map();
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        this.roomName = '';
        this.roomPassword = '';
    }

    async init(playerName) {
        this.playerId = `${playerName}_${Date.now()}`;
        
        return new Promise((resolve, reject) => {
            try {
                this.peer = new Peer(this.playerId, {
                    debug: 1,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' }
                        ]
                    }
                });

                this.peer.on('open', (id) => {
                    console.log('✅ PeerJS підключено з ID:', id);
                    document.getElementById('loading-screen').style.display = 'none';
                    resolve(id);
                });

                this.peer.on('connection', (conn) => {
                    this.handleConnection(conn);
                });

                this.peer.on('error', (err) => {
                    console.error('❌ PeerJS помилка:', err);
                    this.showError('Помилка з\'єднання. Перевірте інтернет.');
                });

                // Таймаут підключення
                setTimeout(() => {
                    if (!this.peer || !this.peer.id) {
                        reject(new Error('Таймаут підключення'));
                    }
                }, 10000);

            } catch (error) {
                console.error('Помилка ініціалізації PeerJS:', error);
                reject(error);
            }
        });
    }

    createRoom(roomName, password = '') {
        this.roomId = `${roomName}_${Date.now()}`;
        this.isHost = true;
        this.roomName = roomName;
        this.roomPassword = password;
        console.log('🏠 Кімнату створено:', this.roomId);
        return this.roomId;
    }

    joinRoom(hostId, password = '') {
        console.log('🚪 Підключення до кімнати:', hostId);
        
        const conn = this.peer.connect(hostId, {
            reliable: true,
            metadata: { 
                type: 'join', 
                password: password,
                playerName: window.gameState.playerName
            }
        });
        
        this.handleConnection(conn);
        return hostId;
    }

    handleConnection(conn) {
        conn.on('open', () => {
            console.log('🔗 З\'єднання встановлено з:', conn.peer);
            this.connections.set(conn.peer, conn);
            
            // Якщо ми хост, відправляємо дані про гравця
            if (this.isHost && conn.metadata?.type === 'join') {
                // Перевірка пароля
                if (this.roomPassword && conn.metadata.password !== this.roomPassword) {
                    conn.send({ type: 'error', message: 'Невірний пароль' });
                    conn.close();
                    return;
                }
                
                // Відправляємо поточний стан гри
                conn.send({
                    type: 'game_state',
                    time: window.gameState.gameTime,
                    busPosition: window.gameState.busPosition,
                    players: Array.from(this.connections.keys())
                });
            }
            
            // Прийом даних
            conn.on('data', (data) => {
                this.handleData(conn.peer, data);
            });
        });

        conn.on('close', () => {
            console.log('🔌 З\'єднання закрито:', conn.peer);
            this.connections.delete(conn.peer);
            window.gameState.players.delete(conn.peer);
            
            // Видаляємо спрайт гравця
            if (window.game && window.game.otherPlayers) {
                const playerSprite = window.game.otherPlayers.get(conn.peer);
                if (playerSprite) {
                    playerSprite.destroy();
                    window.game.otherPlayers.delete(conn.peer);
                }
            }
        });

        conn.on('error', (err) => {
            console.error('Помилка з\'єднання:', err);
        });
    }

    handleData(peerId, data) {
        switch (data.type) {
            case 'player_move':
                if (window.gameState.players.has(peerId)) {
                    const player = window.gameState.players.get(peerId);
                    player.x = data.x;
                    player.y = data.y;
                }
                break;
                
            case 'player_join':
                console.log('👤 Новий гравець:', data.playerName);
                window.gameState.players.set(peerId, {
                    name: data.playerName,
                    x: data.x || 400,
                    y: data.y || 300
                });
                break;
                
            case 'time_sync':
                window.gameState.gameTime = data.time;
                break;
                
            case 'chat_message':
                this.showChatMessage(data.from, data.message);
                break;
                
            case 'game_state':
                window.gameState.gameTime = data.time;
                window.gameState.busPosition = data.busPosition;
                break;
                
            case 'bus_update':
                window.gameState.busPosition = data.position;
                break;
        }
    }

    broadcast(data) {
        this.connections.forEach((conn, peerId) => {
            if (conn.open) {
                try {
                    conn.send(data);
                } catch (e) {
                    console.error('Помилка відправки:', e);
                }
            }
        });
    }

    sendPlayerMove(x, y) {
        this.broadcast({
            type: 'player_move',
            x, y,
            playerName: window.gameState.playerName,
            timestamp: Date.now()
        });
    }

    syncGameTime() {
        if (this.isHost) {
            this.broadcast({
                type: 'time_sync',
                time: window.gameState.gameTime
            });
        }
    }

    syncBusPosition() {
        if (this.isHost) {
            this.broadcast({
                type: 'bus_update',
                position: window.gameState.busPosition
            });
        }
    }

    showChatMessage(from, message) {
        console.log(`💬 ${from}: ${message}`);
        // Тут можна додати відображення в UI
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }
}

// ============================================
// ОСНОВНА ГРА
// ============================================
class Game {
    constructor() {
        this.config = {
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
            }
        };
        
        this.game = null;
        this.player = null;
        this.playerNameText = null;
        this.cursors = null;
        this.wasd = null;
        this.otherPlayers = new Map();
        this.timeSystem = new TimeSystem();
        this.networkManager = null;
        this.mapWidth = 3200;
        this.mapHeight = 2200;
        this.playerSpeed = 160;
        this.lastSyncTime = 0;
        this.nightOverlay = null;
        this.currentScene = 'menu';
        this.gameStarted = false;
        
        // NPC персонажі
        this.npcs = [];
        this.npcNames = [
            'Оля', 'Богдан', 'Артем', 'Катя', 'Софія', 
            'Макс', 'Дарина', 'Ліза', 'Денис', 'Ігор', 
            'Марія', 'Остап', 'Соня'
        ];
    }

    init() {
        // Створюємо гру
        this.game = new Phaser.Game(this.config);
        
        // Чекаємо завантаження Phaser
        this.game.events.on('ready', () => {
            console.log('🎮 Phaser готовий!');
            this.showMainMenu();
        });
    }

    showMainMenu() {
        // Очищаємо поточну сцену
        if (this.game.scene.scenes.length > 0) {
            this.game.scene.scenes.forEach(scene => {
                if (scene.scene.isActive()) {
                    scene.scene.stop();
                }
            });
        }
        
        // Створюємо сцену меню
        const menuScene = new Phaser.Scene('MenuScene');
        
        menuScene.create = () => {
            const { width, height } = menuScene.cameras.main;
            
            // Градієнтний фон
            const bg = menuScene.add.graphics();
            bg.fillGradientStyle(0x667eea, 0x667eea, 0x764ba2, 0x764ba2, 1);
            bg.fillRect(0, 0, width, height);
            
            // Заголовок
            menuScene.add.text(width / 2, 50, '☀️ Літо і Дитинство', {
                fontSize: '32px',
                fill: '#fff',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 3
            }).setOrigin(0.5);
            
            menuScene.add.text(width / 2, 90, 'Мультиплеєрний симулятор міста', {
                fontSize: '16px',
                fill: '#fff'
            }).setOrigin(0.5);
            
            // Кнопка "Створити кімнату"
            this.createButton(menuScene, width / 2, 180, '🏠 Створити кімнату', () => {
                this.showCreateRoom();
            });
            
            // Кнопка "Приєднатись до кімнати"
            this.createButton(menuScene, width / 2, 240, '🚪 Приєднатись до кімнати', () => {
                this.showJoinRoom();
            });
            
            // Кнопка "Швидка гра" (без мультиплеєра)
            this.createButton(menuScene, width / 2, 300, '🎮 Швидка гра (соло)', () => {
                this.startSinglePlayer();
            });
            
            // Інформація
            menuScene.add.text(width / 2, 400, '🎯 Використовуйте WASD або стрілки для руху\n📱 E - взаємодія | 📱 Кнопка телефону в грі', {
                fontSize: '14px',
                fill: '#fff',
                align: 'center',
                lineSpacing: 5
            }).setOrigin(0.5);
            
            // Версія
            menuScene.add.text(width / 2, height - 20, 'v1.0.0 | P2P Мультиплеєр через WebRTC', {
                fontSize: '12px',
                fill: '#ffffff88'
            }).setOrigin(0.5);
        };
        
        this.game.scene.add('MenuScene', menuScene, true);
    }

    createButton(scene, x, y, text, callback) {
        const button = scene.add.text(x, y, text, {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: '#00000088',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();
        
        button.on('pointerover', () => button.setStyle({ backgroundColor: '#000000cc' }));
        button.on('pointerout', () => button.setStyle({ backgroundColor: '#00000088' }));
        button.on('pointerdown', callback);
        
        return button;
    }

    showCreateRoom() {
        const roomName = prompt('Введіть назву кімнати:');
        if (!roomName) return;
        
        const password = prompt('Пароль (залиште пустим для відкритої кімнати):');
        
        this.networkManager = new NetworkManager();
        
        this.networkManager.init(window.gameState.playerName || 'Гравець').then(() => {
            const roomId = this.networkManager.createRoom(roomName, password);
            window.gameState.roomId = roomId;
            
            // Запитуємо ім'я гравця
            const playerName = prompt('Введіть ім\'я персонажа:') || 'Гравець';
            window.gameState.playerName = playerName;
            
            this.networkManager.playerName = playerName;
            this.startGame();
        }).catch(error => {
            alert('Помилка підключення: ' + error.message);
        });
    }

    showJoinRoom() {
        const hostId = prompt('Введіть ID кімнати для підключення:');
        if (!hostId) return;
        
        const password = prompt('Пароль (якщо є):');
        
        this.networkManager = new NetworkManager();
        
        this.networkManager.init(window.gameState.playerName || 'Гравець').then(() => {
            const playerName = prompt('Введіть ім\'я персонажа:') || 'Гравець';
            window.gameState.playerName = playerName;
            
            this.networkManager.joinRoom(hostId, password);
            this.startGame();
        }).catch(error => {
            alert('Помилка підключення: ' + error.message);
        });
    }

    startSinglePlayer() {
        const playerName = prompt('Введіть ім\'я персонажа:') || 'Гравець';
        window.gameState.playerName = playerName;
        this.networkManager = null; // Без мультиплеєра
        this.startGame();
    }

    startGame() {
        this.gameStarted = true;
        
        // Створюємо основну ігрову сцену
        const gameScene = new Phaser.Scene('GameScene');
        
        gameScene.create = () => {
            this.createGameWorld(gameScene);
        };
        
        gameScene.update = (time, delta) => {
            this.updateGame(gameScene, time, delta);
        };
        
        // Зупиняємо всі інші сцени
        this.game.scene.scenes.forEach(scene => {
            if (scene.scene.isActive()) {
                scene.scene.stop();
            }
        });
        
        this.game.scene.add('GameScene', gameScene, true);
    }

    createGameWorld(scene) {
        const { width, height } = scene.cameras.main;
        
        // Створюємо карту
        this.createMap(scene);
        
        // Створюємо гравця
        this.createPlayer(scene);
        
        // Створюємо NPC
        this.createNPCs(scene);
        
        // Налаштовуємо камеру
        scene.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        scene.cameras.main.startFollow(this.player);
        scene.cameras.main.setZoom(1.2);
        
        // Управління
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = {
            up: scene.input.keyboard.addKey('W'),
            down: scene.input.keyboard.addKey('S'),
            left: scene.input.keyboard.addKey('A'),
            right: scene.input.keyboard.addKey('D')
        };
        
        // Клавіша взаємодії
        this.interactKey = scene.input.keyboard.addKey('E');
        
        // Запуск часу
        this.timeSystem.start();
        
        // Створюємо UI
        this.createUI(scene);
        
        // Створюємо автобус
        this.createBus(scene);
        
        // Якщо це мультиплеєр, запускаємо синхронізацію
        if (this.networkManager) {
            this.startMultiplayerSync();
        }
        
        // Створюємо мобільний джойстик
        this.createMobileControls(scene);
        
        // Відправляємо інформацію про приєднання
        if (this.networkManager) {
            this.networkManager.broadcast({
                type: 'player_join',
                playerName: window.gameState.playerName,
                x: this.player.x,
                y: this.player.y
            });
        }
    }

    createMap(scene) {
        const graphics = scene.add.graphics();
        
        // Трава
        graphics.fillStyle(0x7ec850, 1);
        graphics.fillRect(0, 0, this.mapWidth, this.mapHeight);
        
        // Сітка трави (текстура)
        for (let i = 0; i < this.mapWidth; i += 50) {
            for (let j = 0; j < this.mapHeight; j += 50) {
                if ((i + j) % 100 === 0) {
                    graphics.fillStyle(0x6db840, 0.3);
                    graphics.fillRect(i, j, 50, 50);
                }
            }
        }
        
        // Дороги
        graphics.fillStyle(0x555555, 1);
        // Головна горизонтальна дорога
        graphics.fillRect(0, 600, this.mapWidth, 80);
        // Головна вертикальна дорога
        graphics.fillRect(800, 0, 80, this.mapHeight);
        
        // Другорядні дороги
        graphics.fillStyle(0x666666, 0.8);
        graphics.fillRect(0, 1200, this.mapWidth, 60);
        graphics.fillRect(1600, 0, 60, this.mapHeight);
        
        // Розмітка на дорогах (білі лінії)
        graphics.fillStyle(0xffffff, 0.5);
        for (let x = 0; x < this.mapWidth; x += 40) {
            graphics.fillRect(x, 635, 20, 2);
            graphics.fillRect(x, 1225, 20, 2);
        }
        for (let y = 0; y < this.mapHeight; y += 40) {
            graphics.fillRect(835, y, 2, 20);
            graphics.fillRect(1630, y, 2, 20);
        }
        
        // Річка
        graphics.fillStyle(0x4488ff, 0.8);
        graphics.fillRect(0, 1400, this.mapWidth, 100);
        
        // Хвилі на річці
        graphics.fillStyle(0x5599ff, 0.4);
        for (let x = 0; x < this.mapWidth; x += 30) {
            const waveY = 1420 + Math.sin(x * 0.02) * 20;
            graphics.fillCircle(x, waveY, 8);
        }
        
        // Мости
        [400, 1200, 2000, 2800].forEach((x, i) => {
            graphics.fillStyle(0x8B7355, 1);
            graphics.fillRect(x - 10, 1390, 100, 120);
            
            // Поручні моста
            graphics.fillStyle(0x6B5335, 1);
            graphics.fillRect(x - 10, 1390, 100, 5);
            graphics.fillRect(x - 10, 1505, 100, 5);
            
            // Стовпчики
            for (let j = 0; j <= 100; j += 20) {
                graphics.fillRect(x - 10 + j, 1390, 5, 120);
            }
        });
        
        // Будинки (16 штук)
        this.createHouses(scene, graphics);
        
        // Школа
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillRect(2400, 200, 200, 150);
        graphics.fillStyle(0xFFA500, 1);
        graphics.fillRect(2450, 150, 100, 50); // Дах
        scene.add.text(2500, 250, '🏫 Школа', {
            fontSize: '16px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Магазин
        graphics.fillStyle(0xFF6B6B, 1);
        graphics.fillRect(100, 1400, 150, 120);
        scene.add.text(175, 1460, '🛒 Магазин', {
            fontSize: '14px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Парк розваг
        graphics.fillStyle(0x90EE90, 0.5);
        graphics.fillRect(2600, 800, 400, 400);
        scene.add.text(2800, 1000, '🎡 Парк Розваг', {
            fontSize: '18px',
            fill: '#000',
            backgroundColor: '#ffffff88'
        }).setOrigin(0.5);
        
        // Кафе
        graphics.fillStyle(0xFFB6C1, 1);
        graphics.fillRect(1800, 1400, 120, 100);
        scene.add.text(1860, 1450, '☕ Кафе', {
            fontSize: '14px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Бібліотека
        graphics.fillStyle(0xDEB887, 1);
        graphics.fillRect(2200, 1400, 130, 110);
        scene.add.text(2265, 1455, '📚 Бібліотека', {
            fontSize: '14px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Дитячий майданчик
        graphics.fillStyle(0x98FB98, 0.7);
        graphics.fillRect(2800, 1400, 200, 150);
        scene.add.text(2900, 1475, '🛝 Майданчик', {
            fontSize: '14px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Дерева
        for (let i = 0; i < 200; i++) {
            const x = Phaser.Math.Between(50, this.mapWidth - 50);
            const y = Phaser.Math.Between(50, this.mapHeight - 50);
            
            // Не розміщуємо на дорогах та будівлях
            if (this.isPositionBlocked(x, y)) continue;
            
            // Стовбур
            graphics.fillStyle(0x8B4513, 1);
            graphics.fillRect(x - 3, y - 15, 6, 15);
            
            // Крона
            graphics.fillStyle(0x228B22, 1);
            graphics.fillCircle(x, y - 20, 12);
            
            // Яблука на деяких деревах
            if (Math.random() > 0.7) {
                graphics.fillStyle(0xFF0000, 1);
                for (let j = 0; j < 3; j++) {
                    graphics.fillCircle(
                        x + Phaser.Math.Between(-8, 8),
                        y - 20 + Phaser.Math.Between(-8, 8),
                        3
                    );
                }
            }
        }
        
        // Квіти
        for (let i = 0; i < 300; i++) {
            const x = Phaser.Math.Between(0, this.mapWidth);
            const y = Phaser.Math.Between(0, this.mapHeight);
            if (this.isPositionBlocked(x, y)) continue;
            
            const colors = [0xFF1493, 0xFFD700, 0xFF4500, 0x9400D3, 0x00CED1];
            graphics.fillStyle(colors[Math.floor(Math.random() * colors.length)], 0.7);
            graphics.fillCircle(x, y, 3);
        }
    }

    isPositionBlocked(x, y) {
        // Перевірка чи позиція знаходиться на дорозі або будівлі
        if ((y > 600 && y < 680) || (y > 1200 && y < 1260)) return true;
        if ((x > 800 && x < 880) || (x > 1600 && x < 1660)) return true;
        if (y > 1400 && y < 1500) return true;
        return false;
    }

    createHouses(scene, graphics) {
        const houseColors = [
            0xFF6347, 0x87CEEB, 0x98FB98, 0xFFD700, 
            0xFF69B4, 0xDDA0DD, 0xF0E68C, 0xFFA07A,
            0x20B2AA, 0x778899, 0xB0C4DE, 0xFFB6C1,
            0x00CED1, 0x9370DB, 0x3CB371, 0xCD853F
        ];
        
        const houseNames = [
            'Будинок 1', 'Будинок 2', 'Будинок 3', 'Будинок 4',
            'Будинок 5', 'Будинок 6', 'Будинок 7', 'Будинок 8',
            'Будинок 9', 'Будинок 10', 'Будинок 11', 'Будинок 12',
            'Будинок 13', 'Будинок 14', 'Будинок 15', 'Будинок 16'
        ];
        
        // Ліва частина (8 будинків)
        for (let i = 0; i < 8; i++) {
            const x = 80 + (i % 4) * 180;
            const y = 80 + Math.floor(i / 4) * 220;
            
            graphics.fillStyle(houseColors[i], 1);
            graphics.fillRect(x, y, 100, 100);
            
            // Дах
            graphics.fillStyle(0x8B4513, 1);
            graphics.fillTriangle(x - 10, y, x + 50, y - 30, x + 110, y);
            
            // Двері
            graphics.fillStyle(0x654321, 1);
            graphics.fillRect(x + 35, y + 55, 30, 45);
            
            // Вікна
            graphics.fillStyle(0xADD8E6, 1);
            graphics.fillRect(x + 10, y + 15, 20, 20);
            graphics.fillRect(x + 70, y + 15, 20, 20);
            
            // Номер будинку
            scene.add.text(x + 50, y - 15, houseNames[i], {
                fontSize: '10px',
                fill: '#000',
                backgroundColor: '#ffffff88'
            }).setOrigin(0.5);
        }
        
        // Права частина (8 будинків)
        for (let i = 0; i < 8; i++) {
            const x = 2000 + (i % 4) * 180;
            const y = 80 + Math.floor(i / 4) * 220;
            
            graphics.fillStyle(houseColors[i + 8], 1);
            graphics.fillRect(x, y, 100, 100);
            
            graphics.fillStyle(0x8B4513, 1);
            graphics.fillTriangle(x - 10, y, x + 50, y - 30, x + 110, y);
            
            graphics.fillStyle(0x654321, 1);
            graphics.fillRect(x + 35, y + 55, 30, 45);
            
            graphics.fillStyle(0xADD8E6, 1);
            graphics.fillRect(x + 10, y + 15, 20, 20);
            graphics.fillRect(x + 70, y + 15, 20, 20);
            
            scene.add.text(x + 50, y - 15, houseNames[i + 8], {
                fontSize: '10px',
                fill: '#000',
                backgroundColor: '#ffffff88'
            }).setOrigin(0.5);
        }
    }

    createPlayer(scene) {
        const x = Phaser.Math.Between(200, 600);
        const y = Phaser.Math.Between(200, 500);
        
        // Створюємо спрайт гравця
        this.player = scene.add.container(x, y);
        
        // Тіло
        const body = scene.add.rectangle(0, 0, 24, 24, 
            window.gameState.playerGender === 'girl' ? 0xFF69B4 : 0x4169E1);
        this.player.add(body);
        
        // Голова
        const head = scene.add.circle(0, -18, 10, 0xFFDBB4);
        this.player.add(head);
        
        // Волосся
        const hair = scene.add.rectangle(0, -24, 22, 8, 
            [0x000000, 0x8B4513, 0xFFD700, 0xFF6347, 0x8B008B, 0x00CED1, 0xFF4500, 0x4B0082][window.gameState.playerAppearance.hairColor]);
        this.player.add(hair);
        
        // Ім'я гравця
        this.playerNameText = scene.add.text(0, -35, 
            window.gameState.playerName, {
                fontSize: '12px',
                fill: '#000',
                backgroundColor: '#ffffffcc',
                padding: { x: 3, y: 1 }
            }).setOrigin(0.5);
        this.player.add(this.playerNameText);
        
        // Додаємо фізику до контейнера
        scene.physics.world.enable(this.player);
        this.player.body.setSize(24, 24);
        this.player.body.setOffset(-12, -12);
        this.player.body.setCollideWorldBounds(true);
        
        // Емодзі над гравцем
        this.playerEmoji = scene.add.text(0, -45, '', {
            fontSize: '16px'
        }).setOrigin(0.5);
        this.player.add(this.playerEmoji);
    }

    createNPCs(scene) {
        this.npcs = [];
        
        this.npcNames.forEach((name, index) => {
            const x = Phaser.Math.Between(100, this.mapWidth - 100);
            const y = Phaser.Math.Between(100, this.mapHeight - 100);
            
            const npc = scene.add.container(x, y);
            
            // Тіло NPC
            const body = scene.add.rectangle(0, 0, 22, 22, 
                Phaser.Display.Color.GetColor(
                    Phaser.Math.Between(100, 255),
                    Phaser.Math.Between(100, 255),
                    Phaser.Math.Between(100, 255)
                ));
            npc.add(body);
            
            // Голова
            const head = scene.add.circle(0, -16, 9, 0xFFDBB4);
            npc.add(head);
            
            // Ім'я
            const nameText = scene.add.text(0, -30, name, {
                fontSize: '10px',
                fill: '#000',
                backgroundColor: '#ffffffcc',
                padding: { x: 2, y: 1 }
            }).setOrigin(0.5);
            npc.add(nameText);
            
            // Додаємо фізику
            scene.physics.world.enable(npc);
            npc.body.setSize(22, 22);
            npc.body.setOffset(-11, -11);
            npc.body.setCollideWorldBounds(true);
            
            // Випадковий рух
            npc.moveDirection = new Phaser.Math.Vector2(
                Phaser.Math.Between(-1, 1),
                Phaser.Math.Between(-1, 1)
            ).normalize();
            npc.moveTimer = 0;
            npc.speed = Phaser.Math.Between(30, 60);
            
            this.npcs.push(npc);
        });
    }

    createBus(scene) {
        // Автобус
        this.bus = scene.add.container(100, 630);
        
        // Корпус автобуса
        const busBody = scene.add.rectangle(0, 0, 60, 30, 0xFFD700);
        this.bus.add(busBody);
        
        // Вікна
        for (let i = -20; i <= 20; i += 10) {
            const window = scene.add.rectangle(i, -5, 8, 12, 0xADD8E6);
            this.bus.add(window);
        }
        
        // Колеса
        const wheel1 = scene.add.circle(-20, 15, 5, 0x000000);
        const wheel2 = scene.add.circle(20, 15, 5, 0x000000);
        this.bus.add(wheel1);
        this.bus.add(wheel2);
        
        // Напис
        const busNumber = scene.add.text(0, -20, '🚌 №3', {
            fontSize: '10px',
            fill: '#000'
        }).setOrigin(0.5);
        this.bus.add(busNumber);
        
        // Маршрут автобуса
        this.busStops = [
            { x: 100, y: 640, name: 'Житловий район' },
            { x: 500, y: 640, name: 'Магазин' },
            { x: 1000, y: 640, name: 'Парк' },
            { x: 1500, y: 640, name: 'Кафе' },
            { x: 2000, y: 640, name: 'Бібліотека' },
            { x: 2500, y: 640, name: 'Школа' },
            { x: 2900, y: 640, name: 'Майданчик' }
        ];
        
        this.busCurrentStop = 0;
        this.busMoving = true;
        this.busSpeed = 80;
        
        // Текст над автобусом
        this.busInfoText = scene.add.text(0, -35, '', {
            fontSize: '10px',
            fill: '#000',
            backgroundColor: '#ffffff88',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);
        this.bus.add(this.busInfoText);
        
        scene.physics.world.enable(this.bus);
        this.bus.body.setSize(60, 30);
        this.bus.body.setOffset(-30, -15);
        
        // Зупинки на карті
        this.busStops.forEach((stop, index) => {
            const stopMarker = scene.add.rectangle(stop.x, stop.y, 80, 30, 0x000000, 0.3);
            const stopText = scene.add.text(stop.x, stop.y + 20, `🚏 ${stop.name}`, {
                fontSize: '11px',
                fill: '#fff',
                backgroundColor: '#00000088',
                padding: { x: 3, y: 2 }
            }).setOrigin(0.5);
        });
    }

    createUI(scene) {
        // Верхня панель
        const topPanel = scene.add.rectangle(400, 0, 800, 60, 0x000000, 0.6);
        topPanel.setScrollFactor(0).setDepth(100);
        
        // Час
        this.timeText = scene.add.text(10, 10, '', {
            fontSize: '16px',
            fill: '#fff',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0).setDepth(101);
        
        // Ресурси
        this.resourcesText = scene.add.text(200, 10, '', {
            fontSize: '14px',
            fill: '#fff',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0).setDepth(101);
        
        // Період дня
        this.periodText = scene.add.text(400, 10, '', {
            fontSize: '14px',
            fill: '#fff',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0).setDepth(101);
        
        // Кнопка телефону
        this.phoneButton = scene.add.text(750, 540, '📱', {
            fontSize: '32px'
        }).setScrollFactor(0).setDepth(101)
          .setInteractive()
          .on('pointerdown', () => this.openPhone(scene));
        
        // Міні-карта
        this.createMinimap(scene);
        
        // Чат (якщо мультиплеєр)
        if (this.networkManager) {
            this.chatText = scene.add.text(10, 400, '', {
                fontSize: '12px',
                fill: '#fff',
                backgroundColor: '#00000088',
                padding: { x: 5, y: 3 },
                wordWrap: { width: 300 }
            }).setScrollFactor(0).setDepth(101);
        }
        
        // Кнопка виходу
        const exitButton = scene.add.text(750, 10, '🚪', {
            fontSize: '24px'
        }).setScrollFactor(0).setDepth(101)
          .setInteractive()
          .on('pointerdown', () => {
              if (confirm('Вийти в головне меню?')) {
                  this.timeSystem.stop();
                  if (this.networkManager) {
                      this.networkManager.connections.forEach(conn => conn.close());
                  }
                  this.showMainMenu();
              }
          });
    }

    createMinimap(scene) {
        const minimapWidth = 150;
        const minimapHeight = 100;
        const minimapX = 800 - minimapWidth - 10;
        const minimapY = 70;
        
        this.minimap = scene.add.graphics();
        this.minimap.setScrollFactor(0).setDepth(101);
        
        // Фон міні-карти
        this.minimap.fillStyle(0x000000, 0.7);
        this.minimap.fillRect(minimapX, minimapY, minimapWidth, minimapHeight);
        this.minimap.lineStyle(2, 0xFFFFFF);
        this.minimap.strokeRect(minimapX, minimapY, minimapWidth, minimapHeight);
        
        // Позначки на міні-карті
        // Дороги
        this.minimap.fillStyle(0x555555, 0.5);
        this.minimap.fillRect(minimapX, minimapY + (600 / this.mapHeight) * minimapHeight, 
            minimapWidth, (80 / this.mapHeight) * minimapHeight);
        
        // Річка
        this.minimap.fillStyle(0x4488ff, 0.5);
        this.minimap.fillRect(minimapX, minimapY + (1400 / this.mapHeight) * minimapHeight,
            minimapWidth, (100 / this.mapHeight) * minimapHeight);
        
        // Гравець на міні-карті
        this.minimapPlayer = scene.add.circle(minimapX, minimapY, 3, 0xFF0000);
        this.minimapPlayer.setScrollFactor(0).setDepth(102);
    }

    createMobileControls(scene) {
        // Перевірка чи це мобільний пристрій
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;
        
        // Віртуальний джойстик
        const joystickRadius = 45;
        const joystickX = 70;
        const joystickY = scene.cameras.main.height - 70;
        
        const joystickBase = scene.add.circle(joystickX, joystickY, 
            joystickRadius, 0x000000, 0.4)
            .setScrollFactor(0).setDepth(200);
        
        const joystickThumb = scene.add.circle(joystickX, joystickY, 
            18, 0xFFFFFF, 0.6)
            .setScrollFactor(0).setDepth(201)
            .setInteractive({ draggable: true });
        
        // Кнопка взаємодії
        const interactButton = scene.add.circle(
            scene.cameras.main.width - 60,
            scene.cameras.main.height - 60,
            25, 0x00FF00, 0.6
        ).setScrollFactor(0).setDepth(200)
         .setInteractive();
        
        interactButton.on('pointerdown', () => {
            this.handleInteraction(scene);
        });
        
        // Логіка джойстика
        this.joystickVector = new Phaser.Math.Vector2(0, 0);
        
        joystickThumb.on('drag', (pointer, dragX, dragY) => {
            const dx = dragX - joystickX;
            const dy = dragY - joystickY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > joystickRadius) {
                const angle = Math.atan2(dy, dx);
                joystickThumb.x = joystickX + Math.cos(angle) * joystickRadius;
                joystickThumb.y = joystickY + Math.sin(angle) * joystickRadius;
            } else {
                joystickThumb.x = dragX;
                joystickThumb.y = dragY;
            }
            
            this.joystickVector.set(
                (joystickThumb.x - joystickX) / joystickRadius,
                (joystickThumb.y - joystickY) / joystickRadius
            );
        });
        
        joystickThumb.on('dragend', () => {
            joystickThumb.x = joystickX;
            joystickThumb.y = joystickY;
            this.joystickVector.set(0, 0);
        });
        
        // Підказка
        scene.add.text(joystickX, joystickY - joystickRadius - 15, 
            '🎮 Рух', {
                fontSize: '12px',
                fill: '#fff',
                backgroundColor: '#00000088'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        
        scene.add.text(interactButton.x, interactButton.y - 35,
            '🤝 Дія', {
                fontSize: '12px',
                fill: '#fff',
                backgroundColor: '#00000088'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    }

    handleInteraction(scene) {
        // Перевіряємо чи гравець біля дверей будинку
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // Перевірка автобусних зупинок
        this.busStops.forEach(stop => {
            const distance = Phaser.Math.Distance.Between(playerX, playerY, stop.x, stop.y);
            if (distance < 60) {
                this.boardBus(scene, stop);
            }
        });
        
        // Показуємо емодзі взаємодії
        this.playerEmoji.setText('👋');
        setTimeout(() => {
            this.playerEmoji.setText('');
        }, 1000);
    }

    boardBus(scene, stop) {
        if (window.gameState.resources.coins < 3) {
            this.showMessage(scene, 'Недостатньо монет для проїзду! 💰');
            return;
        }
        
        window.gameState.resources.coins -= 3;
        window.gameState.busPassengers.push(window.gameState.playerName);
        
        this.showMessage(scene, `Ви сіли в автобус на зупинці "${stop.name}"! 🚌`);
        
        // Телепортуємо гравця в автобус
        this.player.x = this.bus.x + Phaser.Math.Between(-20, 20);
        this.player.y = this.bus.y;
    }

    showMessage(scene, message) {
        const msg = scene.add.text(400, 300, message, {
            fontSize: '18px',
            fill: '#fff',
            backgroundColor: '#000000cc',
            padding: { x: 15, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
        
        scene.tweens.add({
            targets: msg,
            y: 250,
            alpha: 0,
            duration: 2000,
            onComplete: () => msg.destroy()
        });
    }

    openPhone(scene) {
        this.playerEmoji.setText('📱');
        
        // Створюємо меню телефону
        const phoneBg = scene.add.rectangle(400, 300, 300, 400, 0x000000, 0.9)
            .setScrollFactor(0).setDepth(500).setInteractive();
        
        const phoneTitle = scene.add.text(400, 150, '📱 Телефон', {
            fontSize: '24px',
            fill: '#fff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
        
        const apps = [
            { icon: '💬', text: 'Чат', y: 200 },
            { icon: '🐍', text: 'Змійка', y: 240 },
            { icon: '📒', text: 'Щоденник', y: 280 },
            { icon: '💳', text: 'Баланс', y: 320 },
            { icon: '📝', text: 'Справи', y: 360 },
            { icon: '😴', text: 'Спати', y: 400 },
            { icon: '👤', text: 'Профіль', y: 440 }
        ];
        
        const phoneElements = [phoneBg, phoneTitle];
        
        apps.forEach(app => {
            const appText = scene.add.text(400, app.y, `${app.icon} ${app.text}`, {
                fontSize: '18px',
                fill: '#fff',
                backgroundColor: '#333333',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(501)
              .setInteractive();
            
            appText.on('pointerdown', () => {
                if (app.text === 'Спати') {
                    this.timeSystem.skipToMorning();
                    this.showMessage(scene, '😴 Ви проспали до ранку! Енергія відновлена.');
                    phoneElements.forEach(el => el.destroy());
                } else if (app.text === 'Профіль') {
                    this.showMessage(scene, 
                        `👤 ${window.gameState.playerName}\n💰 Монет: ${window.gameState.resources.coins}\n💳 Картка: ${window.gameState.resources.cardBalance}\n⚡ Енергія: ${window.gameState.resources.energy}%`);
                } else if (app.text === 'Баланс') {
                    const amount = prompt('Сума для поповнення картки:');
                    if (amount && !isNaN(amount)) {
                        window.gameState.resources.cardBalance += parseInt(amount);
                        this.showMessage(scene, `💳 Картку поповнено на ${amount}!`);
                    }
                }
            });
            
            phoneElements.push(appText);
        });
        
        // Кнопка закриття
        const closeButton = scene.add.text(400, 480, '❌ Закрити', {
            fontSize: '20px',
            fill: '#ff4444',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(501)
          .setInteractive()
          .on('pointerdown', () => {
              phoneElements.forEach(el => el.destroy());
              this.playerEmoji.setText('');
          });
        
        phoneElements.push(closeButton);
    }

    updateGame(scene, time, delta) {
        if (!this.gameStarted) return;
        
        // Рух гравця
        this.handleMovement();
        
        // Рух NPC
        this.updateNPCs(scene, delta);
        
        // Рух автобуса
        this.updateBus(scene, delta);
        
        // Оновлення UI
        this.updateUI(scene);
        
        // Оновлення міні-карти
        this.updateMinimap();
        
        // Синхронізація позиції
        if (this.networkManager && time - this.lastSyncTime > 100) {
            this.networkManager.sendPlayerMove(this.player.x, this.player.y);
            this.lastSyncTime = time;
        }
        
        // Синхронізація часу (хост)
        if (this.networkManager?.isHost && Math.random() < 0.1) {
            this.networkManager.syncGameTime();
        }
        
        // Синхронізація автобуса (хост)
        if (this.networkManager?.isHost && Math.random() < 0.05) {
            this.networkManager.syncBusPosition();
        }
    }

    handleMovement() {
        if (!this.player?.body) return;
        
        let vx = 0;
        let vy = 0;
        
        // Клавіатура
        if (this.cursors?.left.isDown || this.wasd?.left.isDown) vx = -1;
        if (this.cursors?.right.isDown || this.wasd?.right.isDown) vx = 1;
        if (this.cursors?.up.isDown || this.wasd?.up.isDown) vy = -1;
        if (this.cursors?.down.isDown || this.wasd?.down.isDown) vy = 1;
        
        // Джойстик
        if (this.joystickVector) {
            vx = this.joystickVector.x;
            vy = this.joystickVector.y;
        }
        
        // Нормалізація діагонального руху
        if (vx !== 0 && vy !== 0) {
            const length = Math.sqrt(vx * vx + vy * vy);
            vx /= length;
            vy /= length;
        }
        
        this.player.body.setVelocity(vx * this.playerSpeed, vy * this.playerSpeed);
        
        // Анімація напрямку
        if (vx !== 0 || vy !== 0) {
            this.playerEmoji.setText(vx > 0 ? '➡️' : vx < 0 ? '⬅️' : vy > 0 ? '⬇️' : '⬆️');
        } else {
            this.playerEmoji.setText('');
        }
    }

    updateNPCs(scene, delta) {
        this.npcs.forEach(npc => {
            if (!npc.body) return;
            
            npc.moveTimer -= delta;
            
            if (npc.moveTimer <= 0) {
                // Змінюємо напрямок
                npc.moveDirection = new Phaser.Math.Vector2(
                    Phaser.Math.Between(-1, 1),
                    Phaser.Math.Between(-1, 1)
                ).normalize();
                npc.moveTimer = Phaser.Math.Between(1000, 3000);
            }
            
            npc.body.setVelocity(
                npc.moveDirection.x * npc.speed,
                npc.moveDirection.y * npc.speed
            );
        });
    }

    updateBus(scene, delta) {
        if (!this.bus || !this.busStops || this.busStops.length === 0) return;
        
        const targetStop = this.busStops[this.busCurrentStop];
        const dx = targetStop.x - this.bus.x;
        const dy = targetStop.y - this.bus.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            // Прибули на зупинку
            this.busInfoText.setText(`🚏 ${targetStop.name}`);
            
            // Чекаємо трохи на зупинці
            if (!this.busWaitTimer) {
                this.busWaitTimer = 0;
            }
            
            this.busWaitTimer += delta;
            
            if (this.busWaitTimer > 3000) { // 3 секунди очікування
                this.busCurrentStop = (this.busCurrentStop + 1) % this.busStops.length;
                this.busWaitTimer = 0;
                this.busInfoText.setText('🚌 В дорозі...');
            }
        } else {
            // Рухаємось до наступної зупинки
            const angle = Math.atan2(dy, dx);
            this.bus.body.setVelocity(
                Math.cos(angle) * this.busSpeed,
                Math.sin(angle) * this.busSpeed
            );
            this.busInfoText.setText('🚌 В дорозі...');
            
            // Оновлюємо позицію пасажирів
            window.gameState.busPassengers.forEach(passengerName => {
                if (passengerName === window.gameState.playerName) {
                    this.player.x = this.bus.x + Phaser.Math.Between(-20, 20);
                    this.player.y = this.bus.y;
                }
            });
        }
        
        // Оновлюємо глобальну позицію автобуса
        window.gameState.busPosition = {
            x: this.bus.x,
            y: this.bus.y,
            currentStop: this.busCurrentStop
        };
    }

    updateUI(scene) {
        // Час
        if (this.timeText) {
            this.timeText.setText(`🕐 ${this.timeSystem.getTimeString()}`);
        }
        
        // Ресурси
        if (this.resourcesText) {
            const res = window.gameState.resources;
            this.resourcesText.setText(`💰 ${res.coins} | 💳 ${res.cardBalance} | ⚡ ${res.energy}%`);
        }
        
        // Період дня
        if (this.periodText) {
            this.periodText.setText(this.timeSystem.getCurrentPeriod());
        }
        
        // Нічний ефект
        if (this.timeSystem.isNight && !this.nightOverlay) {
            this.nightOverlay = scene.add.rectangle(
                400, 300, 800, 600, 0x000033, 0.4
            ).setScrollFactor(0).setDepth(99);
        } else if (!this.timeSystem.isNight && this.nightOverlay) {
            this.nightOverlay.destroy();
            this.nightOverlay = null;
        }
    }

    updateMinimap() {
        if (!this.minimapPlayer || !this.player) return;
        
        const minimapWidth = 150;
        const minimapHeight = 100;
        const minimapX = 800 - minimapWidth - 10;
        const minimapY = 70;
        
        const scaleX = minimapWidth / this.mapWidth;
        const scaleY = minimapHeight / this.mapHeight;
        
        this.minimapPlayer.setPosition(
            minimapX + this.player.x * scaleX,
            minimapY + this.player.y * scaleY
        );
    }

    startMultiplayerSync() {
        // Періодична синхронізація часу
        if (this.networkManager.isHost) {
            setInterval(() => {
                this.networkManager.syncGameTime();
            }, 5000);
            
            setInterval(() => {
                this.networkManager.syncBusPosition();
            }, 3000);
        }
    }
}

// ============================================
// ЗАПУСК ГРИ
// ============================================
window.addEventListener('load', () => {
    console.log('🚀 Запуск гри "Літо і Дитинство"...');
    
    try {
        const game = new Game();
        game.init();
        
        // Зберігаємо посилання на гру для доступу з інших частин коду
        window.game = game;
        
        console.log('✅ Гра успішно запущена!');
    } catch (error) {
        console.error('❌ Помилка запуску гри:', error);
        
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <h1>😢 Помилка запуску</h1>
                <p>${error.message}</p>
                <p>Спробуйте оновити сторінку</p>
            `;
        }
    }
});

// Обробка помилок
window.addEventListener('error', (event) => {
    console.error('Глобальна помилка:', event.error);
});

console.log('📦 Код гри завантажено успішно!');
