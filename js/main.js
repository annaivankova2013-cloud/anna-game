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
            graphics.fillRect(x + 10, y + 15,
