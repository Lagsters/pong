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
    console.log('Host DOMContentLoaded - automatyczna inicjalizacja jako host');

    // Sprawdzenie obsługi żyroskopu
    if (!gyroscope.checkSupport()) {
        console.warn('Żyroskop nie jest obsługiwany. Kontrolery mogą nie działać poprawnie.');
    }

    // Automatycznie rozpocznij jako host
    await startAsHost();

    // Obsługa przycisków w grze
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', function() {
            if (game) {
                game.pause();
                this.textContent = game.isPaused ? 'Wznów' : 'Pauza';
            }
        });
    }

    const backToMenuBtn = document.getElementById('backToMenuBtn');
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', function() {
            if (game) {
                game.stop();
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

    // Zapobieganie przewijaniu na urządzeniach mobilnych
    document.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });

    // Ukrycie paska adresu na mobilnych
    window.addEventListener('load', function() {
        setTimeout(function() {
            window.scrollTo(0, 1);
        }, 0);
    });
});

async function startAsHost() {
    try {
        // Inicjalizuj jako host
        await gameComm.initHost();

        // Pokaż ekran z kodami QR
        showScreen('qrScreen');

        // Ustaw początkowe statusy
        document.getElementById('status1').textContent = 'Oczekiwanie...';
        document.getElementById('status1').className = 'player-status waiting';
        document.getElementById('status2').textContent = 'Oczekiwanie...';
        document.getElementById('status2').className = 'player-status waiting';

        console.log('Host zainicjalizowany, wyświetlono kody QR');

    } catch (error) {
        alert(`Błąd inicjalizacji hosta: ${error.message}`);
        console.error('Błąd hosta:', error);
    }
}

function startGameFromQR() {
    // Sprawdź czy obaj gracze są połączeni
    if (!gameComm.connectedPlayers.player1 || !gameComm.connectedPlayers.player2) {
        alert('Nie wszyscy gracze są połączeni!');
        return;
    }

    // Inicjalizacja canvas i gry
    const canvas = document.getElementById('gameCanvas');

    // Dostosowanie rozmiaru canvas do ekranu
    const containerWidth = Math.min(window.innerWidth * 0.9, 800);
    const containerHeight = Math.min(window.innerHeight * 0.6, 400);

    canvas.width = containerWidth;
    canvas.height = containerHeight;
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';

    // Tworzenie nowej instancji gry
    game = new PongGame(canvas);

    // Ustaw źródło danych dla gry (z komunikacji zamiast bezpośrednio z żyroskopu)
    game.getPlayerTilts = function() {
        return {
            player1: gameComm.playerData.player1.tilt,
            player2: gameComm.playerData.player2.tilt
        };
    };

    game.reset();
    game.start();

    // Przejście do ekranu gry
    showScreen('gameScreen');

    // Aktualizuj odchylenie Gracza 1 i Gracza 2 na ekranie gry
    setInterval(() => {
        const player1TiltElement = document.getElementById('gamePlayer1Tilt');
        const player2TiltElement = document.getElementById('gamePlayer2Tilt');

        if (player1TiltElement) {
            const tilt1 = gameComm.playerData.player1.tilt || 0;
            player1TiltElement.textContent = `${(tilt1 * 45).toFixed(1)}°`;
        }

        if (player2TiltElement) {
            const tilt2 = gameComm.playerData.player2.tilt || 0;
            player2TiltElement.textContent = `${(tilt2 * 45).toFixed(1)}°`;
        }
    }, 100);

    console.log('Gra rozpoczęta z kontrolerami QR!');
}

function resetGame() {
    // Reset zmiennych globalnych
    currentPlayer = null;
    playersReady = { player1: false, player2: false };

    // Reset przycisku pauzy
    document.getElementById('pauseBtn').textContent = 'Pauza';

    // Rozłącz komunikację
    if (gameComm) {
        gameComm.disconnect();
    }

    if (game) {
        game.stop();
        game = null;
    }
}

// Obsługa zmiany orientacji ekranu
window.addEventListener('orientationchange', function() {
    setTimeout(function() {
        if (game) {
            const canvas = document.getElementById('gameCanvas');
            const containerWidth = Math.min(window.innerWidth * 0.9, 800);
            const containerHeight = Math.min(window.innerHeight * 0.6, 400);

            canvas.width = containerWidth;
            canvas.height = containerHeight;
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = containerHeight + 'px';

            // Ponowna inicjalizacja gry z nowymi wymiarami
            game.width = containerWidth;
            game.height = containerHeight;
            game.resetPaddles();
        }
    }, 100);
});

// Obsługa wyjścia z aplikacji
window.addEventListener('beforeunload', function() {
    if (gameComm) {
        gameComm.disconnect();
    }
});

// Eksportowanie do globalnego zasięgu dla debugowania
window.gameComm = gameComm;
window.currentPlayer = currentPlayer;
window.game = game;
