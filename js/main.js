// Функція динамічного завантаження скриптів
function loadScript(src) {
    return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Функція створення та запуску гри
function startGame() {
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
        g.fillRect(1200, 490, 100, 80);
        g.fillRect(2000, 490, 100, 80);
        g.fillRect(2800, 490, 100, 80);
        
        // Будинки (16 штук)
        var colors = [
            0xFF6347, 0x87CEEB, 0x98FB98, 0xFFD700, 
            0xFF69B4, 0xDDA0DD, 0xF0E68C, 0xFFA07A,
            0x20B2AA, 0x778899, 0xB0C4DE, 0xFFB6C1,
            0x00CED1, 0x9370DB, 0x3CB371, 0xCD853F
        ];
        
        for (var i = 0; i < 16; i++) {
            var x, y;
            if (i < 8) {
                x = 50 + (i % 4) * 120;
                y = 120 + Math.floor(i / 4) * 150;
            } else {
                x = 2000 + ((i - 8) % 4) * 120;
                y = 120 + Math.floor((i - 8) / 4) * 150;
            }
            
            g.fillStyle(colors[i]);
            g.fillRect(x, y, 90, 80);
            g.fillStyle(0x8B4513);
            g.fillTriangle(x - 5, y, x + 45, y - 25, x + 95, y);
            g.fillStyle(0x654321);
            g.fillRect(x + 30, y + 40, 30, 40);
            g.fillStyle(0xADD8E6);
            g.fillRect(x + 10, y + 15, 20, 20);
            g.fillRect(x + 60, y + 15, 20, 20);
        }
        
        // Школа
        g.fillStyle(0xFFD700);
        g.fillRect(2400, 180, 180, 130);
        g.fillStyle(0xFFA500);
        g.fillRect(2440, 140, 100, 40);
        this.add.text(2490, 240, '🏫 Школа', {
            fontSize: '16px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Магазин
        g.fillStyle(0xFF6B6B);
        g.fillRect(100, 1350, 130, 100);
        this.add.text(165, 1400, '🛒 Магазин', {
            fontSize: '14px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Парк
        g.fillStyle(0x90EE90, 0.5);
        g.fillRect(2600, 700, 400, 400);
        this.add.text(2800, 900, '🎡 Парк Розваг', {
            fontSize: '18px',
            fill: '#000',
            backgroundColor: '#ffffff88'
        }).setOrigin(0.5);
        
        // Кафе
        g.fillStyle(0xFFB6C1);
        g.fillRect(1800, 1350, 110, 90);
        this.add.text(1855, 1395, '☕ Кафе', {
            fontSize: '14px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Бібліотека
        g.fillStyle(0xDEB887);
        g.fillRect(2100, 1350, 120, 100);
        this.add.text(2160, 1400, '📚 Бібліотека', {
            fontSize: '14px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Майданчик
        g.fillStyle(0x98FB98, 0.7);
        g.fillRect(2700, 1350, 180, 130);
        this.add.text(2790, 1415, '🛝 Майданчик', {
            fontSize: '14px',
            fill: '#000'
        }).setOrigin(0.5);
        
        // Дерева
        for (var i = 0; i < 150; i++) {
            var treeX = Phaser.Math.Between(50, 3150);
            var treeY = Phaser.Math.Between(120, 2150);
            g.fillStyle(0x795548);
            g.fillRect(treeX - 4, treeY, 8, 25);
            g.fillStyle(0x228B22);
            g.fillCircle(treeX, treeY - 8, 12);
        }
        
        // Квіти
        for (var i = 0; i < 200; i++) {
            var flowerX = Phaser.Math.Between(50, 3150);
            var flowerY = Phaser.Math.Between(120, 2150);
            var flowerColors = [0xFF1493, 0xFFD700, 0xFF4500, 0x9400D3, 0x00CED1];
            g.fillStyle(flowerColors[Math.floor(Math.random() * flowerColors.length)], 0.8);
            g.fillCircle(flowerX, flowerY, 3);
        }
        
        // Створюємо гравця
        var playerGraphics = this.make.graphics({ add: false });
        playerGraphics.fillStyle(0xFFD700);
        playerGraphics.fillRect(0, 0, 32, 32);
        playerGraphics.generateTexture('player', 32, 32);
        playerGraphics.destroy();
        
        player = this.physics.add.sprite(400, 250, 'player');
        player.setCollideWorldBounds(true);
        
        // Ім'я гравця
        this.add.text(400, 220, '👤 Гравець', {
            fontSize: '12px',
            fill: '#FFFFFF',
            backgroundColor: '#00000088',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5);
        
        // Камера
        this.cameras.main.setBounds(0, 0, 3200, 2200);
        this.cameras.main.startFollow(player);
        this.cameras.main.setZoom(1.1);
        
        // Управління
        cursors = this.input.keyboard.createCursorKeys();
        wasd = {
            up: this.input.keyboard.addKey('W'),
            down: this.input.keyboard.addKey('S'),
            left: this.input.keyboard.addKey('A'),
            right: this.input.keyboard.addKey('D')
        };
        
        // E - взаємодія
        var keyE = this.input.keyboard.addKey('E');
        keyE.on('down', function() {
            alert('🤝 Взаємодія!\n\nВи можете:\n• Сісти в автобус\n• Зайти в будинок\n• Поговорити з NPC');
        });
        
        // UI панель зверху
        this.add.rectangle(400, 0, 800, 50, 0x000000, 0.6).setScrollFactor(0).setDepth(100);
        
        this.add.text(10, 5, '🕐 08:00', {
            fontSize: '14px',
            fill: '#FFFFFF',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0).setDepth(101);
        
        this.add.text(150, 5, '💰 15 | 💳 50 | ⚡ 100%', {
            fontSize: '14px',
            fill: '#FFFFFF',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0).setDepth(101);
        
        this.add.text(400, 5, '☀️ Літо і Дитинство', {
            fontSize: '14px',
            fill: '#FFFFFF'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
        
        // Підказки знизу
        this.add.text(10, 570, 'WASD/Стрілки - рух | E - дія', {
            fontSize: '12px',
            fill: '#FFFFFF',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0).setDepth(100);
        
        // Телефон
        var phone = this.add.text(750, 530, '📱', {
            fontSize: '36px'
        }).setScrollFactor(0).setDepth(100).setInteractive();
        
        phone.on('pointerdown', function() {
            var choice = confirm(
                '📱 ТЕЛЕФОН\n\n' +
                '1. 💬 Чат\n' +
                '2. 💳 Баланс\n' +
                '3. 😴 Спати\n' +
                '4. 👤 Профіль\n\n' +
                'Натисніть OK для профілю'
            );
            if (choice) {
                alert('👤 ПРОФІЛЬ\n\n' +
                    'Ім\'я: Гравець\n' +
                    '💰 Монети: 15\n' +
                    '💳 Картка: 50\n' +
                    '⚡ Енергія: 100%');
            }
        });
        
        // Міні-карта
        var minimapWidth = 150;
        var minimapHeight = 100;
        var minimapX = 790 - minimapWidth;
        var minimapY = 55;
        
        var minimap = this.add.graphics();
        minimap.setScrollFactor(0).setDepth(100);
        minimap.fillStyle(0x000000, 0.7);
        minimap.fillRect(minimapX, minimapY, minimapWidth, minimapHeight);
        minimap.lineStyle(2, 0xFFFFFF);
        minimap.strokeRect(minimapX, minimapY, minimapWidth, minimapHeight);
        
        var minimapDot = this.add.circle(minimapX + 10, minimapY + 10, 3, 0xFF0000);
        minimapDot.setScrollFactor(0).setDepth(101);
        
        // Оновлення міні-карти
        this.events.on('update', function() {
            if (player && minimapDot) {
                minimapDot.setPosition(
                    minimapX + (player.x / 3200) * minimapWidth,
                    minimapY + (player.y / 2200) * minimapHeight
                );
            }
        });
        
        console.log('✅ Гра успішно запущена!');
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
        
        // Нормалізація діагонального руху
        if (vx !== 0 && vy !== 0) {
            var length = Math.sqrt(vx * vx + vy * vy);
            vx /= length;
            vy /= length;
        }
        
        player.setVelocity(vx * speed, vy * speed);
    }
}

// Основна логіка запуску
window.addEventListener('load', function() {
    console.log('📄 Сторінка завантажена');
    
    // Перевіряємо чи є Phaser
    if (typeof Phaser !== 'undefined') {
        console.log('✅ Phaser вже завантажено');
        // Затримка 2 секунди для надійності
        setTimeout(function() {
            console.log('⏰ Затримка пройшла, запускаємо гру');
            startGame();
        }, 2000);
    } else {
        console.log('📦 Phaser не знайдено, завантажуємо динамічно...');
        
        // Завантажуємо бібліотеки динамічно
        Promise.all([
            loadScript('https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js'),
            loadScript('https://unpkg.com/peerjs@1.5.1/dist/peerjs.min.js')
        ]).then(function() {
            console.log('✅ Бібліотеки завантажено');
            // Затримка 2 секунди перед запуском
            setTimeout(function() {
                console.log('⏰ Затримка пройшла, запускаємо гру');
                startGame();
            }, 2000);
        }).catch(function(error) {
            console.error('❌ Помилка завантаження бібліотек:', error);
            var loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.innerHTML = '❌ Помилка завантаження. Перевірте інтернет.';
                loadingEl.style.color = '#ff4444';
            }
        });
    }
});
