// Чекаємо повного завантаження ВСІХ бібліотек
window.addEventListener('load', function() {
    
    console.log('📦 Сторінка завантажена');
    console.log('Phaser:', typeof Phaser !== 'undefined' ? '✅' : '❌');
    console.log('PeerJS:', typeof Peer !== 'undefined' ? '✅' : '❌');
    console.log('Supabase:', typeof supabase !== 'undefined' ? '✅' : '❌');
    
    // Ховаємо напис завантаження
    document.getElementById('loading').style.display = 'none';
    
    // Перевірка Phaser
    if (typeof Phaser === 'undefined') {
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = 'Помилка: Phaser не завантажився. Перевірте інтернет.';
        return;
    }
    
    // Створюємо просту сцену
    class GameScene extends Phaser.Scene {
        constructor() {
            super('GameScene');
            this.player = null;
        }
        
        create() {
            const { width, height } = this.cameras.main;
            
            // Фон
            this.cameras.main.setBackgroundColor('#87CEEB');
            
            // Малюємо світ
            const g = this.add.graphics();
            
            // Трава
            g.fillStyle(0x4CAF50);
            g.fillRect(0, 100, 3200, 2100);
            
            // Дороги
            g.fillStyle(0x666666);
            g.fillRect(0, 300, 3200, 70);
            g.fillRect(800, 0, 70, 2200);
            
            // Розмітка
            g.fillStyle(0xFFFFFF);
            for (let i = 0; i < 3200; i += 40) {
                g.fillRect(i, 333, 20, 4);
            }
            
            // Річка
            g.fillStyle(0x4488FF, 0.7);
            g.fillRect(0, 500, 3200, 60);
            
            // Міст
            g.fillStyle(0x8B4513);
            g.fillRect(400, 490, 100, 80);
            
            // Будинки
            const colors = [0xFF6347, 0x87CEEB, 0x98FB98, 0xFFD700, 0xFF69B4, 0xDDA0DD, 0xF0E68C, 0xFFA07A];
            for (let i = 0; i < 8; i++) {
                const x = 50 + i * 100;
                g.fillStyle(colors[i]);
                g.fillRect(x, 180, 80, 70);
                g.fillStyle(0x654321);
                g.fillRect(x + 25, 210, 30, 40);
                g.fillStyle(0xADD8E6);
                g.fillRect(x + 10, 190, 15, 15);
                g.fillRect(x + 55, 190, 15, 15);
            }
            
            // Дерева
            for (let i = 0; i < 100; i++) {
                const x = Phaser.Math.Between(50, 3150);
                const y = Phaser.Math.Between(120, 2150);
                g.fillStyle(0x795548);
                g.fillRect(x - 4, y, 8, 25);
                g.fillStyle(0x228B22);
                g.fillCircle(x, y - 8, 12);
            }
            
            // Створюємо гравця (простий спрайт)
            const playerGraphics = this.make.graphics({ add: false });
            playerGraphics.fillStyle(0xFFD700);
            playerGraphics.fillRect(0, 0, 32, 32);
            playerGraphics.generateTexture('player', 32, 32);
            playerGraphics.destroy();
            
            this.player = this.physics.add.sprite(400, 250, 'player');
            this.player.setCollideWorldBounds(true);
            
            // Камера слідує за гравцем
            this.cameras.main.setBounds(0, 0, 3200, 2200);
            this.cameras.main.startFollow(this.player);
            
            // Управління
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = {
                up: this.input.keyboard.addKey('W'),
                down: this.input.keyboard.addKey('S'),
                left: this.input.keyboard.addKey('A'),
                right: this.input.keyboard.addKey('D')
            };
            
            // UI
            this.add.text(10, 10, '☀️ Літо і Дитинство', {
                fontSize: '18px',
                fill: '#FFFFFF',
                backgroundColor: '#00000088',
                padding: { x: 10, y: 5 }
            }).setScrollFactor(0).setDepth(100);
            
            this.add.text(10, 560, 'WASD/Стрілки - рух | E - телефон', {
                fontSize: '14px',
                fill: '#FFFFFF',
                backgroundColor: '#00000088',
                padding: { x: 10, y: 5 }
            }).setScrollFactor(0).setDepth(100);
            
            // Кнопка телефону
            const phone = this.add.text(750, 540, '📱', {
                fontSize: '32px'
            }).setScrollFactor(0).setDepth(100).setInteractive();
            
            phone.on('pointerdown', () => {
                alert('📱 Телефон\n\nМонети: 💰 15\nКартка: 💳 50\nЕнергія: ⚡ 100%');
            });
            
            // Клавіша E
            this.input.keyboard.addKey('E').on('down', () => {
                alert('🔔 Взаємодія!\nВи натиснули клавішу E');
            });
            
            console.log('✅ Гра запущена успішно!');
        }
        
        update() {
            if (!this.player) return;
            
            const speed = 200;
            let vx = 0;
            let vy = 0;
            
            if (this.cursors?.left.isDown || this.wasd?.left.isDown) vx = -1;
            if (this.cursors?.right.isDown || this.wasd?.right.isDown) vx = 1;
            if (this.cursors?.up.isDown || this.wasd?.up.isDown) vy = -1;
            if (this.cursors?.down.isDown || this.wasd?.down.isDown) vy = 1;
            
            this.player.setVelocity(vx * speed, vy * speed);
        }
    }
    
    // Конфігурація
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
        scene: GameScene
    };
    
    // Запуск
    const game = new Phaser.Game(config);
    console.log('🎮 Гра створена!');
});
