// Wake Lock - zapobiega wygaszaniu ekranu na urządzeniach mobilnych
class ScreenWakeLock {
    constructor() {
        this.wakeLock = null;
        this.isActive = false;
        this.fallbackInterval = null;
        this.videoElement = null;
        
        console.log('🔆 ScreenWakeLock zainicjalizowany');
    }

    // Sprawdź czy Wake Lock API jest obsługiwane
    isSupported() {
        return 'wakeLock' in navigator;
    }

    // Aktywuj blokadę wygaszania ekranu
    async activate() {
        console.log('🔆 Aktywuję blokadę wygaszania ekranu...');
        
        try {
            if (this.isSupported()) {
                // Użyj nowoczesnego Wake Lock API
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.isActive = true;
                
                console.log('✅ Wake Lock API aktywne');
                
                // Obsłuż sytuację gdy wake lock zostanie zwolniony
                this.wakeLock.addEventListener('release', () => {
                    console.log('🔆 Wake Lock zwolniony, próbuję reaktywować...');
                    this.isActive = false;
                    // Spróbuj reaktywować po krótkim opóźnieniu
                    setTimeout(() => this.reactivate(), 1000);
                });
                
            } else {
                console.log('📱 Wake Lock API nieobsługiwane, używam fallback...');
                this.activateFallback();
            }
            
            // Nasłuchuj na zmiany widoczności strony
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && !this.isActive) {
                    this.reactivate();
                }
            });
            
            // Pokaż wskaźnik
            this.showStatusIndicator();
            
        } catch (error) {
            console.warn('⚠️ Nie udało się aktywować Wake Lock:', error);
            this.activateFallback();
        }
    }

    // Reaktywuj wake lock
    async reactivate() {
        if (!this.isActive) {
            try {
                if (this.isSupported()) {
                    this.wakeLock = await navigator.wakeLock.request('screen');
                    this.isActive = true;
                    console.log('🔄 Wake Lock reaktywowany');
                } else {
                    this.activateFallback();
                }
            } catch (error) {
                console.warn('⚠️ Nie udało się reaktywować Wake Lock:', error);
                this.activateFallback();
            }
        }
    }

    // Fallback dla starszych przeglądarek
    activateFallback() {
        console.log('🔄 Aktywuję fallback dla blokady wygaszania...');
        
        // Metoda 1: Okresowo symuluj aktywność
        this.fallbackInterval = setInterval(() => {
            // Niewidzialny ruch kursora
            document.dispatchEvent(new Event('touchstart'));
            document.dispatchEvent(new Event('mousemove'));
        }, 15000); // Co 15 sekund
        
        // Metoda 2: Utwórz niewidzialny element audio/video
        this.createHiddenMedia();
        
        this.isActive = true;
        console.log('✅ Fallback aktywny');
    }

    createHiddenMedia() {
        // Usuń poprzedni element jeśli istnieje
        if (this.videoElement) {
            this.videoElement.remove();
        }
        
        // Utwórz niewidzialny element video
        this.videoElement = document.createElement('video');
        this.videoElement.style.cssText = `
            position: fixed;
            top: -10px;
            left: -10px;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
            z-index: -9999;
        `;
        
        this.videoElement.muted = true;
        this.videoElement.loop = true;
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        
        // Krótki, pusty plik video w base64 (1 sekunda czarnego ekranu)
        this.videoElement.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMWlzb21tcDQxAAAACGpzb21hdnZsBAAAAAhhdnZsQAYAAAAAAAYUvpAMnwAAAAEUvpAMnwAAAAAAAAAAAEVudm1hdnZsQCYAAAABc3FsAAAAAgAAAAEAAAABc3FsAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAQAAEVudm1hdnZsQCYAAAABc3FsAAAAAgAAAAEAAAABc3FsAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAQAAEVudm1hdnZsQCYAAAABc3FsAAAAAgAAAAEAAAABc3FsAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAQAACE=';
        
        document.body.appendChild(this.videoElement);
        
        // Spróbuj odtworzyć (może być zablokowane przez autoplay policy)
        this.videoElement.play().catch(error => {
            console.log('📱 Autoplay zablokowany (to normalne)');
        });
    }

    // Dezaktywuj blokadę
    deactivate() {
        console.log('🌙 Dezaktywuję blokadę wygaszania ekranu...');
        
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
        
        if (this.fallbackInterval) {
            clearInterval(this.fallbackInterval);
            this.fallbackInterval = null;
        }
        
        if (this.videoElement) {
            this.videoElement.remove();
            this.videoElement = null;
        }
        
        this.isActive = false;
        this.hideStatusIndicator();
    }

    // Pokaż wskaźnik na ekranie
    showStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'wakelock-indicator';
        indicator.innerHTML = '🔆 Ekran aktywny';
        indicator.style.cssText = `
            position: fixed;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 200, 0, 0.9);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            z-index: 9999;
            pointer-events: none;
            animation: slideDown 0.5s ease;
        `;
        
        // Dodaj animację
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { 
                    opacity: 0; 
                    transform: translateX(-50%) translateY(-20px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateX(-50%) translateY(0); 
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(indicator);
        
        // Ukryj po 3 sekundach
        setTimeout(() => {
            if (indicator && indicator.parentNode) {
                indicator.style.transition = 'all 0.5s ease';
                indicator.style.opacity = '0';
                indicator.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => {
                    if (indicator && indicator.parentNode) {
                        indicator.remove();
                    }
                }, 500);
            }
        }, 3000);
    }

    hideStatusIndicator() {
        const indicator = document.getElementById('wakelock-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Status blokady
    getStatus() {
        return {
            isActive: this.isActive,
            apiSupported: this.isSupported(),
            method: this.isSupported() ? 'Wake Lock API' : 'Fallback'
        };
    }
}

// Globalna instancja Wake Lock
const screenWakeLock = new ScreenWakeLock();
