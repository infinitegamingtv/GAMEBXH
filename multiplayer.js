/**
 * Mock Backend sử dụng localStorage và BroadcastChannel
 * Giả lập Database Real-time cho phòng chơi và bảng xếp hạng
 */
const GAME_ROOMS_KEY = 'antigravity_rooms';

class MultiplayerSystem {
    constructor() {
        this.roomData = this.loadRooms();
        this.currentRoomId = null;
        this.currentPlayerName = null;
        
        // Sử dụng BroadcastChannel để đồng bộ giữa các tab trình duyệt (giả lập WebSocket)
        this.channel = new BroadcastChannel('antigravity_game_channel');
        this.channel.onmessage = (event) => {
            if (event.data.type === 'UPDATE_ROOMS') {
                this.roomData = this.loadRooms();
                if (this.onLeaderboardUpdate && this.currentRoomId) {
                    this.onLeaderboardUpdate(this.getRoomLeaderboard(this.currentRoomId));
                }
            }
        };
    }

    loadRooms() {
        try {
            const data = localStorage.getItem(GAME_ROOMS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    saveRooms() {
        localStorage.setItem(GAME_ROOMS_KEY, JSON.stringify(this.roomData));
        this.channel.postMessage({ type: 'UPDATE_ROOMS' });
    }

    joinRoom(playerName, roomId) {
        if (!this.roomData[roomId]) {
            this.roomData[roomId] = { players: {} };
        }

        const room = this.roomData[roomId];
        const playerNames = Object.keys(room.players);
        
        // Giới hạn 4 người
        if (playerNames.length >= 4 && !room.players[playerName]) {
            return { success: false, message: 'Phòng đã đầy (Tối đa 4 người).' };
        }

        if (!room.players[playerName]) {
            room.players[playerName] = { score: 0, joinedAt: Date.now() };
        }

        this.currentRoomId = roomId;
        this.currentPlayerName = playerName;
        this.saveRooms();

        return { success: true };
    }

    updateScore(score) {
        if (!this.currentRoomId || !this.currentPlayerName) return;

        const room = this.roomData[this.currentRoomId];
        if (room && room.players[this.currentPlayerName]) {
            // Chỉ cập nhật nếu điểm cao hơn
            if (score > room.players[this.currentPlayerName].score) {
                room.players[this.currentPlayerName].score = score;
                this.saveRooms();
            }
        }
    }

    getRoomLeaderboard(roomId) {
        if (!this.roomData[roomId]) return [];
        
        const players = this.roomData[roomId].players;
        return Object.keys(players)
            .map(name => ({ name, score: players[name].score }))
            .sort((a, b) => b.score - a.score);
    }
    
    leaveRoom() {
        this.currentRoomId = null;
        this.currentPlayerName = null;
    }
}

const multiplayer = new MultiplayerSystem();
