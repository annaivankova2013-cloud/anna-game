// Чекаємо завантаження сторінки
window.addEventListener('load', function() {
    console.log('🚀 Сторінка завантажена, запускаємо гру...');
    
    // Перевіряємо Phaser
    if (typeof Phaser === 'undefined') {
        document.getElementById('loading-text').textContent = 'Помилка: Phaser не завантажився';
        console.error('Phaser не знайдено');
        return;
    }
    
    console.log('✅ Phaser версія:', Phaser.VERSION);
    
    // Конфігурація гри
    var config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: 'game-container',
        backgroundColor: '#87CEEB',
        scene: {
            create: create
        }
    };
    
    // Створюємо гру
    var game = new Phaser.Game(config);
    
    function create() {
        console.log('🎮 Створюємо сцену...');
        
        // Приховуємо екран завантаження
        document.getElementById('loading-screen').style.display = 'none';
        
        // Малюємо простий фон
        var graphics = this.add.graphics();
        
        // Зелена трава
        graphics.fillStyle(0x4CAF50, 1);
        graphics.fillRect(0, 0, 800, 600);
        
        // Синє небо зверху
        graphics.fillStyle(0x87CEEB, 1);
        graphics.fillRect(0, 0, 800, 50);
        
        // Дорога
        graphics.fillStyle(0x666666, 1);
        graphics.fillRect(0, 300, 800, 80);
        
        // Біла розмітка
        graphics.fillStyle(0xFFFFFF, 1);
        for (var i = 0; i < 800; i += 40) {
            graphics.fillRect(i, 338, 20, 4);
        }
        
        // Будинок
        graphics.fillStyle(0xFF5722, 1);
        graphics.fillRect(100, 200, 120, 100);
        graphics.fillStyle(0x795548, 1);
        graphics.fillRect(140, 250, 40, 50);
        graphics.fillStyle(0x2196F3, 1);
        graphics.fillRect(115, 215, 25, 25);
        graphics.fillRect(180, 215, 25, 25);
        
        // Ще один будинок
        graphics.fillStyle(0x9C27B0, 1);
        graphics.fillRect(500, 200, 120, 100);
        graphics.fillStyle(0x795548, 1);
        graphics.fillRect(540, 250, 40, 50);
        graphics.fillStyle(0x2196F3, 1);
        graphics.fillRect(515, 215, 25, 25);
        graphics.fillRect(580, 215, 25, 25);
        
        // Дерева
        for (var i = 0; i < 10; i++) {
            var treeX = 50 + i * 75;
            // Стовбур
            graphics.fillStyle(0x795548, 1);
            graphics.fillRect(treeX - 5, 420, 10, 40);
            // Крона
            graphics.fillStyle(0x4CAF50, 1);
            graphics.fillCircle(treeX, 410, 20);
        }
        
        // Текст
        this.add.text(400, 30, '☀️ ЛІТО І ДИТИНСТВО', {
            fontSize: '28px',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.add.text(400, 70, 'Гра успішно запущена! 🎉', {
            fontSize: '16px',
            fill: '#FFFFFF'
        }).setOrigin(0.5);
        
        this.add.text(400, 400, '🏠 Житловий район', {
            fontSize: '14px',
            fill: '#FFFFFF',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);
        
        this.add.text(400, 500, 'Використовуйте WASD або стрілки для руху', {
            fontSize: '14px',
            fill: '#FFFFFF',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);
        
        // Створюємо гравця (простий квадрат)
        var player = this.add.rectangle(400, 450, 30, 30, 0xFFD700);
        
        // Додаємо фізику
        this.physics.add.existing(player);
        
        // Налаштування камери
        this.cameras.main.startFollow(player);
        
        // Управління
        var cursors = this.input.keyboard.createCursorKeys();
        var wasd = {
            up: this.input.keyboard.addKey('W'),
            down: this.input.keyboard.addKey('S'),
            left: this.input.keyboard.addKey('A'),
            right: this.input.keyboard.addKey('D')
        };
        
        // Оновлення кожен кадр
        this.events.on('update', function() {
            var speed = 200;
            
            if (cursors.left.isDown || wasd.left.isDown) {
                player.x -= speed * (1/60);
            }
            if (cursors.right.isDown || wasd.right.isDown) {
                player.x += speed * (1/60);
            }
            if (cursors.up.isDown || wasd.up.isDown) {
                player.y -= speed * (1/60);
            }
            if (cursors.down.isDown || wasd.down.isDown) {
                player.y += speed * (1/60);
            }
        });
        
        console.log('✅ Все готово! Гра працює!');
    }
});
