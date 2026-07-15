export class NetworkManager {
    constructor(supabaseConfig) {
        this.peer = null;
        this.connections = new Map();
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        
        // Ініціалізація Supabase для списку кімнат
        this.supabase = window.supabase?.createClient(
            supabaseConfig.url,
            supabaseConfig.anonKey
        );
    }

    async init(playerName) {
        this.playerId = `${playerName}_${Date.now()}`;
        
        return new Promise((resolve) => {
            this.peer = new Peer(this.playerId, {
                debug: 2
            });

            this.peer.on('open', (id) => {
                console.log('PeerJS підключено з ID:', id);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS помилка:', err);
                // Спробувати перепідключитись через TURN сервер
                if (err.type === 'network' || err.type === 'socket-error') {
                    this.initWithTURNServer(playerName);
                }
            });
        });
    }

    initWithTURNServer(playerName) {
        // Резервний варіант з TURN сервером (потрібен безкоштовний TURN сервер)
        const TURN_SERVER = {
            host: 'your-turn-server.com',
            port: 3478,
            username: 'username',
            credential: 'password'
        };
        
        this.peer = new Peer(`${playerName}_${Date.now()}`, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    {
                        urls: `turn:${TURN_SERVER.host}:${TURN_SERVER.port}`,
                        username: TURN_SERVER.username,
                        credential: TURN_SERVER.credential
                    }
                ]
            }
        });
    }

    async createRoom(roomName, password = '') {
        this.roomId = `${roomName}_${Date.now()}`;
        this.isHost = true;
        
        // Зберегти кімнату в Supabase
        if (this.supabase) {
            await this.supabase.from('rooms').insert({
                id: this.roomId,
                name: roomName,
                password: password,
                host_id: this.playerId,
                players_count: 1,
                created_at: new Date()
            });
        }
        
        return this.roomId;
    }

    async joinRoom(roomId, password = '') {
        this.roomId = roomId;
        this.isHost = false;
        
        // Підключитись до хоста
        const conn = this.peer.connect(roomId, {
            reliable: true,
            metadata: { type: 'join', password }
        });
        
        this.handleConnection(conn);
        return roomId;
    }

    async getRoomList() {
        if (!this.supabase) return [];
        
        const { data, error } = await this.supabase
            .from('rooms')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        return data || [];
    }

    handleConnection(conn) {
        conn.on('open', () => {
            console.log('З\'єднання встановлено з:', conn.peer);
            this.connections.set(conn.peer, conn);
            
            // Прийом даних
            conn.on('data', (data) => {
                this.handleData(conn.peer, data);
            });
        });

        conn.on('close', () => {
            console.log('З\'єднання закрито:', conn.peer);
            this.connections.delete(conn.peer);
            // Видалити гравця з гри
            window.gameState.players.delete(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('Помилка з\'єднання:', err);
        });
    }

    handleData(peerId, data) {
        switch (data.type) {
            case 'player_move':
                this.syncPlayerPosition(peerId, data);
                break;
            case 'player_join':
                this.addPlayer(peerId, data.playerData);
                break;
            case 'time_sync':
                window.gameState.gameTime = data.time;
                break;
            case 'chat_message':
                this.receiveChatMessage(peerId, data.message);
                break;
            case 'bus_update':
                window.gameState.busPosition = data.position;
                break;
        }
    }

    broadcast(data, excludeSelf = true) {
        this.connections.forEach((conn, peerId) => {
            if (excludeSelf && peerId === this.playerId) return;
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    syncPlayerPosition(playerId, data) {
        if (window.gameState.players.has(playerId)) {
            const player = window.gameState.players.get(playerId);
            player.x = data.x;
            player.y = data.y;
            player.direction = data.direction;
            player.currentAnimation = data.animation;
        }
    }

    sendPlayerMove(x, y, direction, animation) {
        this.broadcast({
            type: 'player_move',
            x, y, direction, animation,
            timestamp: Date.now()
        });
    }

    sendChatMessage(message, targetPlayer = null) {
        const data = {
            type: 'chat_message',
            message,
            from: window.gameState.playerName,
            timestamp: Date.now()
        };
        
        if (targetPlayer) {
            const conn = this.connections.get(targetPlayer);
            if (conn?.open) conn.send(data);
        } else {
            this.broadcast(data);
        }
    }

    syncGameTime() {
        if (this.isHost) {
            this.broadcast({
                type: 'time_sync',
                time: window.gameState.gameTime
            });
        }
    }
}
