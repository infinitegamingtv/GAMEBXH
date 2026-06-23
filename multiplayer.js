// Cấu hình Firebase của bạn
const firebaseConfig = {
    apiKey: "AIzaSyB7GEG6gSDRBxKFmuo0iG_wt-IsTaDyHWU",
    authDomain: "test-aa50d.firebaseapp.com",
    projectId: "test-aa50d",
    storageBucket: "test-aa50d.firebasestorage.app",
    messagingSenderId: "160629020295",
    appId: "1:160629020295:web:d2d3e98690b729a7f68a22",
    databaseURL: "https://test-aa50d-default-rtdb.firebaseio.com" // Đã tự động thêm link DB
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

class MultiplayerSystem {
    constructor() {
        this.currentRoomId = null;
        this.currentPlayerName = null;
        this.roomRef = null;
        this.onLeaderboardUpdate = null;
    }

    joinRoom(playerName, roomId) {
        return new Promise((resolve) => {
            const roomRef = db.ref('rooms/' + roomId + '/players');
            
            roomRef.once('value', (snapshot) => {
                const players = snapshot.val() || {};
                const playerNames = Object.keys(players);
                
                // Giới hạn 4 người
                if (playerNames.length >= 4 && !players[playerName]) {
                    resolve({ success: false, message: 'Phòng đã đầy (Tối đa 4 người).' });
                    return;
                }

                // Lưu thông tin người chơi hiện tại
                this.currentRoomId = roomId;
                this.currentPlayerName = playerName;
                this.roomRef = db.ref('rooms/' + roomId);

                // Thêm người chơi vào DB nếu chưa có
                if (!players[playerName]) {
                    roomRef.child(playerName).set({
                        score: 0,
                        joinedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                }

                // Lắng nghe sự thay đổi của phòng để cập nhật Leaderboard Real-time
                this.roomRef.child('players').on('value', (snap) => {
                    if (this.onLeaderboardUpdate) {
                        const data = snap.val() || {};
                        const leaderboard = Object.keys(data).map(name => ({
                            name: name,
                            score: data[name].score
                        })).sort((a, b) => b.score - a.score);
                        
                        this.onLeaderboardUpdate(leaderboard);
                    }
                });

                resolve({ success: true });
            });
        });
    }

    updateScore(score) {
        if (!this.currentRoomId || !this.currentPlayerName) return;

        const playerRef = this.roomRef.child('players/' + this.currentPlayerName);
        playerRef.once('value', (snapshot) => {
            const currentData = snapshot.val();
            // Chỉ cập nhật lên server nếu điểm mới cao hơn điểm cũ
            if (!currentData || score > currentData.score) {
                playerRef.update({ score: score });
            }
        });
    }

    leaveRoom() {
        if (this.roomRef) {
            this.roomRef.child('players').off(); // Tắt lắng nghe
        }
        this.currentRoomId = null;
        this.currentPlayerName = null;
        this.roomRef = null;
    }
}

const multiplayer = new MultiplayerSystem();
