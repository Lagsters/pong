// P2P - bezpośrednia komunikacja między kontrolerem a grą
class PeerToPeerConnection {
    constructor() {
        this.isHost = false;
        this.isController = false;
        this.playerId = null;
        this.peerConnection = null;
        this.dataChannel = null;
        this.remoteDataChannel = null;
        this.connected = false;
        this.pendingCandidates = [];
        this.iceCandidateTimeout = null;
        
        console.log('🔰 PeerToPeerConnection zainicjalizowany');
    }

    // Inicjalizacja jako host (gra)
    async initAsHost(playerId) {
        console.log(`🖥️ Inicjalizacja P2P jako host dla gracza ${playerId}`);
        this.isHost = true;
        this.playerId = playerId;
        
        // Konfiguracja STUN serwerów dla WebRTC
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        // Tworzenie połączenia peer
        this.peerConnection = new RTCPeerConnection(configuration);
        
        // Tworzenie kanału danych
        this.dataChannel = this.peerConnection.createDataChannel(`player${playerId}`);
        this.setupDataChannel(this.dataChannel);
        
        // Nasłuchiwanie na kanały danych od kontrolera
        this.peerConnection.ondatachannel = (event) => {
            console.log(`📡 Host otrzymał kanał danych od kontrolera (gracz ${playerId})`);
            this.remoteDataChannel = event.channel;
            this.setupDataChannel(this.remoteDataChannel);
        };
        
        // Tworzenie oferty połączenia
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        // Nasłuchiwanie na kandydatów ICE
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`🧊 Nowy kandydat ICE dla hosta (gracz ${playerId})`, event.candidate);
                this.pendingCandidates.push(event.candidate);
                
                // Resetowanie timera
                if (this.iceCandidateTimeout) {
                    clearTimeout(this.iceCandidateTimeout);
                }
                
                // Ustawienie timera na zebranie wszystkich kandydatów
                this.iceCandidateTimeout = setTimeout(() => {
                    console.log(`⏱️ Timeout ICE - zebrano ${this.pendingCandidates.length} kandydatów`);
                    // Wygeneruj kompletne dane połączenia
                    this.generateConnectionData();
                }, 2000);
            }
        };
        
        // Stan połączenia
        this.peerConnection.onconnectionstatechange = () => {
            console.log(`🔄 Stan połączenia P2P (host): ${this.peerConnection.connectionState}`);
            if (this.peerConnection.connectionState === 'connected') {
                this.connected = true;
                console.log(`✅ Połączenie P2P nawiązane dla gracza ${playerId}!`);
            }
        };
        
        return offer;
    }
    
    // Inicjalizacja jako kontroler
    async initAsController(playerId, connectionData) {
        console.log(`📱 Inicjalizacja P2P jako kontroler dla gracza ${playerId}`);
        this.isController = true;
        this.playerId = playerId;
        
        // Konfiguracja STUN serwerów dla WebRTC
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        // Tworzenie połączenia peer
        this.peerConnection = new RTCPeerConnection(configuration);
        
        // Tworzenie kanału danych
        this.dataChannel = this.peerConnection.createDataChannel(`controller${playerId}`);
        this.setupDataChannel(this.dataChannel);
        
        // Nasłuchiwanie na kanały danych od hosta
        this.peerConnection.ondatachannel = (event) => {
            console.log(`📡 Kontroler otrzymał kanał danych od hosta`);
            this.remoteDataChannel = event.channel;
            this.setupDataChannel(this.remoteDataChannel);
        };
        
        try {
            // Parsowanie danych połączenia
            const { offer, candidates } = connectionData;
            
            // Ustawienie zdalnego opisu
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Dodanie wszystkich kandydatów ICE
            for (const candidate of candidates) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
            
            // Tworzenie odpowiedzi
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Nasłuchiwanie na kandydatów ICE
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`🧊 Nowy kandydat ICE dla kontrolera (gracz ${playerId})`, event.candidate);
                    this.pendingCandidates.push(event.candidate);
                }
            };
            
            // Stan połączenia
            this.peerConnection.onconnectionstatechange = () => {
                console.log(`🔄 Stan połączenia P2P (kontroler): ${this.peerConnection.connectionState}`);
                if (this.peerConnection.connectionState === 'connected') {
                    this.connected = true;
                    console.log(`✅ Połączenie P2P nawiązane z hostem!`);
                    
                    // Wyślij potwierdzenie połączenia
                    this.sendData({
                        type: 'connection_established',
                        playerId: this.playerId,
                        timestamp: Date.now()
                    });
                }
            };
            
            return answer;
        } catch (error) {
            console.error('⚠️ Błąd podczas inicjalizacji P2P jako kontroler:', error);
            throw error;
        }
    }
    
    // Konfiguracja kanału danych
    setupDataChannel(channel) {
        channel.onopen = () => {
            console.log(`🟢 Kanał danych otwarty: ${channel.label}`);
        };
        
        channel.onclose = () => {
            console.log(`🔴 Kanał danych zamknięty: ${channel.label}`);
        };
        
        channel.onerror = (error) => {
            console.error(`⚠️ Błąd kanału danych: ${channel.label}`, error);
        };
        
        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('⚠️ Błąd parsowania wiadomości P2P:', error);
            }
        };
    }
    
    // Obsługa wiadomości
    handleMessage(data) {
        console.log(`📨 Otrzymano wiadomość P2P:`, data);
        
        // Przesłanie wiadomości do zarejestrowanych callbacków
        if (this.messageCallback) {
            this.messageCallback(data);
        }
        
        // Obsługa specjalnych typów wiadomości
        if (data.type === 'connection_established') {
            console.log(`🎉 Potwierdzenie połączenia P2P od gracza ${data.playerId}`);
            if (this.connectionCallback) {
                this.connectionCallback(data.playerId);
            }
        }
    }
    
    // Rejestracja callbacków dla wiadomości
    onMessage(callback) {
        this.messageCallback = callback;
    }
    
    // Rejestracja callbacków dla połączenia
    onConnection(callback) {
        this.connectionCallback = callback;
    }
    
    // Wysyłanie danych przez P2P
    sendData(data) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            console.warn('⚠️ Próba wysłania danych przez P2P, ale kanał nie jest otwarty');
            return false;
        }
        
        try {
            const jsonData = JSON.stringify(data);
            this.dataChannel.send(jsonData);
            return true;
        } catch (error) {
            console.error('⚠️ Błąd wysyłania danych P2P:', error);
            return false;
        }
    }
    
    // Generowanie danych połączenia (dla QR kodu)
    generateConnectionData() {
        if (!this.isHost || !this.peerConnection.localDescription) {
            console.warn('⚠️ Nie można wygenerować danych połączenia - brak lokalnego opisu');
            return null;
        }
        
        const connectionData = {
            offer: this.peerConnection.localDescription,
            candidates: this.pendingCandidates,
            playerId: this.playerId,
            timestamp: Date.now()
        };
        
        console.log(`🔄 Wygenerowano dane połączenia P2P dla gracza ${this.playerId}`, connectionData);
        
        // Wywołanie callbacku z danymi połączenia (do QR)
        if (this.connectionDataCallback) {
            this.connectionDataCallback(connectionData);
        }
        
        return connectionData;
    }
    
    // Rejestracja callbacku dla danych połączenia
    onConnectionData(callback) {
        this.connectionDataCallback = callback;
    }
    
    // Zamknięcie połączenia
    close() {
        console.log('🔒 Zamykanie połączenia P2P');
        
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        this.connected = false;
        console.log('✅ Połączenie P2P zamknięte');
    }
    
    // Sprawdzenie czy połączenie jest aktywne
    isConnected() {
        return this.connected && this.peerConnection && this.peerConnection.connectionState === 'connected';
    }
}

// Globalna instancja połączenia P2P
const p2pConnection = {};

