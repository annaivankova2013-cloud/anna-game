// Створюємо гру тільки після повного завантаження сторінки
window.onload = function() {
    
    // Ігровий клас
    class SummerGame extends Phaser.Scene {
        constructor() {
            super('SummerGame');
            this.player = null;
            this.cursors = null;
        }
        
        preload() {
            // Створюємо текстури програмно
            this.createTextures();
        }
        
        createTextures() {
            // Текстура гравця
            var playerGraphics = this.make.graphics({ add: false });
            playerGraphics.fillStyle(0xFFD700, 1);
            playerGraphics.fillRect(0, 0, 32, 32);
            playerGraphics.generateTexture('player', 32, 32);
            playerGraphics.destroy();
        }
        
        create() {
            var self = this;
            
            // Встановлюємо фон
            this.cameras.main.setBackgroundColor('#87CEEB');
            
            // Малюємо світ
            var graphics = this.add.graphics();
            
            // Трава
            graphics.fillStyle(0x4CAF50, 1);
            graphics.fillRect(0, 0, 3200, 2200);
            
            // Дорога
            graphics.fillStyle(0x666666, 1);
            graphics.fillRect(0, 300, 3200, 60);
            
            // Розмітка на дорозі
            graphics.fillStyle(0xFFFFFF, 1);
            for (var i = 0; i < 3200; i += 40) {
                graphics.fillRect(i, 328, 20, 4);
            }
            
            // Будинки
            var colors = [0xFF6347, 0x87CEEB, 0x98FB98, 0xFFD700, 0xFF69B4];
            for (var i = 0; i < 5; i++) {
                var x = 100 + i * 200;
                graphics.fillStyle(colors[i], 1);
                graphics.fillRect(x, 180, 100, 80);
                graphics.fillStyle(0x654321, 1);
                graphics.fillRect(x + 35, 220, 30, 40);
                graphics.fillStyle(0xADD8E6, 1);
                graphics.fillRect(x + 10, 195, 20, 20);
                graphics.fillRect(x + 70, 195, 20, 20);
            }
            
            // Дерева
            for (var i = 0; i < 50; i++) {
                var treeX = Phaser.Math.Between(50, 3150);
                var treeY = Phaser.Math.Between(100, 2100);
                
                graphics.fillStyle(0x795548, 1);
                graphics.fillRect(treeX - 5, treeY, 10, 30);
                graphics.fillStyle(0x228B22, 1);
                graphics.fillCircle(treeX, treeY - 10, 15);
            }
            
            // Річка
            graphics.fillStyle(0x4488FF, 0.7);
            graphics.fillRect(0, 500, 3200, 60);
            
            // Створюємо гравця
            this.player = this.physics.add.sprite(400, 250, 'player');
            this.player.setCollideWorldBounds(true);
            
            // Камера
            this.cameras.main.setBounds(0, 0, 3200, 2200);
            this.cameras.main.startFollow(this.player);
            
            // Управління
            this.cursors = this.input.keyboard.createCursorKeys();
            
            // UI текст
            var uiText = this.add.text(400, 20, '☀️ ЛІТО І ДИТИНСТВО', {
                fontSize: '20px',
                fill: '#FFFFFF',
                backgroundColor: '#00000088',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5).setScrollFactor(0);
            
            var controls = this.add.text(400, 560, 'Використовуйте СТРІЛКИ для руху', {
                fontSize: '14px',
                fill: '#FFFFFF',
                backgroundColor: '#00000088',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5).setScrollFactor(0);
            
            console.log('✅ Гра успішно запущена!');
        }
        
        update() {
            if (!this.player || !this.cursors) return;
            
            var speed = 200;
            
            if (this.cursors.left.isDown) {
                this.player.setVelocityX(-speed);
            } else if (this.cursors.right.isDown) {
                this.player.setVelocityX(speed);
            } else {
                this.player.setVelocityX(0);
            }
            
            if (this.cursors.up.isDown) {
                this.player.setVelocityY(-speed);
            } else if (this.cursors.down.isDown) {
                this.player.setVelocityY(speed);
            } else {
                this.player.setVelocityY(0);
            }
        }
    }
    
    // Конфігурація гри
    var config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: 'game-container',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scene: SummerGame
    };
    
    // Запускаємо гру
    try {
        var game = new Phaser.Game(config);
        console.log('🎮 Phaser гру створено');
    } catch (error) {
        console.error('❌ Помилка:', error);
        document.body.innerHTML = '<div style="color:white;text-align:center;padding:50px;">' +
            '<h1>Помилка запуску гри</h1>' +
            '<p>' + error.message + '</p>' +
            '<p>Перевірте консоль браузера (F12)</p>' +
            '</div>';
    }
};
