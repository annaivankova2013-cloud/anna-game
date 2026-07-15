export class TimeSystem {
    constructor() {
        this.hour = 8;
        this.minute = 0;
        this.timeSpeed = 1500; // 1.5 секунди = 1 ігрова хвилина
        this.timer = null;
        this.isNight = false;
        this.periodIcons = {
            morning: '🌅',
            breakfast: '🥞',
            school: '🚶',
            lessons: '🏫',
            lunch: '🍲',
            freeTime: '🎮',
            dinner: '🍽️',
            evening: '🌆',
            sleep: '😴',
            night: '🌙'
        };
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

        // Оновлення глобального стану
        window.gameState.gameTime = {
            hour: this.hour,
            minute: this.minute
        };

        // Перевірка ночі
        this.isNight = (this.hour >= 23 || this.hour < 7);

        // Синхронізація з іншими гравцями
        if (window.networkManager?.isHost) {
            window.networkManager.syncGameTime();
        }
    }

    getCurrentPeriod() {
        if (this.hour >= 7 && this.hour < 8) return 'morning';
        if (this.hour >= 8 && this.hour < 9) return 'breakfast';
        if (this.hour >= 9 && this.hour < 10) return 'school';
        if (this.hour >= 10 && this.hour < 13) return 'lessons';
        if (this.hour >= 13 && this.hour < 14) return 'lunch';
        if (this.hour >= 14 && this.hour < 18) return 'freeTime';
        if (this.hour >= 18 && this.hour < 19) return 'dinner';
        if (this.hour >= 19 && this.hour < 22) return 'evening';
        if (this.hour >= 22 && this.hour < 23) return 'sleep';
        return 'night';
    }

    getTimeString() {
        return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
    }

    getFormattedTime() {
        return `${this.getTimeString()} ${this.periodIcons[this.getCurrentPeriod()]}`;
    }

    // Швидкий перехід до ранку
    skipToMorning() {
        this.hour = 7;
        this.minute = 0;
        this.isNight = false;
        
        // Відновити енергію
        window.gameState.resources.energy = 100;
        
        // Синхронізувати
        if (window.networkManager?.isHost) {
            window.networkManager.syncGameTime();
        }
    }

    setTime(hour, minute = 0) {
        this.hour = hour;
        this.minute = minute;
    }
}
