// TEST - sprawdź czy JavaScript się ładuje
console.log('🟢 communication.js ZAŁADOWANY!');
console.log('🌍 window.location:', window.location.href);

// Komunikacja między hostem a kontrolerami
class GameCommunication {
    constructor() {
        console.log('🔧 KONSTRUKTOR GameCommunication - START');
        this.isHost = false;
        this.isController = false;
        this.playerId = null;
        this.hostUrl = null;
        this.ws = null;
        this.connectedPlayers = { player1: false, player2: false };
        this.playerData = { player1: { tilt: 0 }, player2: { tilt: 0 } };
        this.p2pEnabled = true; // Włączenie funkcji P2P
        this.p2pConnected = false; // Status połączenia P2P

        console.log('🔍 Sprawdzam parametry URL...');
        console.log('📍 window.location.href:', window.location.href);
        console.log('🔗 window.location.search:', window.location.search);

        // Sprawdź czy to kontroler na podstawie URL
        this.checkControllerMode();

        console.log('✅ KONSTRUKTOR GameCommunication - END');
        console.log('🎯 isController:', this.isController);
        console.log('👤 playerId:', this.playerId);
    }

    checkControllerMode() {
        console.log('🔍 SPRAWDZAM TRYB KONTROLERA...');
        const urlParams = new URLSearchParams(window.location.search);
        const player = urlParams.get('player');

        console.log('📋 URLSearchParams:', urlParams.toString());
        console.log('👤 player parametr:', player);

        if (player) {
            console.log('✅ PARAMETR GRACZA ZNALEZIONY - inicjalizuję kontroler');
            this.isController = true;
            this.playerId = player;

            // Automatycznie określ adres hosta na podstawie obecnego URL
            this.hostUrl = `${window.location.protocol}//${window.location.host}`;

            console.log('🎯 Ustawiono isController:', this.isController);
            console.log('👤 Ustawiono playerId:', this.playerId);
            console.log('🌐 Automatycznie określono hostUrl:', this.hostUrl);

            // Opóźnienie aby DOM był gotowy + wielokrotne próby połączenia
            setTimeout(() => {
                this.initController();
            }, 500);
        } else {
            console.log('❌ BRAK PARAMETRU GRACZA - to nie jest kontroler');
            console.log('❓ player:', player);
        }
    }

    generateControllerUrl(playerId) {
        // Użyj lokalnego IP zamiast localhost/0.0.0.0
        const localIP = window.location.hostname || '192.168.100.2';
        const port = window.location.port || '8000';
        const protocol = window.location.protocol || 'https:';
        const hostUrl = `${protocol}//${localIP}:${port}`;
        return `${hostUrl}/controller.html?player=${playerId}`;
    }

    async initHost() {
        this.isHost = true;
        this.startTime = Date.now(); // Dodaj timestamp startu dla debugowania

        console.log('🏠 INICJALIZACJA HOSTA - START');
        console.log('🔄 isHost ustawione na:', this.isHost);

        // Rozpocznij nasłuchiwanie na połączenia NATYCHMIAST
        this.startHostListening();

        console.log('👂 Host nasłuchuje na połączenia graczy...');

        // Generuj kody QR z opóźnieniem, aby elementy DOM były gotowe
        setTimeout(async () => {
            await this.generateQRCodes();
        }, 100);
    }

    async generateQRCodes() {
        const player1Url = this.generateControllerUrl('1');
        const player2Url = this.generateControllerUrl('2');

        console.log('Generowanie kodów QR...');
        console.log('Player 1 URL:', player1Url);
        console.log('Player 2 URL:', player2Url);

        // Pobierz elementy canvas i kontener
        const canvas1 = document.getElementById('qrPlayer1');
        const canvas2 = document.getElementById('qrPlayer2');
        const section1 = canvas1?.parentElement;
        const section2 = canvas2?.parentElement;

        if (!canvas1 || !canvas2) {
            console.error('Nie znaleziono elementów canvas dla kodów QR');
            return;
        }

        // Spróbuj najpierw użyć biblioteki QRCode
        if (typeof QRCode !== 'undefined') {
            try {
                console.log('Generowanie QR dla gracza 1...');
                await QRCode.toCanvas(canvas1, player1Url, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                console.log('Generowanie QR dla gracza 2...');
                await QRCode.toCanvas(canvas2, player2Url, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                console.log('QR kody wygenerowane pomyślnie!');
                return; // Sukces - nie pokazuj linków tekstowych

            } catch (error) {
                console.error('Błąd generowania kodów QR:', error);
            }
        }

        // Jeśli QRCode nie działa, użyj Google Charts API
        this.generateQRWithGoogle(canvas1, canvas2, section1, section2, player1Url, player2Url);
    }

    generateQRWithGoogle(canvas1, canvas2, section1, section2, player1Url, player2Url) {
        console.log('Używam alternatywnego generatora kodów QR');

        // Ukryj canvas i pokaż QR z qr-server.com (backup service)
        if (section1) {
            canvas1.style.display = 'none';

            let qrDiv1 = section1.querySelector('.google-qr');
            if (!qrDiv1) {
                qrDiv1 = document.createElement('div');
                qrDiv1.className = 'google-qr';
                qrDiv1.style.margin = '15px 0';

                // Najpierw spróbuj qr-server.com
                const qrImg1 = document.createElement('img');
                qrImg1.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(player1Url)}`;
                qrImg1.style.borderRadius = '10px';
                qrImg1.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                qrImg1.alt = 'QR Code dla Gracza 1';
                qrImg1.onerror = () => {
                    // Fallback - jeśli API nie działa, pokaż tylko linki
                    qrDiv1.style.display = 'none';
                };

                qrDiv1.appendChild(qrImg1);
                section1.appendChild(qrDiv1);
            }
        }

        if (section2) {
            canvas2.style.display = 'none';

            let qrDiv2 = section2.querySelector('.google-qr');
            if (!qrDiv2) {
                qrDiv2 = document.createElement('div');
                qrDiv2.className = 'google-qr';
                qrDiv2.style.margin = '15px 0';

                const qrImg2 = document.createElement('img');
                qrImg2.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(player2Url)}`;
                qrImg2.style.borderRadius = '10px';
                qrImg2.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                qrImg2.alt = 'QR Code dla Gracza 2';
                qrImg2.onerror = () => {
                    // Fallback - jeśli API nie działa, pokaż tylko linki
                    qrDiv2.style.display = 'none';
                };

                qrDiv2.appendChild(qrImg2);
                section2.appendChild(qrDiv2);
            }
        }

        // Zawsze pokaż linki tekstowe jako backup
        this.showTextLinks(section1, section2, player1Url, player2Url);
    }

    showTextLinks(section1, section2, player1Url, player2Url) {
        console.log('Wyświetlanie linków tekstowych jako fallback');

        // Ukryj canvas i pokaż linki
        if (section1) {
            const canvas1 = section1.querySelector('canvas');
            if (canvas1) canvas1.style.display = 'none';

            let linkDiv1 = section1.querySelector('.text-link');
            if (!linkDiv1) {
                linkDiv1 = document.createElement('div');
                linkDiv1.className = 'text-link';
                linkDiv1.innerHTML = `
                    <p style="font-size: 0.9rem; margin: 10px 0;">Skanuj ten link lub skopiuj do telefonu:</p>
                    <div style="background: white; color: black; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 0.8rem;">
                        ${player1Url}
                    </div>
                `;
                section1.appendChild(linkDiv1);
            }
        }

        if (section2) {
            const canvas2 = section2.querySelector('canvas');
            if (canvas2) canvas2.style.display = 'none';

            let linkDiv2 = section2.querySelector('.text-link');
            if (!linkDiv2) {
                linkDiv2 = document.createElement('div');
                linkDiv2.className = 'text-link';
                linkDiv2.innerHTML = `
                    <p style="font-size: 0.9rem; margin: 10px 0;">Skanuj ten link lub skopiuj do telefonu:</p>
                    <div style="background: white; color: black; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 0.8rem;">
                        ${player2Url}
                    </div>
                `;
                section2.appendChild(linkDiv2);
            }
        }
    }

    startHostListening() {
        console.log('🎯 STARTOWANIE NASŁUCHIWANIA HOSTA');

        // Dla hosta - pobieraj dane z serwera CZĘŚCIEJ na początku
        if (this.isHost) {
            // Pierwsze 10 sekund sprawdzaj co 50ms dla szybkiego wykrywania
            const fastInterval = setInterval(() => {
                this.fetchGameData();
            }, 50);

            // Po 10 sekundach przełącz na normalny interwał
            setTimeout(() => {
                clearInterval(fastInterval);
                setInterval(() => {
                    this.fetchGameData();
                }, 100);
            }, 10000);

            console.log('⚡ Ustawiono szybkie nasłuchiwanie na pierwsze 10 sekund');
        }

        // Nasłuchuj na zmiany w localStorage (fallback)
        window.addEventListener('storage', (e) => {
            if (e.key === 'playerConnect') {
                const data = JSON.parse(e.newValue);
                this.handlePlayerConnect(data.playerId);
            } else if (e.key === 'playerData') {
                const data = JSON.parse(e.newValue);
                this.handlePlayerData(data);
            }
        });

        // Sprawdzaj localStorage jako fallback - również częściej na początku
        const fastLocalCheck = setInterval(() => {
            this.checkPlayerUpdates();
        }, 50);

        setTimeout(() => {
            clearInterval(fastLocalCheck);
            setInterval(() => {
                this.checkPlayerUpdates();
            }, 100);
        }, 10000);
    }

    handlePlayerConnect(playerId) {
        this.connectedPlayers[`player${playerId}`] = true;

        // Aktualizuj status na ekranie
        const statusElement = document.getElementById(`status${playerId}`);
        if (statusElement) {
            statusElement.textContent = 'Połączony!';
            statusElement.className = 'player-status connected';
        }

        // UKRYJ kod QR dla połączonego gracza
        const qrSection = document.querySelector(`#qrPlayer${playerId}`).parentElement;
        if (qrSection) {
            // Ukryj canvas QR
            const canvas = qrSection.querySelector('canvas');
            if (canvas) canvas.style.display = 'none';

            // Ukryj alternatywne QR (z Google API)
            const googleQr = qrSection.querySelector('.google-qr');
            if (googleQr) googleQr.style.display = 'none';

            // Ukryj linki tekstowe
            const textLink = qrSection.querySelector('.text-link');
            if (textLink) textLink.style.display = 'none';

            // Pokaż komunikat o połączeniu z wyświetlaniem odchylenia na żywo
            let connectedMsg = qrSection.querySelector('.connected-message');
            if (!connectedMsg) {
                connectedMsg = document.createElement('div');
                connectedMsg.className = 'connected-message';
                connectedMsg.style.cssText = `
                    background: #28a745;
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    margin: 15px 0;
                    font-size: 1.2rem;
                    font-weight: bold;
                `;
                connectedMsg.innerHTML = `
                    ✅ Gracz ${playerId} połączony!<br>
                    <div id="player${playerId}TiltLive" style="font-size: 1.5rem; margin-top: 10px; color: #FFD700;">
                        Odchylenie: 0%
                    </div>
                    <div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.8;">
                        Skala: -100% do +100%
                    </div>
                `;
                qrSection.appendChild(connectedMsg);
            }
        }

        // Sprawdź czy obaj gracze są połączeni - jeśli tak, rozpocznij grę automatycznie
        if (this.connectedPlayers.player1 && this.connectedPlayers.player2) {
            console.log('Obaj gracze połączeni - automatyczne rozpoczęcie gry!');

            // Krótkie opóźnienie żeby użytkownik zobaczył status "Połączony!"
            setTimeout(() => {
                this.showCountdown();
            }, 1500); // 1.5 sekundy opóźnienia
        }

        console.log(`Gracz ${playerId} połączony`);
    }

    handlePlayerData(data) {
        if (data.playerId && data.tilt !== undefined) {
            this.playerData[`player${data.playerId}`].tilt = data.tilt;

            // Przekaż dane do gry
            if (window.game) {
                if (data.playerId === '1') {
                    window.game.player1Tilt = data.tilt;
                } else if (data.playerId === '2') {
                    window.game.player2Tilt = data.tilt;
                }
            }

            // Wyświetl odchylenie w skali procentowej
            const player2TiltDisplay = document.getElementById('player2TiltDisplay');
            if (player2TiltDisplay && data.playerId === '2') {
                player2TiltDisplay.textContent = `Pochylenie Gracza 2: ${data.tilt.toFixed(1)}%`;
            }

            // Aktualizuj na żywo wyświetlanie odchylenia na ekranie głównym
            const tiltLiveDisplay = document.getElementById(`player${data.playerId}TiltLive`);
            if (tiltLiveDisplay) {
                const tiltValue = data.tilt.toFixed(1);
                tiltLiveDisplay.textContent = `Odchylenie: ${tiltValue}%`;

                // Dodaj kolorowanie w zależności od wartości
                const absValue = Math.abs(data.tilt);
                if (absValue < 10) {
                    tiltLiveDisplay.style.color = '#FFD700'; // Złoty - środek
                } else if (absValue < 50) {
                    tiltLiveDisplay.style.color = '#90EE90'; // Jasno zielony - lekkie odchylenie
                } else {
                    tiltLiveDisplay.style.color = '#FF6B6B'; // Czerwony - duże odchylenie
                }
            }
        }
    }

    checkPlayerUpdates() {
        // Sprawdź localStorage na nowe dane
        const playerDataStr = localStorage.getItem('playerData');
        if (playerDataStr) {
            try {
                const data = JSON.parse(playerDataStr);
                this.handlePlayerData(data);
            } catch (e) {
                // Ignoruj błędy parsowania
            }
        }
    }

    async initController() {
        console.log(`🚀 INICJALIZACJA KONTROLERA - Gracz ${this.playerId}`);
        console.log(`🌐 Host URL: ${this.hostUrl}`);

        // AKTYWUJ BLOKADĘ WYGASZANIA EKRANU na samym początku
        console.log('🔆 Aktywuję blokadę wygaszania ekranu...');
        try {
            await screenWakeLock.activate();
            console.log('✅ Blokada wygaszania ekranu aktywna');
        } catch (error) {
            console.warn('⚠️ Nie udało się aktywować blokady wygaszania:', error);
        }

        // Pokaż ekran kontrolera
        showScreen('controllerScreen');
        document.getElementById('controllerTitle').textContent = `Kontroler - Gracz ${this.playerId}`;

        // NATYCHMIAST wyślij sygnał połączenia - nie czekaj na żyroskop
        console.log(`📡 Wysyłam sygnał połączenia dla gracza ${this.playerId}...`);

        this.sendToHost('playerConnect', { playerId: this.playerId });
        console.log(`✅ Sygnał połączenia wysłany!`);

        // Inicjalizuj żyroskop w tle
        try {
            document.getElementById('gyroStatus').textContent = 'Requesting permissions...';
            await gyroscope.requestPermission();

            document.getElementById('gyroStatus').textContent = 'Starting gyroscope...';
            gyroscope.startListening();

            // Kalibracja po 1 sekundzie
            setTimeout(() => {
                gyroscope.calibrate();
                document.getElementById('gyroStatus').textContent = 'Gyroscope ready!';
                console.log(`Gracz ${this.playerId} - żyroskop gotowy`);
            }, 1000);

            // Rozpocznij wysyłanie danych
            this.startSendingData();

        } catch (error) {
            document.getElementById('gyroStatus').textContent = `Error: ${error.message}`;
            console.error('Błąd żyroskopu:', error);

            // Nawet jeśli żyroskop nie działa, gracz jest już połączony
            console.log(`Gracz ${this.playerId} połączony, ale żyroskop nie działa`);
        }

        // Wyświetl IP kontrolera na ekranie gry
        const ipDisplay = document.getElementById('controllerIP');
        if (ipDisplay) {
            ipDisplay.textContent = `IP Kontrolera: ${this.getControllerIP()}`;
        }

        // Jeśli włączono P2P, spróbuj nawiązać połączenie P2P
        if (this.p2pEnabled) {
            this.initP2PConnection();
        }
    }

    // Funkcja pomocnicza do pobierania IP kontrolera
    getControllerIP() {
        return this.controllerIP || 'Nieznane';
    }

    startSendingData() {
        console.log('🔄 ROZPOCZYNAM WYSYŁANIE DANYCH ŻYROSKOPU');

        // Zwiększona częstotliwość wysyłania danych dla płynniejszego sterowania
        let lastSentTime = 0;
        const sendInterval = 50; // 50ms = 20 razy na sekundę

        gyroscope.onOrientationChange((orientation, tiltPercent) => {
            const now = Date.now();

            // tiltPercent jest już w skali -100 do +100
            // Ogranicz do zakresu -100 do +100 (dla pewności)
            const limitedTiltPercent = Math.max(-100, Math.min(100, tiltPercent));

            // Ograniczenie częstotliwości wysyłania aby nie przeciążać serwera
            if (now - lastSentTime < sendInterval) {
                return;
            }
            lastSentTime = now;

            // Debug - loguj wysyłane dane CZĘŚCIEJ
            if (!this.lastSendLogTime || Date.now() - this.lastSendLogTime > 500) {
                console.log('📡 WYSYŁAM DANE DO HOSTA:', {
                    playerId: this.playerId,
                    tiltPercent: limitedTiltPercent,
                    url: `${this.hostUrl}/controller-data`
                });
                this.lastSendLogTime = Date.now();
            }

            // Aktualizuj wyświetlanie z lepszą precyzją
            const tiltDisplay = document.getElementById('tiltDisplay');
            if (tiltDisplay) {
                tiltDisplay.textContent = `Pochylenie: ${limitedTiltPercent.toFixed(1)}%`;
            }

            // Dodaj wizualny wskaźnik ruchu
            const indicator = document.getElementById('movementIndicator');
            if (indicator) {
                const movement = Math.abs(limitedTiltPercent);
                indicator.style.width = `${Math.min(100, movement)}%`;
                indicator.style.backgroundColor = movement > 20 ? '#28a745' : '#ffc107';
            }

            // Wyślij dane do hosta z wartością procentową
            this.sendToHost('playerData', {
                playerId: this.playerId,
                tilt: parseFloat(limitedTiltPercent.toFixed(1)), // Wartość procentowa -100 do +100
                orientation: {
                    beta: parseFloat(orientation.beta.toFixed(1)),
                    gamma: parseFloat(orientation.gamma.toFixed(1))
                },
                timestamp: now
            });
        });

        console.log('✅ Callback żyroskopu został zarejestrowany');
    }

    sendToHost(type, data) {
        // Wyślij dane do hosta przez HTTP zamiast localStorage
        const payload = {
            type,
            data,
            timestamp: Date.now(),
            controllerId: this.playerId
        };

        if (this.isController) {
            // Kontroler wysyła dane do hosta przez HTTP
            this.sendHTTPRequest(payload);
        } else {
            // Host używa localStorage lokalnie
            if (type === 'playerConnect') {
                localStorage.setItem('playerConnect', JSON.stringify(data));
            } else if (type === 'playerData') {
                localStorage.setItem('playerData', JSON.stringify(data));
            }
        }
    }

    async sendHTTPRequest(payload) {
        const maxRetries = 3;
        let retryCount = 0;

        console.log(`🔄 PRÓBA WYSŁANIA HTTP (${retryCount + 1}/${maxRetries}):`, payload);
        console.log(`🎯 URL docelowy: ${this.hostUrl}/controller-data`);

        while (retryCount < maxRetries) {
            try {
                // Wyślij dane do hosta przez fetch
                const hostUrl = this.hostUrl || window.location.origin;
                console.log(`📤 Wysyłam fetch do: ${hostUrl}/controller-data (próba ${retryCount + 1})`);

                const response = await fetch(`${hostUrl}/controller-data`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    timeout: 5000 // 5 sekund timeout
                });

                console.log(`📨 Odpowiedź serwera - status: ${response.status}`);

                if (response.ok) {
                    console.log('✅ Dane wysłane do hosta pomyślnie:', payload);
                    return; // Sukces - wyjdź z pętli
                } else {
                    console.error(`❌ Błąd HTTP ${response.status}:`, await response.text());
                    retryCount++;

                    if (retryCount < maxRetries) {
                        console.log(`🔄 Ponawiam próbę za 1 sekundę... (${retryCount}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

            } catch (error) {
                console.error(`❌ Błąd wysyłania danych (próba ${retryCount + 1}):`, error);
                retryCount++;

                if (retryCount < maxRetries) {
                    console.log(`🔄 Ponawiam próbę za 1 sekundę... (${retryCount}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        // Jeśli wszystkie próby zawiodły, użyj fallback localStorage
        console.log('🔄 Wszystkie próby HTTP zawiodły, próba fallback przez localStorage...');
        if (payload.type === 'playerConnect') {
            localStorage.setItem('playerConnect', JSON.stringify(payload.data));
            console.log('💾 Zapisano playerConnect w localStorage');
        } else if (payload.type === 'playerData') {
            localStorage.setItem('playerData', JSON.stringify(payload.data));
        }
    }

    // Nowa metoda dla hosta do pobierania danych z serwera
    async fetchGameData() {
        if (!this.isHost) return;

        try {
            const response = await fetch('/game-data');
            if (response.ok) {
                const gameData = await response.json();

                // Sprawdź, czy są jakieś zmiany w połączeniach graczy
                let connectionChanged = false;

                // Aktualizuj stan połączonych graczy
                Object.keys(gameData.connectedPlayers).forEach(playerKey => {
                    const playerId = playerKey.replace('player', '');
                    const wasConnected = this.connectedPlayers[playerKey];
                    const isConnected = gameData.connectedPlayers[playerKey];

                    if (wasConnected !== isConnected) {
                        connectionChanged = true;

                        if (!wasConnected && isConnected) {
                            console.log(`🎉 NOWE POŁĄCZENIE - Gracz ${playerId}!`);
                            this.handlePlayerConnect(playerId);
                        } else if (wasConnected && !isConnected) {
                            console.log(`⚠️ Gracz ${playerId} rozłączył się!`);
                        }
                    }

                    this.connectedPlayers[playerKey] = isConnected;
                });

                // Aktualizuj dane graczy (bez logowania)
                Object.keys(gameData.playerData).forEach(playerKey => {
                    const playerData = gameData.playerData[playerKey];
                    if (playerData.tilt !== undefined) {
                        this.playerData[playerKey] = playerData;

                        // Przekaż dane do gry
                        if (window.game) {
                            const playerId = playerKey.replace('player', '');
                            if (playerId === '1') {
                                window.game.player1Tilt = playerData.tilt;
                            } else if (playerId === '2') {
                                window.game.player2Tilt = playerData.tilt;
                            }
                        }

                        // Aktualizuj wyświetlanie odchylenia na żywo
                        const playerId = playerKey.replace('player', '');
                        this.handlePlayerData({
                            playerId: playerId,
                            tilt: playerData.tilt
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Błąd pobierania danych gry:', error);
        }
    }

    disconnect() {
        if (this.isController) {
            gyroscope.stopListening();

            // DEZAKTYWUJ BLOKADĘ WYGASZANIA EKRANU
            console.log('🌙 Dezaktywuję blokadę wygaszania ekranu...');
            screenWakeLock.deactivate();
        }

        // Wyczyść localStorage
        localStorage.removeItem('playerConnect');
        localStorage.removeItem('playerData');
    }

    // NOWA FUNKCJA - ODLICZANIE PRZED STARTEM GRY
    showCountdown() {
        console.log('🎬 Rozpoczynam odliczanie przed grą!');

        // Przejdź do ekranu gry ale nie uruchamiaj jeszcze gry
        showScreen('gameScreen');

        // Inicjalizuj canvas i grę (ale nie startuj)
        const canvas = document.getElementById('gameCanvas');
        const containerWidth = Math.min(window.innerWidth * 0.9, 800);
        const containerHeight = Math.min(window.innerHeight * 0.6, 400);

        canvas.width = containerWidth;
        canvas.height = containerHeight;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';

        // Twórz nową instancję gry ale nie startuj jeszcze
        window.game = new PongGame(canvas);
        window.game.reset(); // Reset wyników

        // Pokaż odliczanie na canvas
        this.displayCountdownMessage(canvas, 'READY', () => {
            setTimeout(() => {
                this.displayCountdownMessage(canvas, 'STEADY', () => {
                    setTimeout(() => {
                        this.displayCountdownMessage(canvas, 'GO!', () => {
                            setTimeout(() => {
                                // Teraz uruchom grę!
                                window.game.start();
                                console.log('🎮 Gra rozpoczęta!');
                            }, 500);
                        });
                    }, 1000);
                });
            }, 1000);
        });
    }

    displayCountdownMessage(canvas, message, callback) {
        const ctx = canvas.getContext('2d');

        // Wyczyść canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Narysuj wiadomość
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Dodaj efekt świecenia
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;

        ctx.fillText(message, canvas.width / 2, canvas.height / 2);

        // Usuń efekt świecenia dla innych elementów
        ctx.shadowBlur = 0;

        // Wywołaj callback po krótkim czasie
        if (callback) {
            setTimeout(callback, 200);
        }
    }

    initP2PConnection() {
        console.log('🌐 INICJALIZACJA POŁĄCZENIA P2P - Gracz ' + this.playerId);
        console.log('📡 Próba nawiązania bezpośredniego połączenia P2P z hostem...');

        // Sprawdź, czy przeglądarka obsługuje WebRTC
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('❌ WebRTC nie jest obsługiwane w tej przeglądarce - nie można nawiązać połączenia P2P');
            return;
        }

        // Utwórz nowy obiekt RTCPeerConnection
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }, // Publiczny serwer STUN od Google
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' }
            ]
        });

        console.log('🔌 Połączenie P2P zostało zainicjowane - konfiguracja WebRTC zakończona');

        // Rejestracja kandydatów ICE
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Nowy kandydat ICE znaleziony:', event.candidate.candidate.substr(0, 50) + '...');
            }
        };

        // Obsługuje zdarzenie, gdy połączenie P2P zostanie nawiązane
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log(`🔄 Stan połączenia P2P zmieniony: ${state} (Gracz ${this.playerId})`);

            if (state === 'checking') {
                console.log('🔎 Sprawdzanie możliwości nawiązania połączenia P2P...');
            } else if (state === 'connected' || state === 'completed') {
                console.log('✅ POŁĄCZENIE P2P NAWIĄZANE! Bezpośrednia komunikacja z hostem aktywna.');
                console.log('📊 Komunikacja gry teraz działa w trybie P2P z mniejszym opóźnieniem.');
                this.p2pConnected = true;

                // Po nawiązaniu połączenia, wymień dane graczy przez P2P
                this.exchangePlayerDataP2P();
            } else if (state === 'disconnected' || state === 'failed') {
                console.log('❌ Połączenie P2P utracone - powrót do standardowej komunikacji');
                this.p2pConnected = false;

                // Spróbuj ponownie nawiązać połączenie P2P
                setTimeout(() => {
                    console.log('🔄 Automatyczna próba ponownego nawiązania połączenia P2P...');
                    this.reconnectP2P();
                }, 3000);
            }
        };

        // Obsługuje zdarzenie błędu ICE
        this.peerConnection.onicecandidateerror = (error) => {
            console.error('❌ Błąd kandydata ICE:', error);
        };

        // Rozpocznij proces wymiany ofert i odpowiedzi
        this.createOffer();
    }

    createOffer() {
        console.log('📞 Tworzenie oferty połączenia P2P...');

        this.peerConnection.createOffer()
            .then(offer => {
                console.log('📄 Oferta połączenia P2P utworzona:', offer);

                // Ustaw lokalną ofertę
                return this.peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                console.log('✅ Lokalna oferta ustawiona, wysyłanie do drugiego gracza...');

                // Wyślij ofertę do drugiego gracza przez hosta
                this.sendToHost('p2pOffer', {
                    playerId: this.playerId,
                    sdp: this.peerConnection.localDescription
                });
            })
            .catch(error => {
                console.error('❌ Błąd podczas tworzenia oferty P2P:', error);
            });
    }

    handleP2PAnswer(answer) {
        console.log('📩 Otrzymano odpowiedź na ofertę P2P:', answer);

        // Ustaw zdalny opis połączenia
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => {
                console.log('✅ Zdalny opis połączenia P2P ustawiony');
            })
            .catch(error => {
                console.error('❌ Błąd podczas ustawiania zdalnego opisu połączenia P2P:', error);
            });
    }

    addIceCandidate(candidate) {
        console.log('➕ Dodawanie kandydata ICE:', candidate);

        // Dodaj kandyta ICE do połączenia
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => {
                console.log('✅ Kandydat ICE dodany');
            })
            .catch(error => {
                console.error('❌ Błąd podczas dodawania kandydata ICE:', error);
            });
    }

    exchangePlayerDataP2P() {
        console.log('🔄 Wymiana danych graczy przez P2P');

        // Wyślij aktualne dane graczy przez P2P
        Object.keys(this.playerData).forEach(playerKey => {
            const playerId = playerKey.replace('player', '');
            const tiltValue = this.playerData[playerKey].tilt;

            // Przekaż dane o pochyleniu gracza przez P2P
            this.sendToHost('playerDataP2P', {
                playerId: playerId,
                tilt: tiltValue
            });
        });
    }

    reconnectP2P() {
        console.log('🔄 Próba ponownego nawiązania połączenia P2P...');

        // Zresetuj połączenie P2P
        this.peerConnection.close();
        this.p2pConnected = false;

        // Spróbuj ponownie nawiązać połączenie P2P
        this.initP2PConnection();
    }
}

// Globalna instancja komunikacji
const gameComm = new GameCommunication();
