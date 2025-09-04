class GyroscopeController {
    constructor() {
        this.isSupported = false;
        this.isPermissionGranted = false;
        this.orientation = { beta: 0, gamma: 0 };
        this.callbacks = [];
        this.calibrationOffset = 0;
        this.isCalibrated = false;
        this.isListening = false;
        this.orientationHandler = null;
        this.isIOS = this.detectIOS();

        this.checkSupport();
    }

    detectIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    checkSupport() {
        this.isSupported = 'DeviceOrientationEvent' in window;
        console.log('🧭 Sprawdzanie obsługi żyroskopu:', this.isSupported);
        return this.isSupported;
    }

    async init() {
        console.log('🔧 Inicjalizacja żyroskopu...');

        if (!this.isSupported) {
            throw new Error('Żyroskop nie jest obsługiwany na tym urządzeniu');
        }

        await this.requestPermission();
        this.startListening();

        console.log('✅ Żyroskop zainicjalizowany pomyślnie');
        return true;
    }

    async requestPermission() {
        console.log('🔐 Żądanie uprawnień do żyroskopu...');

        if (!this.isSupported) {
            throw new Error('Żyroskop nie jest obsługiwany na tym urządzeniu');
        }

        // Dla iOS 13+ wymagane jest uprawnienie i interakcja użytkownika
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                console.log('📱 iOS wykryty - żądanie uprawnień DeviceOrientationEvent');
                const permission = await DeviceOrientationEvent.requestPermission();
                this.isPermissionGranted = permission === 'granted';

                if (!this.isPermissionGranted) {
                    throw new Error(`Brak uprawnień do żyroskopu: ${permission}`);
                }

                console.log('✅ Uprawnienia DeviceOrientationEvent uzyskane');

                // Sprawdź również DeviceMotionEvent dla iOS
                if (typeof DeviceMotionEvent.requestPermission === 'function') {
                    try {
                        await DeviceMotionEvent.requestPermission();
                        console.log('✅ Uprawnienia DeviceMotionEvent również uzyskane');
                    } catch (motionError) {
                        console.log('⚠️ DeviceMotionEvent nie jest dostępny, ale DeviceOrientation działa');
                    }
                }
            } catch (error) {
                console.error('❌ Błąd uprawnień żyroskopu:', error);
                throw new Error(`Nie udało się uzyskać uprawnień do żyroskopu: ${error.message}`);
            }
        } else {
            // Android i starsze wersje iOS
            this.isPermissionGranted = true;
            console.log('✅ Uprawnienia do żyroskopu (automatyczne - Android/starszy iOS)');
        }

        return this.isPermissionGranted;
    }

    startListening() {
        if (!this.isSupported || !this.isPermissionGranted) {
            throw new Error('Żyroskop nie jest dostępny');
        }

        if (this.isListening) {
            console.log('⚠️ Żyroskop już nasłuchuje');
            return;
        }

        console.log('👂 Rozpoczynam nasłuchiwanie żyroskopu...');

        // Zapisz referencję do funkcji obsługi dla późniejszego usunięcia
        this.orientationHandler = (event) => {
            this.orientation.beta = event.beta || 0;  // Obrót w przód/tył (-180 do 180)
            this.orientation.gamma = event.gamma || 0; // Obrót w lewo/prawo (-90 do 90)

            // Oblicz pochylenie w procentach (-100% do +100%)
            // gamma: -90 (maksymalnie w lewo) do +90 (maksymalnie w prawo)
            let tiltPercent = (this.orientation.gamma / 90) * 100;

            // Ogranicz do zakresu -100 do +100
            tiltPercent = Math.max(-100, Math.min(100, tiltPercent));

            // Wywołaj wszystkie zarejestrowane callbacki
            this.callbacks.forEach(callback => {
                try {
                    callback(this.orientation, tiltPercent);
                } catch (error) {
                    console.error('❌ Błąd w callback żyroskopu:', error);
                }
            });
        };

        window.addEventListener('deviceorientation', this.orientationHandler, true);
        this.isListening = true;

        console.log('✅ Żyroskop nasłuchuje');
    }

    stopListening() {
        if (!this.isListening) {
            return;
        }

        console.log('🔇 Zatrzymywanie nasłuchiwania żyroskopu...');

        if (this.orientationHandler) {
            window.removeEventListener('deviceorientation', this.orientationHandler, true);
            this.orientationHandler = null;
        }

        this.isListening = false;
        console.log('✅ Żyroskop zatrzymany');
    }

    onOrientationChange(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback musi być funkcją');
        }

        this.callbacks.push(callback);
        console.log(`📋 Zarejestrowano callback żyroskopu (łącznie: ${this.callbacks.length})`);
    }

    removeCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
            console.log(`🗑️ Usunięto callback żyroskopu (pozostało: ${this.callbacks.length})`);
        }
    }

    calibrate() {
        if (!this.isListening) {
            console.warn('⚠️ Żyroskop nie nasłuchuje - nie można kalibrować');
            return;
        }

        this.calibrationOffset = this.orientation.gamma;
        this.isCalibrated = true;
        console.log(`🎯 Żyroskop skalibrowany (offset: ${this.calibrationOffset.toFixed(2)}°)`);
    }

    getCalibratedGamma() {
        if (!this.isCalibrated) {
            return this.orientation.gamma;
        }
        return this.orientation.gamma - this.calibrationOffset;
    }

    getStatus() {
        return {
            isSupported: this.isSupported,
            isPermissionGranted: this.isPermissionGranted,
            isListening: this.isListening,
            isCalibrated: this.isCalibrated,
            orientation: this.orientation,
            callbacksCount: this.callbacks.length
        };
    }
}

// Globalna instancja żyroskopu
const gyroscope = new GyroscopeController();

// Debug - loguj status żyroskopu
console.log('🧭 Gyroscope controller loaded:', gyroscope.getStatus());
