import { TimeSystem } from '../systems/TimeSystem.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.cursors = null;
        this.otherPlayers = new Map();
        this.timeSystem = new TimeSystem();
        this.mapWidth = 3200;
        this.mapHeight = 2200;
    }

    create() {
        // Створення карти
        this.createMap();
        
        // Створення гравця
        this.createPlayer();
        
        // Налаштування камери
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1.5);
        
        // Управління
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey('W'),
            down: this.input.keyboard.addKey('S'),
            left: this.input.keyboard.addKey('A'),
            right: this.input.keyboard.addKey('D')
        };
        
        // Взаємодія
        this.interactKey = this.input.keyboard.addKey('E');
        
        // Запуск часу
        this.timeSystem.start();
        
        // UI
        this.createUI();
        
        // Завантаження інших гравців
        this.loadExistingPlayers();
        
        // Слухачі мережевих подій
        this.setupNetworkListeners();
        
        // Мобільний джойстик
        this.createMobileControls();
    }

    createMap() {
        // Тимчасове створення карти з прямокутників
        const graphics = this.add.graphics();
        
        // Трава
        graphics.fillStyle(0x90EE90, 1);
        graphics.fillRect(0, 0, this.mapWidth, this.mapHeight);
        
        // Дороги
        graphics.fillStyle(0x808080, 1);
        // Горизонтальна дорога
        graphics.fillRect(0, 600, this.mapWidth, 100);
        // Вертикальна дорога
        graphics.fillRect(800, 0, 100, this.mapHeight);
        
        // Річка
        graphics.fillStyle(0x4169E1, 0.7);
        graphics.fillRect(0, 1100, this.mapWidth, 80);
        
        // Мости через річку
        graphics.fillStyle(0x8B4513, 1);
        [400, 1200, 2000, 2800].forEach(x => {
            graphics.fillRect(x, 1090, 100, 100);
        });
        
        // Будинки
        this.createHouses(graphics);
        
        // Дерева (випадкові)
        graphics.fillStyle(0x228B22, 1);
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(50, this.mapWidth - 50);
            const y = Phaser.Math.Between(50, this.mapHeight - 50);
            graphics.fillCircle(x, y, 15);
        }
    }

    createHouses(graphics) {
        const houseColors = [
            0xFF6347, 0x87CEEB, 0x98FB98, 0xFFD700, 
            0xFF69B4, 0xDDA0DD, 0xF0E68C, 0xFFA07A,
            0x20B2AA, 0x778899, 0xB0C4DE, 0xFFB6C1,
            0x00CED1, 0x9370DB, 0x3CB371, 0xCD853F
        ];
        
        // Ліва частина міста (8 будинків)
        for (let i = 0; i < 8; i++) {
            const x = 100 + (i % 4) * 200;
            const y = 100 + Math.floor(i / 4) * 250;
            graphics.fillStyle(houseColors[i], 1);
            graphics.fillRect(x, y, 120, 120);
            
            // Двері
            graphics.fillStyle(0x8B4513, 1);
            graphics.fillRect(x + 45, y + 70, 30, 50);
        }
        
        // Права частина міста (8 будинків)
        for (let i = 0; i < 8; i++) {
            const x = 2000 + (i % 4) * 200;
            const y = 100 + Math.floor(i / 4) * 250;
            graphics.fillStyle(houseColors[i + 8], 1);
            graphics.fillRect(x, y, 120, 120);
            
            graphics.fillStyle(0x8B4513, 1);
            graphics.fillRect(x + 45, y + 70, 30, 50);
        }
    }

    createPlayer() {
        // Тимчасовий спрайт гравця
        const x = Phaser.Math.Between(200, 600);
        const y = Phaser.Math.Between(200, 500);
        
        // Створюємо простий спрайт
        this.player = this.add.rectangle(x, y, 32, 32, 0xFFFFFF);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        
        // Додаємо ім'я над гравцем
        this.playerNameText = this.add.text(x, y - 25, 
            window.gameState.playerName, {
                fontSize: '12px',
                fill: '#000',
                backgroundColor: '#fff'
            }).setOrigin(0.5);
        
        // Швидкість руху
        this.playerSpeed = 160;
    }

    createUI() {
        // Час
        this.timeText = this.add.text(10, 10, '', {
            fontSize: '18px',
            fill: '#fff',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(100);
        
        // Ресурси
        this.resourcesText = this.add.text(10, 40, '', {
            fontSize: '14px',
            fill: '#fff',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(100);
        
        // Міні-карта
        this.createMinimap();
        
        // Кнопка телефону
        this.phoneButton = this.add.text(750, 520, '📱', {
            fontSize: '32px'
        }).setScrollFactor(0).setDepth(100)
          .setInteractive()
          .on('pointerdown', () => this.openPhone());
    }

    createMinimap() {
        const minimapWidth = 160;
        const minimapHeight = 110;
        const x = 800 - minimapWidth - 10;
        const y = 10;
        
        this.minimap = this.add.graphics();
        this.minimap.setScrollFactor(0).setDepth(100);
        
        // Фон міні-карти
        this.minimap.fillStyle(0x000000, 0.5);
        this.minimap.fillRect(x, y, minimapWidth, minimapHeight);
        
        // Білий прямокутник
        this.minimap.lineStyle(2, 0xFFFFFF);
        this.minimap.strokeRect(x, y, minimapWidth, minimapHeight);
        
        // Позиція гравця на міні-карті
        this.minimapPlayer = this.add.rectangle(x, y, 4, 4, 0xFF0000);
        this.minimapPlayer.setScrollFactor(0).setDepth(101);
    }

    createMobileControls() {
        // Визначення мобільного пристрою
        if (!this.sys.game.device.os.android && 
            !this.sys.game.device.os.iOS) return;
        
        // Віртуальний джойстик
        const joystickRadius = 50;
        const joystickX = 80;
        const joystickY = this.cameras.main.height - 80;
        
        const joystickBase = this.add.circle(joystickX, joystickY, 
            joystickRadius, 0x000000, 0.3)
            .setScrollFactor(0).setDepth(200);
        
        const joystickThumb = this.add.circle(joystickX, joystickY, 
            20, 0xFFFFFF, 0.5)
            .setScrollFactor(0).setDepth(201)
            .setInteractive({ draggable: true });
        
        // Кнопка взаємодії
        const interactButton = this.add.circle(
            this.cameras.main.width - 60,
            this.cameras.main.height - 60,
            30, 0x00FF00, 0.5
        ).setScrollFactor(0).setDepth(200)
         .setInteractive();
        
        interactButton.on('pointerdown', () => {
            this.handleInteraction();
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
    }

    update(time, delta) {
        // Рух гравця
        this.handleMovement();
        
        // Оновлення UI
        this.updateUI();
        
        // Оновлення інших гравців
        this.updateOtherPlayers();
        
        // Оновлення міні-карти
        this.updateMinimap();
        
        // Надсилання позиції іншим гравцям
        this.syncPosition();
    }

    handleMovement() {
        let vx = 0;
        let vy = 0;
        
        // Клавіатура
        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
        
        // Джойстик
        if (this.joystickVector) {
            vx = this.joystickVector.x;
            vy = this.joystickVector.y;
        }
        
        // Нормалізація
        if (vx !== 0 && vy !== 0) {
            const length = Math.sqrt(vx * vx + vy * vy);
            vx /= length;
            vy /= length;
        }
        
        // Застосування швидкості
        this.player.body.setVelocity(
            vx * this.playerSpeed,
            vy * this.playerSpeed
        );
        
        // Оновлення позиції імені
        this.playerNameText.setPosition(
            this.player.x,
            this.player.y - 25
        );
    }

    updateUI() {
        // Час
        this.timeText.setText(this.timeSystem.getFormattedTime());
        
        // Ресурси
        const res = window.gameState.resources;
        this.resourcesText.setText(
            `💰 ${res.coins}  💳 ${res.cardBalance}  ⚡ ${res.energy}%`
        );
        
        // Нічний ефект
        if (this.timeSystem.isNight) {
            if (!this.nightOverlay) {
                this.nightOverlay = this.add.rectangle(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY,
                    this.cameras.main.width,
                    this.cameras.main.height,
                    0x000033, 0.3
                ).setScrollFactor(0).setDepth(99);
            }
        } else if (this.nightOverlay) {
            this.nightOverlay.destroy();
            this.nightOverlay = null;
        }
    }

    updateMinimap() {
        const minimapWidth = 160;
        const minimapHeight = 110;
        const minimapX = 800 - minimapWidth - 10;
        const minimapY = 10;
        
        // Масштабування позиції гравця на міні-карту
        const scaleX = minimapWidth / this.mapWidth;
        const scaleY = minimapHeight / this.mapHeight;
        
        this.minimapPlayer.setPosition(
            minimapX + this.player.x * scaleX,
            minimapY + this.player.y * scaleY
        );
    }

    syncPosition() {
        // Надсилати позицію 10 разів на секунду (кожні 100ms)
        if (this.lastSyncTime && Date.now() - this.lastSyncTime < 100) return;
        
        this.lastSyncTime = Date.now();
        
        window.networkManager.sendPlayerMove(
            this.player.x,
            this.player.y,
            '', // direction
            ''  // animation
        );
    }

    handleInteraction() {
        // Перевірка взаємодії з дверима будинків
        console.log('Взаємодія!');
        
        // Тут буде логіка входу в будинок, діалоги з NPC тощо
    }

    openPhone() {
        // Показати меню телефону
        this.scene.pause();
        this.scene.launch('PhoneScene');
    }

    setupNetworkListeners() {
        // Отримання даних про нових гравців
        window.networkManager.handleData = (peerId, data) => {
            if (data.type === 'player_move') {
                if (this.otherPlayers.has(peerId)) {
                    const player = this.otherPlayers.get(peerId);
                    player.setPosition(data.x, data.y);
                    player.nameText.setPosition(data.x, data.y - 25);
                }
            } else if (data.type === 'player_join') {
                this.addOtherPlayer(peerId, data.playerData);
            }
        };
    }

    addOtherPlayer(peerId, playerData) {
        if (this.otherPlayers.has(peerId)) return;
        
        const player = this.add.rectangle(
            playerData.x, playerData.y, 32, 32, 0xFF0000
        );
        
        const nameText = this.add.text(
            playerData.x, playerData.y - 25,
            playerData.name, {
                fontSize: '12px',
                fill: '#000',
                backgroundColor: '#fff'
            }
        ).setOrigin(0.5);
        
        player.nameText = nameText;
        this.otherPlayers.set(peerId, player);
    }

    loadExistingPlayers() {
        // Завантажити гравців, які вже в кімнаті
        window.gameState.players.forEach((data, peerId) => {
            if (peerId !== window.networkManager.playerId) {
                this.addOtherPlayer(peerId, data);
            }
        });
    }

    updateOtherPlayers() {
        // Оновлення позицій інших гравців відбувається через networkManager.handleData
    }

    shutdown() {
        this.timeSystem.stop();
        window.networkManager?.disconnect?.();
    }
}
