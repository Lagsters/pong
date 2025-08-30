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
            // Spróbuj najpierw natywne Wake Lock API
            if (this.isSupported()) {
                console.log('🔆 Wake Lock API jest obsługiwane. Aktywuję...');
                this.wakeLock = await navigator.wakeLock.request('screen');

                // Rejestruj handler dla wypadku utraty blokady
                this.wakeLock.addEventListener('release', () => {
                    console.log('⚠️ Wake Lock został zwolniony!');
                    this.isActive = false;

                    // Próbuj automatycznie odnowić Wake Lock
                    setTimeout(() => {
                        console.log('🔄 Próba automatycznego odnowienia Wake Lock...');
                        this.activate();
                    }, 1000);
                });

                // Rejestruj handler dla zdarzeń widoczności strony
                document.addEventListener('visibilitychange', async () => {
                    if (document.visibilityState === 'visible' && !this.isActive) {
                        console.log('📱 Strona znów widoczna - odnawiam Wake Lock');
                        await this.activate();
                    }
                });

                console.log('✅ Wake Lock aktywowany pomyślnie!');
                this.isActive = true;
                return;
            }

            // Fallback 1: Użyj elementu wideo, który jest niewidoczny
            console.log('⚠️ Wake Lock API nie jest obsługiwane, używam fallbacku z wideo...');
            if (!this.videoElement) {
                this.videoElement = document.createElement('video');
                this.videoElement.setAttribute('playsinline', '');
                this.videoElement.setAttribute('muted', '');
                this.videoElement.setAttribute('loop', '');
                this.videoElement.style.position = 'absolute';
                this.videoElement.style.width = '1px';
                this.videoElement.style.height = '1px';
                this.videoElement.style.opacity = '0.01';
                document.body.appendChild(this.videoElement);

                // Fallback dla iOS - odtwórz wyciszony film
                this.videoElement.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0AAACrQYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjYwMSBhMGNkN2QzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTEgZGVibG9jaz0wOjA6MCBhbmFseXNlPTB4MToweDEwMCBtZT1oZXggc3VibWU9MiBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0wIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MCA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0wIHRocmVhZHM9MTIgbG9va2FoZWFkX3RocmVhZHM9MiBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0wIHdlaWdodHA9MCBrZXlpbnQ9MzAga2V5aW50X21pbj0zIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9MTAgcmM9Y3JmIG1idHJlZT0wIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCB2YnZfbWF4cmF0ZT03NjggdmJ2X2J1ZnNpemU9MzAwMCBjcmZfbWF4PTAuMCBuYWxfaHJkPW5vbmUgZmlsbGVyPTAgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAA9liIQAM//+9uy+BTYUyMEAAAASZYiEADL//vbsvgU2FMjBAAAADmWIhAAy//72ZoXwTYdmAAAAE2WIhAAy//72ZvwUCfXLtJcnAAAAABBliIQAR777zHk9o35vLpmVAAAAABRliIQAR777zOUwiJQTETD+JQUAAACZZYiEAEfvvvMowkwzmONRFAAAAA5liIQAR++/M1nShEL4zgAAABFliIQAR++/M2+SXGqIUxEw/gAAAB1liIQAR++/M2jOZlSRqCIiMPwPYf9PjAU2FMjAAAAARmWIhABH778zeM5yVHz+IiIw/g9iD0+MBTYUyMAAAAApZYiEAEfvvzOCRs9R/URfNIiIw/A9h/0+MBTYUyMEAAAAE2WIhABH778zZjfz2qQ+QOeJWwAAABFliIQAR++/M2inpJBMREROAAAAABNliIQAR++/M2MyqN0ZYOolDiwQAAAAEWWIhABH778zbjkTZAO42FEUAAAADmWIhABH778zaLJMLhFsAAAAFGWIhABH778zanDZLh8BETDKdgAAAA5liIQAR++/M2zUpYYejgAAABJliIQAR++/M14hHQPCjoj9dgAAABNliIQAR++/M10i2v/hPiIw/AkQAAAAGGWIhABH778zUJRP1JtUREROAORMEXYAAAAYZYiEAEfvvzNfPs+N9ERETgDkTBF2AAAADmWIhABH778zbM3XgwcuAAAAE2WIhABH778zWPGs7hdiIiIOlQAAABNliIQAR++/M1s2z4x3sYiIg6UAAAAUZYiEAEfvvzNbs21RbCIiIg6VAAAAGGWIhABH778zW6vTo+WTJ1ERETDoAAAADWWIhABH778zWPTTByoAAAAbZYiEAEfvvzNZVbun3/kRERJ3h//MqjYUyMEAAAAbZYiEAEfvvzNYdGHdeRERETgDkTBF2AAAABVliIQAR++/M1jTI9ZBfIiIg6UAAAAUZYiEAEfvvzNUkzpR5O2IiIOlAAAAFGWIhABH778zVPHvCejpiIiDpQAAABRliIQAR++/M1TW9LOl5IiIg6UAAAAaZYiEAEfvvzNU1vSzpeR//LJPDpUAAAAPZYiEAEfvvzOISwZckmUAAAAVZYiEAEfvvzNovaKfDoiIiIOlAAAAF2WIhABH778zajVIp8VSIiIiDpUAAAAOZYiEAEfvvzNoE9JBBGwAAAARZYiEAEfvvzNXO52z3REREwAAAABFliIQAR++/M1c7nbPdEEQkwAAAAAtliIQAR++/M2zo+QAAAA9liIQAR++/M1CmOatRFgAAABtliIQAR++/M1CmOatRF//8u9ByJgAAABBliIQAR++/M2jopHITREwzAAAAFWWIhABH778zVXWrcs5tIiIg6UAAAAOZYiEAEfvvzNglBbHjoAAAABJliIQAR++/M1jJfWdORETDMAAAAAECAAAOZYiEAH//+92JGoQAAAIPZYiEAH//+9YQthUAAAAUZYiEAH//+92L5Yk0KMjBAAAAAA==';
                this.videoElement.load();
                this.videoElement.play().catch(e => {
                    console.warn('⚠️ Błąd odtwarzania wideo do blokady ekranu:', e);
                });
            }

            // Fallback 2: Użyj setInterval dla utrzymania procesora w pracy
            console.log('🔄 Dodatkowy fallback - używam setInterval...');
            if (!this.fallbackInterval) {
                this.fallbackInterval = setInterval(() => {
                    // Wykonaj coś prostego, aby trzymać procesor w pracy
                    const time = new Date().getTime();
                    console.log(`🔆 Wake Lock fallback aktywny: ${time % 100000}`);
                }, 5000);
            }

            this.isActive = true;
            console.log('✅ Fallbacki Wake Lock uruchomione');

        } catch (error) {
            console.error('❌ Błąd aktywacji Wake Lock:', error);

            // Użyj ostatniej szansy fallback
            if (!this.fallbackInterval) {
                console.log('⚡ Używam ostatecznego fallbacku Wake Lock...');
                this.fallbackInterval = setInterval(() => {
                    // Drobna operacja do utrzymania procesora
                    console.log(`🔆 Wake Lock ostatnia szansa: ${new Date().getTime() % 1000}`);
                }, 10000);
            }
        }
    }

    // Dezaktywuj blokadę wygaszania ekranu
    deactivate() {
        console.log('🌙 Dezaktywuję blokadę wygaszania ekranu...');
        
        // Zwolnij Wake Lock API
        if (this.wakeLock) {
            this.wakeLock.release()
                .then(() => {
                    console.log('✅ Wake Lock zwolniony pomyślnie');
                })
                .catch((error) => {
                    console.error('❌ Błąd podczas zwalniania Wake Lock:', error);
                })
                .finally(() => {
                    this.wakeLock = null;
                });
        }
        
        // Zatrzymaj fallback z wideo
        if (this.videoElement) {
            try {
                this.videoElement.pause();
                this.videoElement.src = '';
                this.videoElement.remove();
                this.videoElement = null;
            } catch (e) {
                console.warn('⚠️ Błąd podczas czyszczenia elementu wideo:', e);
            }
        }

        // Zatrzymaj fallback z interwałem
        if (this.fallbackInterval) {
            clearInterval(this.fallbackInterval);
            this.fallbackInterval = null;
        }
        
        this.isActive = false;
        console.log('✅ Wake Lock dezaktywowany');
    }
}

// Globalna instancja blokady wygaszania ekranu
const screenWakeLock = new ScreenWakeLock();
