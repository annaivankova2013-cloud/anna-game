// Чиста ініціалізація гри без перевірок
var config = {
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
    scene: {
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var player;
var cursors;
var wasd;

function create() {
    // Ховаємо завантаження
    var loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
    
    // Фон
    this.cameras.main.setBackgroundColor('#87CEEB');
    
    // Малюємо світ
    var g = this.add.graphics();
    
    // Трава
    g.fillStyle(0x4CAF50);
    g.fillRect(0, 100, 3200, 2100);
    
    // Дороги
    g.fillStyle(0x666666);
    g.fillRect(0, 300, 3200, 70);
    g.fillRect(800, 0, 70, 2200);
    
    // Розмітка
    g.fillStyle(0xFFFFFF);
    for (var i = 0; i < 3200; i += 40) {
        g.fillRect(i, 333, 20, 4);
    }
    
    // Річка
    g.fillStyle(0x4488FF, 0.7);
    g.fillRect(0, 500, 3200, 60);
    
    // Міст
    g.fillStyle(0x8B4513);
    g.fillRect(400, 490, 100, 80);
    
    // Будинки
    var colors = [0xFF6347, 0x87CEEB, 0x98FB98, 0xFFD700, 0xFF69B4, 0xDDA0DD, 0xF0E68C, 0xFFA07A];
    for (var i = 0; i < 8; i++) {
        var x = 50 + i * 100;
        g.fillStyle(colors[i]);
        g.fillRect(x, 180, 80, 70);
        g.fillStyle(0x654321);
        g.fillRect(x + 25, 210, 30, 40);
        g.fillStyle(0xADD8E6);
        g.fillRect(x + 10, 190, 15, 15);
        g.fillRect(x + 55, 190, 15, 15);
    }
    
    // Дерева
    for (var i = 0; i < 100; i++) {
        var treeX = Phaser.Math.Between(50, 3150);
        var treeY = Phaser.Math.Between(120, 2150);
        g.fillStyle(0x795548);
        g.fillRect(treeX - 4, treeY, 8, 25);
        g.fillStyle(0x228B22);
        g.fillCircle(treeX, treeY - 8, 12);
    }
    
    // Створюємо гравця
    var playerGraphics = this.make.graphics({ add: false });
    playerGraphics.fillStyle(0xFFD700);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();
    
    player = this.physics.add.sprite(400, 250, 'player');
    player.setCollideWorldBounds(true);
    
    // Камера
    this.cameras.main.setBounds(0, 0, 3200, 2200);
    this.cameras.main.startFollow(player);
    
    // Управління
    cursors = this.input.keyboard.createCursorKeys();
    wasd = {
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
    
    this.add.text(10, 560, 'WASD/Стрілки - рух', {
        fontSize: '14px',
        fill: '#FFFFFF',
        backgroundColor: '#00000088',
        padding: { x: 10, y: 5 }
    }).setScrollFactor(0).setDepth(100);
    
    // Телефон
    var phone = this.add.text(750, 540, '📱', {
        fontSize: '32px'
    }).setScrollFactor(0).setDepth(100).setInteractive();
    
    phone.on('pointerdown', function() {
        alert('📱 Телефон\n\nМонети: 💰 15\nКартка: 💳 50\nЕнергія: ⚡ 100%');
    });
}

function update() {
    if (!player) return;
    
    var speed = 200;
    var vx = 0;
    var vy = 0;
    
    if (cursors.left.isDown || wasd.left.isDown) vx = -1;
    if (cursors.right.isDown || wasd.right.isDown) vx = 1;
    if (cursors.up.isDown || wasd.up.isDown) vy = -1;
    if (cursors.down.isDown || wasd.down.isDown) vy = 1;
    
    player.setVelocity(vx * speed, vy * speed);
}
