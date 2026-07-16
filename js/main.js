-- Створення таблиці кімнат
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT DEFAULT '',
    host_id TEXT NOT NULL,
    players_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Увімкнення Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Політика для читання (всі можуть читати)
CREATE POLICY "Allow public read" ON rooms
    FOR SELECT USING (true);

-- Політика для вставки (всі можуть створювати кімнати)
CREATE POLICY "Allow public insert" ON rooms
    FOR INSERT WITH CHECK (true);

-- Політика для оновлення (всі можуть оновлювати)
CREATE POLICY "Allow public update" ON rooms
    FOR UPDATE USING (true);

-- Політика для видалення (всі можуть видаляти)
CREATE POLICY "Allow public delete" ON rooms
    FOR DELETE USING (true);
