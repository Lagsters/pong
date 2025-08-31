// P2P - komunikacja bezpośrednia między kontrolerem a grą używając PeerJS
class PeerToPeerConnection {
    constructor() {
        this.isHost = false;
        this.isController = false;
        this.playerId = null;
        this.peer = null;
        this.connections = new Map(); // Map playerId -> connection
        this.connected = false;
        this.hostPeerId = null;
        this.connectionToHost = null;

        console.log('🔰 PeerToPeerConnection z PeerJS zainicjalizowany');

        // Sprawdź czy PeerJS jest dostępne
        if (typeof Peer === 'undefined') {
            console.error('❌ PeerJS nie jest załadowane!');
            return;
        }
    }

    // Inicjalizacja jako host (gra)
    async initAsHost() {
        console.log('🖥️ Inicjalizacja P2P jako host');
        this.isHost = true;

        try {
            // Utwórz peer z unikalnym ID
            this.peer = new Peer(`pong-host-${Date.now()}`, {
                debug: 2,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                console.log('✅ Host peer ID:', id);
                this.hostPeerId = id;
                this.displayPeerID(id);
            });

            this.peer.on('connection', (conn) => {
                console.log('📥 Nowe połączenie od:', conn.peer);
                this.handleIncomingConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('❌ Błąd peer:', err);
            });

        } catch (error) {
            console.error('❌ Błąd inicjalizacji hosta:', error);
        }
    }

    // Inicjalizacja jako kontroler
    async initAsController(playerId, hostPeerId) {
        console.log(`📱 Inicjalizacja P2P jako kontroler dla gracza ${playerId}`);
        this.isController = true;
        this.playerId = playerId;
        this.hostPeerId = hostPeerId;

        try {
            // Utwórz peer dla kontrolera
            this.peer = new Peer(`controller-${playerId}-${Date.now()}`, {
                debug: 2,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                console.log('✅ Kontroler peer ID:', id);
                this.connectToHost();
            });

            this.peer.on('error', (err) => {
                console.error('❌ Błąd peer kontrolera:', err);
            });

        } catch (error) {
            console.error('❌ Błąd inicjalizacji kontrolera:', error);
        }
    }

    // Połącz się z hostem
    connectToHost() {
        if (!this.hostPeerId) {
            console.error('❌ Brak ID hosta');
            return;
        }

        console.log(`🔗 Łączenie z hostem: ${this.hostPeerId}`);

        this.connectionToHost = this.peer.connect(this.hostPeerId, {
            metadata: { playerId: this.playerId }
        });

        this.connectionToHost.on('open', () => {
            console.log('✅ Połączono z hostem');
            this.connected = true;
            this.onConnectionOpen();
        });

        this.connectionToHost.on('data', (data) => {
            this.handleDataFromHost(data);
        });

        this.connectionToHost.on('close', () => {
            console.log('🔌 Połączenie z hostem zamknięte');
            this.connected = false;
            this.onConnectionClose();
        });

        this.connectionToHost.on('error', (err) => {
            console.error('❌ Błąd połączenia z hostem:', err);
        });
    }

    // Obsługa przychodzącego połączenia (host)
    handleIncomingConnection(conn) {
        const playerId = conn.metadata?.playerId;

        if (!playerId) {
            console.error('❌ Brak playerId w metadanych');
            conn.close();
            return;
        }

        console.log(`📥 Akceptuję połączenie od gracza: ${playerId}`);
        this.connections.set(playerId, conn);

        conn.on('open', () => {
            console.log(`✅ Połączenie z graczem ${playerId} otwarte`);
            this.onPlayerConnected(playerId);
        });

        conn.on('data', (data) => {
            this.handleDataFromPlayer(playerId, data);
        });

        conn.on('close', () => {
            console.log(`🔌 Gracz ${playerId} rozłączony`);
            this.connections.delete(playerId);
            this.onPlayerDisconnected(playerId);
        });

        conn.on('error', (err) => {
            console.error(`❌ Błąd połączenia z graczem ${playerId}:`, err);
        });
    }

    // Wyślij dane do hosta (kontroler)
    sendToHost(data) {
        if (this.connectionToHost && this.connected) {
            this.connectionToHost.send(data);
        } else {
            console.warn('⚠️ Brak połączenia z hostem');
        }
    }

    // Wyślij dane do gracza (host)
    sendToPlayer(playerId, data) {
        const conn = this.connections.get(playerId);
        if (conn) {
            conn.send(data);
        } else {
            console.warn(`⚠️ Brak połączenia z graczem ${playerId}`);
        }
    }

    // Wyślij dane do wszystkich graczy (host)
    broadcast(data) {
        this.connections.forEach((conn, playerId) => {
            conn.send(data);
        });
    }

    // Obsługa danych od gracza (host)
    handleDataFromPlayer(playerId, data) {
        console.log(`📥 Dane od gracza ${playerId}:`, data);

        // Przekaż dane do communication.js
        if (window.gameComm && typeof window.gameComm.handlePlayerData === 'function') {
            // Konwertuj dane do formatu oczekiwanego przez handlePlayerData
            if (data.type === 'playerData') {
                // Konwertuj playerId z "player2" na "2"
                const playerNumber = data.playerId.replace('player', '');

                window.gameComm.handlePlayerData({
                    playerId: playerNumber, // "2" zamiast "player2"
                    tilt: data.tilt,
                    orientation: data.orientation,
                    timestamp: data.timestamp
                });
            }
        }

        // Przekaż także do gry jeśli istnieje
        if (window.game) {
            const playerNumber = data.playerId.replace('player', '');
            if (playerNumber === '1') {
                window.game.player1Tilt = data.tilt;
            } else if (playerNumber === '2') {
                window.game.player2Tilt = data.tilt;
            }
        }
    }

    // Obsługa danych od hosta (kontroler)
    handleDataFromHost(data) {
        console.log('�� Dane od hosta:', data);
        // Tu można dodać obsługę danych od hosta jeśli potrzebne
    }

    // Callback gdy gracz się połączył
    onPlayerConnected(playerId) {
        console.log(`🎮 Gracz ${playerId} połączony przez P2P`);

        // Wywołaj handlePlayerConnect z communication.js
        if (window.gameComm && typeof window.gameComm.handlePlayerConnect === 'function') {
            window.gameComm.handlePlayerConnect(playerId);
        }
    }

    // Callback gdy gracz się rozłączył
    onPlayerDisconnected(playerId) {
        console.log(`❌ Gracz ${playerId} rozłączony`);

        // Wywołaj odpowiednią funkcję z communication.js jeśli istnieje
        if (window.gameComm && typeof window.gameComm.handlePlayerDisconnect === 'function') {
            window.gameComm.handlePlayerDisconnect(playerId);
        }
    }

    // Callback gdy połączenie się otwiera (kontroler)
    onConnectionOpen() {
        console.log('🎮 Kontroler połączony przez P2P');

        // Aktualizuj interfejs kontrolera - sprawdź oba możliwe obiekty
        if (window.gameComm) {
            window.gameComm.p2pConnected = true;
            window.gameComm.updateConnectionStatus();
        }

        if (window.gameCommunication) {
            window.gameCommunication.p2pConnected = true;
            window.gameCommunication.updateConnectionStatus();
        }
    }

    // Callback gdy połączenie się zamyka (kontroler)
    onConnectionClose() {
        console.log('❌ Kontroler rozłączony');

        // Aktualizuj interfejs kontrolera - sprawdź oba możliwe obiekty
        if (window.gameComm) {
            window.gameComm.p2pConnected = false;
            window.gameComm.updateConnectionStatus();
        }

        if (window.gameCommunication) {
            window.gameCommunication.p2pConnected = false;
            window.gameCommunication.updateConnectionStatus();
        }
    }

    // Wyświetl ID hosta na ekranie
    displayPeerID(peerId) {
        // Zaktualizuj QR kody z nowym ID
        this.updateQRCodes(peerId);

        // Wyświetl ID na ekranie
        const peerIdDisplay = document.getElementById('peerIdDisplay');
        if (peerIdDisplay) {
            peerIdDisplay.textContent = `Peer ID: ${peerId}`;
        }
    }

    // Zaktualizuj QR kody z Peer ID
    updateQRCodes(peerId) {
        // Automatycznie wykryj bazowy URL z aktualnej ścieżki (dla GitHub Pages)
        let currentPath = window.location.pathname;

        // Jeśli ścieżka to `/pong` (bez slash na końcu), dodaj slash
        if (currentPath === '/pong') {
            currentPath = '/pong/';
        }

        // Jeśli ścieżka to `/` (root), zostaw jak jest
        // Jeśli ścieżka to `/pong/` lub inna ze slash, zostaw jak jest
        const basePath = currentPath.endsWith('/') ? currentPath : currentPath + '/';

        console.log('🔍 p2p.js - Wykryta ścieżka:', {
            originalPath: window.location.pathname,
            processedPath: currentPath,
            basePath: basePath
        });

        const baseUrl = `${window.location.protocol}//${window.location.host}${basePath}controller.html`;

        // QR kod dla gracza 1
        const player1Url = `${baseUrl}?player=player1&peerID=${peerId}`;
        console.log('🔗 p2p.js - Player 1 URL:', player1Url);

        const qr1 = document.getElementById('qr1');
        if (qr1 && window.QRCode) {
            qr1.innerHTML = '';
            new QRCode(qr1, {
                text: player1Url,
                width: 200,
                height: 200
            });
        }

        // QR kod dla gracza 2
        const player2Url = `${baseUrl}?player=player2&peerID=${peerId}`;
        console.log('🔗 p2p.js - Player 2 URL:', player2Url);

        const qr2 = document.getElementById('qr2');
        if (qr2 && window.QRCode) {
            qr2.innerHTML = '';
            new QRCode(qr2, {
                text: player2Url,
                width: 200,
                height: 200
            });
        }
    }

    // Zamknij wszystkie połączenia
    disconnect() {
        console.log('🔌 Zamykanie połączeń P2P');

        if (this.connectionToHost) {
            this.connectionToHost.close();
            this.connectionToHost = null;
        }

        this.connections.forEach((conn) => {
            conn.close();
        });
        this.connections.clear();

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        this.connected = false;
    }

    // Sprawdź czy gracz jest połączony
    isPlayerConnected(playerId) {
        return this.connections.has(playerId);
    }

    // Pobierz liczbę połączonych graczy
    getConnectedPlayersCount() {
        return this.connections.size;
    }
}

// Globalna instancja P2P
window.p2pConnection = new PeerToPeerConnection();
