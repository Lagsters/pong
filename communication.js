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
        const peerID = urlParams.get('peerID');

        console.log('📋 URLSearchParams:', urlParams.toString());
        console.log('👤 player parametr:', player);
        console.log('🆔 peerID parametr:', peerID);

        if (player) {
            console.log('✅ PARAMETR GRACZA ZNALEZIONY - inicjalizuję kontroler');
            this.isController = true;
            this.playerId = player;
            this.hostPeerId = peerID;

            console.log('🎯 Ustawiono isController:', this.isController);
            console.log('👤 Ustawiono playerId:', this.playerId);
            console.log('🆔 Ustawiono hostPeerId:', this.hostPeerId);

            // Opóźnienie aby DOM był gotowy + połączenie P2P
            setTimeout(() => {
                this.initController();
            }, 500);
        } else {
            console.log('❌ BRAK PARAMETRU GRACZA - to nie jest kontroler');
            console.log('❓ player:', player);
        }
    }

    generateControllerUrl(playerId, peerId) {
        // Automatycznie wykryj bazowy URL z aktualnej ścieżki
        const currentPath = window.location.pathname;
        const basePath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
        const baseUrl = `${window.location.protocol}//${window.location.host}${basePath}controller.html`;
        return `${baseUrl}?player=${playerId}&peerID=${peerId}`;
    }

    async initHost() {
        this.isHost = true;
        this.startTime = Date.now();

        console.log('🏠 INICJALIZACJA HOSTA - START');
        console.log('🔄 isHost ustawione na:', this.isHost);

        // Inicjalizuj P2P jako host
        if (window.p2pConnection) {
            await window.p2pConnection.initAsHost();
        }

        // Rozpocznij nasłuchiwanie na połączenia NATYCHMIAST
        this.startHostListening();

        console.log('👂 Host nasłuchuje na połączenia graczy...');
    }

    async generateQRCodes() {
        // Czekaj aż P2P będzie miało Peer ID
        let peerId = null;
        let attempts = 0;
        const maxAttempts = 50; // 5 sekund

        while (!peerId && attempts < maxAttempts) {
            if (window.p2pConnection && window.p2pConnection.hostPeerId) {
                peerId = window.p2pConnection.hostPeerId;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!peerId) {
            console.error('❌ Nie udało się uzyskać Peer ID w czasie 5 sekund');
            return;
        }

        const player1Url = this.generateControllerUrl('player1', peerId);
        const player2Url = this.generateControllerUrl('player2', peerId);

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
        // Konwertuj playerId do prawidłowego formatu
        const playerNumber = playerId.replace('player', ''); // "player1" -> "1"

        this.connectedPlayers[`player${playerNumber}`] = true;

        // Aktualizuj status na ekranie
        const statusElement = document.getElementById(`status${playerNumber}`);
        if (statusElement) {
            statusElement.textContent = 'Połączony!';
            statusElement.className = 'player-status connected';
        }

        // UKRYJ kod QR dla połączonego gracza
        const qrCanvas = document.getElementById(`qrPlayer${playerNumber}`);
        if (qrCanvas) {
            const qrSection = qrCanvas.parentElement;

            // Ukryj canvas QR
            if (qrCanvas) qrCanvas.style.display = 'none';

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
                    🎮 Gracz ${playerNumber} połączony!<br>
                    <div id="player${playerNumber}TiltLive" style="font-size: 1.5rem; margin-top: 10px; color: #FFD700;">
                        Odchylenie: 0%
                    </div>
                    <div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.8;">
                        Skala: -100% do +100%
                    </div>
                `;
                qrSection.appendChild(connectedMsg);
            }
        } else {
            console.error(`❌ Nie znaleziono elementu qrPlayer${playerNumber}`);
        }

        // Sprawdź czy obaj gracze są połączeni - jeśli tak, rozpocznij grę automatycznie
        if (this.connectedPlayers.player1 && this.connectedPlayers.player2) {
            console.log('Obaj gracze połączeni - automatyczne rozpoczęcie gry!');

            // Krótkie opóźnienie żeby użytkownik zobaczył status "Połączony!"
            setTimeout(() => {
                this.showCountdown();
            }, 1500); // 1.5 sekundy opóźnienia
        }

        console.log(`Gracz ${playerNumber} połączony`);
    }

    handlePlayerData(data) {
        console.log('🔄 handlePlayerData wywołane z danymi:', data);

        if (data.playerId && data.tilt !== undefined) {
            console.log(`📊 Aktualizuję dane gracza ${data.playerId} z tilt: ${data.tilt}`);

            this.playerData[`player${data.playerId}`].tilt = data.tilt;

            // Przekaż dane do gry
            if (window.game) {
                if (data.playerId === '1') {
                    window.game.player1Tilt = data.tilt;
                    console.log(`🎮 Ustawiono player1Tilt na: ${data.tilt}`);
                } else if (data.playerId === '2') {
                    window.game.player2Tilt = data.tilt;
                    console.log(`🎮 Ustawiono player2Tilt na: ${data.tilt}`);
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
                console.log(`📺 Zaktualizowano wyświetlanie dla gracza ${data.playerId}: ${tiltValue}%`);

                // Dodaj kolorowanie w zależności od wartości
                const absValue = Math.abs(data.tilt);
                if (absValue < 10) {
                    tiltLiveDisplay.style.color = '#FFD700'; // Złoty - środek
                } else if (absValue < 50) {
                    tiltLiveDisplay.style.color = '#90EE90'; // Jasno zielony - lekkie odchylenie
                } else {
                    tiltLiveDisplay.style.color = '#FF6B6B'; // Czerwony - duże odchylenie
                }
            } else {
                console.warn(`⚠️ Nie znaleziono elementu player${data.playerId}TiltLive`);
            }
        } else {
            console.warn('⚠️ Nieprawidłowe dane gracza:', data);
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
        console.log('📱 INICJALIZACJA KONTROLERA - START');
        console.log('🎮 Tryb kontrolera dla gracza:', this.playerId);

        // Aktywuj blokadę wygaszania ekranu
        console.log('☀️ Aktywuję blokadę wygaszania ekranu...');
        await screenWakeLock.activate();

        // Inicjalizuj żyroskop
        this.initGyroscope();

        // Inicjalizuj P2P jako kontroler
        if (window.p2pConnection && this.hostPeerId) {
            await window.p2pConnection.initAsController(this.playerId, this.hostPeerId);
        }

        // Aktualizuj tytuł strony
        this.updateControllerTitle();

        // Wyślij informację o połączeniu
        this.sendPlayerConnectMessage();

        console.log('✅ INICJALIZACJA KONTROLERA - ZAKOŃCZONA');
    }

    initGyroscope() {
        console.log('🧭 Inicjalizacja żyroskopu...');

        const gyroStatus = document.getElementById('gyroStatus');

        if (!gyroscope.checkSupport()) {
            console.error('❌ Żyroskop nie jest obsługiwany');
            if (gyroStatus) {
                gyroStatus.textContent = 'Żyroskop nie jest obsługiwany';
                gyroStatus.style.color = '#ff6b6b';
            }
            return;
        }

        gyroscope.init()
            .then(() => {
                console.log('✅ Żyroskop zainicjalizowany');
                if (gyroStatus) {
                    gyroStatus.textContent = 'Żyroskop aktywny';
                    gyroStatus.style.color = '#28a745';
                }
                this.startSendingData();
            })
            .catch((error) => {
                console.error('❌ Błąd inicjalizacji żyroskopu:', error);
                if (gyroStatus) {
                    gyroStatus.textContent = 'Błąd żyroskopu - dotknij ekranu aby aktywować';
                    gyroStatus.style.color = '#ffc107';
                }

                // Dodaj obsługę dotknięcia ekranu dla aktywacji żyroskopu
                document.addEventListener('touchstart', () => {
                    gyroscope.init()
                        .then(() => {
                            console.log('✅ Żyroskop aktywowany po dotknięciu');
                            if (gyroStatus) {
                                gyroStatus.textContent = 'Żyroskop aktywny';
                                gyroStatus.style.color = '#28a745';
                            }
                            this.startSendingData();
                        })
                        .catch(console.error);
                }, { once: true });
            });
    }

    updateControllerTitle() {
        const titleElement = document.getElementById('controllerTitle');
        if (titleElement) {
            titleElement.textContent = `Kontroler - Gracz ${this.playerId}`;
        }

        // Aktualizuj też tytuł dokumentu
        document.title = `Pong - Kontroler Gracza ${this.playerId}`;
    }

    async fetchGameData() {
        // Ta funkcja może być pusta lub usunięta, bo używamy P2P
        // Pozostawiam ją dla kompatybilności
    }

    startSendingData() {
        console.log('🔄 ROZPOCZYNAM WYSYŁANIE DANYCH ŻYROSKOPU');

        let lastSentTime = 0;
        const sendInterval = 50; // 50ms = 20 razy na sekundę

        gyroscope.onOrientationChange((orientation, tiltPercent) => {
            const now = Date.now();

            const limitedTiltPercent = Math.max(-100, Math.min(100, tiltPercent));

            if (now - lastSentTime < sendInterval) {
                return;
            }
            lastSentTime = now;

            // Debug - loguj wysyłane dane
            if (!this.lastSendLogTime || Date.now() - this.lastSendLogTime > 500) {
                console.log('📡 WYSYŁAM DANE:', {
                    playerId: this.playerId,
                    tiltPercent: limitedTiltPercent,
                    p2pConnected: this.p2pConnected
                });
                this.lastSendLogTime = Date.now();
            }

            // Aktualizuj wyświetlanie
            const tiltDisplay = document.getElementById('tiltDisplay');
            if (tiltDisplay) {
                tiltDisplay.textContent = `Pochylenie: ${limitedTiltPercent.toFixed(1)}%`;
            }

            const indicator = document.getElementById('movementIndicator');
            if (indicator) {
                const movement = Math.abs(limitedTiltPercent);
                indicator.style.width = `${Math.min(100, movement)}%`;
                indicator.style.backgroundColor = movement > 20 ? '#28a745' : '#ffc107';
            }

            // Wyślij dane przez P2P
            const data = {
                type: 'playerData',
                playerId: this.playerId,
                tilt: parseFloat(limitedTiltPercent.toFixed(1)),
                orientation: {
                    beta: parseFloat(orientation.beta.toFixed(1)),
                    gamma: parseFloat(orientation.gamma.toFixed(1))
                },
                timestamp: now
            };

            if (window.p2pConnection && this.p2pConnected) {
                window.p2pConnection.sendToHost(data);
            }
        });

        console.log('✅ Callback żyroskopu został zarejestrowany');
    }

    sendPlayerConnectMessage() {
        if (window.p2pConnection && this.p2pConnected) {
            window.p2pConnection.sendToHost({
                type: 'playerConnect',
                playerId: this.playerId,
                timestamp: Date.now()
            });
        }
    }

    updateConnectionStatus() {
        console.log('🔄 Aktualizacja statusu połączenia P2P:', this.p2pConnected);

        // Aktualizuj wyświetlanie statusu połączenia
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = this.p2pConnected ? 'Połączony (P2P)' : 'Łączenie...';
            statusElement.style.color = this.p2pConnected ? '#28a745' : '#ffc107';
        }
    }

    disconnect() {
        if (this.isController) {
            gyroscope.stopListening();

            console.log('🌙 Dezaktywuję blokadę wygaszania ekranu...');
            screenWakeLock.deactivate();
        }

        // Rozłącz P2P
        if (window.p2pConnection) {
            window.p2pConnection.disconnect();
        }

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
}

// Globalna instancja komunikacji
const gameComm = new GameCommunication();

// Udostępnij globalnie w window
window.gameComm = gameComm;
