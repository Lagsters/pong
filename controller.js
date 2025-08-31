// Kontroler - logika dla urządzeń mobilnych
console.log('🎮 controller.js ZAŁADOWANY!');

// Funkcja do zarządzania ekranami (potrzebna dla kontrolera)
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// Inicjalizacja kontrolera po załadowaniu strony
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Controller DOMContentLoaded - START');

    // Sprawdź parametry URL
    const urlParams = new URLSearchParams(window.location.search);
    const player = urlParams.get('player');

    console.log('Controller - parametry URL:', { player });

    if (!player) {
        console.error('Brak parametru player w URL kontrolera');
        document.getElementById('controllerTitle').textContent = 'Błąd - Brak parametru gracza';
        document.getElementById('gyroStatus').textContent = 'Błąd: Nieprawidłowy link';
        return;
    }

    // Konfiguracja gameComm jako kontroler
    gameComm.isController = true;
    gameComm.playerId = player;
    gameComm.hostUrl = `${window.location.protocol}//${window.location.host}`;

    console.log('🎯 Kontroler skonfigurowany:', {
        playerId: gameComm.playerId,
        hostUrl: gameComm.hostUrl
    });

    // Aktualizuj tytuł strony
    document.getElementById('controllerTitle').textContent = `Kontroler - Gracz ${player}`;

    // Sprawdzenie obsługi żyroskopu
    if (!gyroscope.checkSupport()) {
        console.warn('Żyroskop nie jest obsługiwany');
        document.getElementById('gyroStatus').textContent = 'Żyroskop niedostępny';
    }

    // Inicjalizacja kontrolera
    try {
        await gameComm.initController();
        console.log('✅ Kontroler zainicjalizowany');
    } catch (error) {
        console.error('❌ Błąd inicjalizacji kontrolera:', error);
        document.getElementById('gyroStatus').textContent = `Błąd: ${error.message}`;
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

    console.log('🎮 Controller inicjalizacja zakończona');
});
