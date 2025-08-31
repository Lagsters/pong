// Globalne zmienne
let currentPlayer = null;
let playersReady = { player1: false, player2: false };

// Funkcje do zarządzania ekranami
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Inicjalizacja po załadowaniu strony - tylko dla gry/hosta
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎮 DOMContentLoaded - sprawdzanie trybu aplikacji');

    // Sprawdź czy to kontroler czy host
    const urlParams = new URLSearchParams(window.location.search);
    const isController = urlParams.has('player');

    if (isController) {
        console.log('📱 Tryb kontrolera - nie inicjalizuję hosta');
        return; // GameCommunication zajmie się kontrolerem
    }

    console.log('🖥️ Tryb hosta - automatyczna inicjalizacja');

    // Sprawdzenie obsługi żyroskopu
    if (!gyroscope.checkSupport()) {
        console.warn('⚠️ Żyroskop nie jest obsługiwany. Kontrolery mogą nie działać poprawnie.');
    }

    // Automatycznie rozpocznij jako host
    await startAsHost();

    // Obsługa przycisków w grze
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', function() {
            if (window.game) {
                window.game.pause();
                this.textContent = window.game.isPaused ? 'Wznów' : 'Pauza';
            }
        });
    }

    const backToMenuBtn = document.getElementById('backToMenuBtn');
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', function() {
            if (window.game) {
                window.game.stop();
            }
            resetGame();
            showScreen('qrScreen');
        });
    }

    // Obsługa przycisków na ekranie końca gry
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', function() {
            resetGame();
            showScreen('qrScreen');
        });
    }

    const backToMenuBtn2 = document.getElementById('backToMenuBtn2');
    if (backToMenuBtn2) {
        backToMenuBtn2.addEventListener('click', function() {
            resetGame();
            showScreen('qrScreen');
        });
    }
});

// Funkcja do rozpoczęcia gry jako host
async function startAsHost() {
    console.log('🏠 Rozpoczynam jako host');

    try {
        // Inicjalizuj komunikację jako host
        await gameComm.initHost();

        // Generuj QR kody z opóźnieniem, aby P2P było gotowe
        setTimeout(async () => {
            await gameComm.generateQRCodes();
        }, 1000);

        // Pokaż ekran QR
        showScreen('qrScreen');

        console.log('✅ Host zainicjalizowany pomyślnie');
    } catch (error) {
        console.error('❌ Błąd inicjalizacji hosta:', error);
    }
}

// Funkcja do resetowania gry
function resetGame() {
    console.log('🔄 Resetowanie gry');

    // Zatrzymaj grę jeśli działa
    if (window.game) {
        window.game.stop();
        window.game = null;
    }

    // Zresetuj status graczy
    gameComm.connectedPlayers = { player1: false, player2: false };
    gameComm.playerData = { player1: { tilt: 0 }, player2: { tilt: 0 } };

    // Zresetuj wyświetlanie statusu graczy
    const status1 = document.getElementById('status1');
    const status2 = document.getElementById('status2');

    if (status1) {
        status1.textContent = 'Oczekiwanie...';
        status1.className = 'player-status';
    }

    if (status2) {
        status2.textContent = 'Oczekiwanie...';
        status2.className = 'player-status';
    }

    // Przywróć QR kody
    const qrSections = document.querySelectorAll('.qr-section');
    qrSections.forEach(section => {
        // Usuń komunikaty o połączeniu
        const connectedMsg = section.querySelector('.connected-message');
        if (connectedMsg) {
            connectedMsg.remove();
        }

        // Przywróć canvas QR
        const canvas = section.querySelector('canvas');
        if (canvas) {
            canvas.style.display = 'block';
        }

        // Przywróć alternatywne QR
        const googleQr = section.querySelector('.google-qr');
        if (googleQr) {
            googleQr.style.display = 'block';
        }

        // Przywróć linki tekstowe
        const textLink = section.querySelector('.text-link');
        if (textLink) {
            textLink.style.display = 'block';
        }
    });

    // Wygeneruj nowe QR kody z nowym Peer ID
    if (window.p2pConnection && window.p2pConnection.isHost) {
        // Zamknij stare połączenie i utwórz nowe
        window.p2pConnection.disconnect();
        setTimeout(async () => {
            await window.p2pConnection.initAsHost();
            setTimeout(async () => {
                await gameComm.generateQRCodes();
            }, 1000);
        }, 1000);
    }
}

// Funkcja do obsługi końca gry
function handleGameOver(winner, player1Score, player2Score) {
    console.log(`🏆 Koniec gry! Zwycięzca: ${winner}`);

    // Aktualizuj tekst zwycięzcy
    const winnerText = document.getElementById('winnerText');
    if (winnerText) {
        winnerText.textContent = `${winner} wygrywa!`;
    }

    // Aktualizuj końcowe wyniki
    const finalPlayer1Score = document.getElementById('finalPlayer1Score');
    const finalPlayer2Score = document.getElementById('finalPlayer2Score');

    if (finalPlayer1Score) {
        finalPlayer1Score.textContent = player1Score;
    }

    if (finalPlayer2Score) {
        finalPlayer2Score.textContent = player2Score;
    }

    // Pokaż ekran końca gry
    showScreen('gameOverScreen');
}

// Ekspozycja funkcji do użycia przez inne skrypty
window.showScreen = showScreen;
window.startAsHost = startAsHost;
window.resetGame = resetGame;
window.handleGameOver = handleGameOver;
