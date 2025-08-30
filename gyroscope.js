class GyroscopeController {
    constructor() {
        this.isSupported = false;
        this.isPermissionGranted = false;
        this.orientation = { beta: 0, gamma: 0 };
        this.callbacks = [];
        this.calibrationOffset = 0;
        this.isCalibrated = false;

        this.checkSupport();
    }

    checkSupport() {
        this.isSupported = 'DeviceOrientationEvent' in window;
        return this.isSupported;
    }

    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Żyroskop nie jest obsługiwany na tym urządzeniu');
        }

        // Dla iOS 13+ wymagane jest uprawnienie
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                this.isPermissionGranted = permission === 'granted';

                if (!this.isPermissionGranted) {
                    throw new Error('Brak uprawnień do żyroskopu');
                }
            } catch (error) {
                throw new Error('Nie udało się uzyskać uprawnień do żyroskopu');
            }
        } else {
            // Android i starsze wersje iOS
            this.isPermissionGranted = true;
        }

        return this.isPermissionGranted;
    }

    startListening() {
        if (!this.isSupported || !this.isPermissionGranted) {
            throw new Error('Żyroskop nie jest dostępny');
        }

        // Zapisz referencję do funkcji obsługi dla późniejszego usunięcia
        this.orientationHandler = (event) => {
            this.orientation.beta = event.beta || 0;  // Obrót w przód/tył (-180 do 180)
            this.orientation.gamma = event.gamma || 0; // Obrót w lewo/prawo (-90 do 90)

            // Debug - loguj pierwsze 5 sekund
            if (!this.lastLogTime || Date.now() - this.lastLogTime > 1000) {
                console.log('🔄 Dane żyroskopu:', {
                    beta: this.orientation.beta.toFixed(1),
                    gamma: this.orientation.gamma.toFixed(1),
                    tilt: this.getVerticalTilt().toFixed(3)
                });
                this.lastLogTime = Date.now();
            }

            this.notifyCallbacks();
        };

        window.addEventListener('deviceorientation', this.orientationHandler);
        console.log('👂 Żyroskop rozpoczął nasłuchiwanie zdarzeń deviceorientation');
    }

    stopListening() {
        if (this.orientationHandler) {
            window.removeEventListener('deviceorientation', this.orientationHandler);
            this.orientationHandler = null;
            console.log('🛑 Żyroskop zatrzymał nasłuchiwanie');
        }
    }

    calibrate() {
        this.calibrationOffset = this.orientation.beta;
        this.isCalibrated = true;
    }

    getVerticalTilt() {
        if (!this.isCalibrated) {
            return 0;
        }

        // Zwraca wartość od -1 do 1 na podstawie pochylenia telefonu
        // Zwiększona czułość dla lepszej responsywności
        const tilt = (this.orientation.beta - this.calibrationOffset) / 30; // Zmieniono z 45 na 30 stopni dla większej czułości
        return Math.max(-1, Math.min(1, tilt));
    }

    onOrientationChange(callback) {
        this.callbacks.push(callback);
    }

    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            callback(this.orientation, this.getVerticalTilt());
        });
    }

    // Metoda do debugowania
    getOrientationString() {
        return `Beta: ${this.orientation.beta.toFixed(1)}°, Gamma: ${this.orientation.gamma.toFixed(1)}°, Tilt: ${this.getVerticalTilt().toFixed(2)}`;
    }
}

// Globalna instancja kontrolera żyroskopu
const gyroscope = new GyroscopeController();
