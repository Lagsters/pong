class PongGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.isPaused = false;
        this.gameRunning = false;

        // Wynik
        this.player1Score = 0;
        this.player2Score = 0;
        this.maxScore = 5;

        // Piłka
        this.ball = {
            x: this.width / 2,
            y: this.height / 2,
            vx: 5,
            vy: 3,
            radius: 10,
            speed: 5
        };

        // Paletki
        this.paddleWidth = 15;
        this.paddleHeight = 80;

        this.player1Paddle = {
            x: 20,
            y: this.height / 2 - this.paddleHeight / 2,
            width: this.paddleWidth,
            height: this.paddleHeight,
            speed: 8
        };

        this.player2Paddle = {
            x: this.width - 35,
            y: this.height / 2 - this.paddleHeight / 2,
            width: this.paddleWidth,
            height: this.paddleHeight,
            speed: 8
        };

        // Kontrolery żyroskopowe
        this.player1Tilt = 0;
        this.player2Tilt = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Nasłuchiwanie na zmiany orientacji - już nie potrzebne
        // Dane będą pobierane z gameComm w updatePaddles()
    }

    start() {
        this.gameRunning = true;
        this.isPaused = false;
        this.resetBall();
        this.gameLoop();
    }

    pause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused && this.gameRunning) {
            this.gameLoop();
        }
    }

    stop() {
        this.gameRunning = false;
        this.isPaused = false;
    }

    reset() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.resetBall();
        this.resetPaddles();
        this.updateScore();
    }

    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;

        // Losowy kierunek początkowy
        const angle = (Math.random() * Math.PI / 2) - Math.PI / 4; // -45° do 45°
        const direction = Math.random() < 0.5 ? 1 : -1;

        this.ball.vx = Math.cos(angle) * this.ball.speed * direction;
        this.ball.vy = Math.sin(angle) * this.ball.speed;
    }

    resetPaddles() {
        this.player1Paddle.y = this.height / 2 - this.paddleHeight / 2;
        this.player2Paddle.y = this.height / 2 - this.paddleHeight / 2;
    }

    update() {
        if (this.isPaused || !this.gameRunning) return;

        // Aktualizacja pozycji paletek na podstawie żyroskopów
        this.updatePaddles();

        // Aktualizacja pozycji piłki
        this.updateBall();

        // Sprawdzenie kolizji
        this.checkCollisions();

        // Sprawdzenie czy ktoś zdobył punkt
        this.checkScore();
    }

    updatePaddles() {
        // Pobierz dane o pochyleniu z systemu komunikacji
        let player1Tilt = 0;
        let player2Tilt = 0;

        if (window.gameComm && window.gameComm.isHost) {
            player1Tilt = window.gameComm.playerData.player1.tilt;
            player2Tilt = window.gameComm.playerData.player2.tilt;
        } else {
            // Fallback dla starego systemu (jeśli ktoś używa bez QR)
            player1Tilt = this.player1Tilt;
            player2Tilt = this.player2Tilt;
        }

        // Gracz 1 (lewa paletka)
        const player1Movement = player1Tilt * this.player1Paddle.speed;
        this.player1Paddle.y += player1Movement;

        // Gracz 2 (prawa paletka)
        const player2Movement = player2Tilt * this.player2Paddle.speed;
        this.player2Paddle.y += player2Movement;

        // Ograniczenie paletek do obszaru gry
        this.player1Paddle.y = Math.max(0, Math.min(this.height - this.paddleHeight, this.player1Paddle.y));
        this.player2Paddle.y = Math.max(0, Math.min(this.height - this.paddleHeight, this.player2Paddle.y));
    }

    updateBall() {
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Odbicie od górnej i dolnej ściany
        if (this.ball.y <= this.ball.radius || this.ball.y >= this.height - this.ball.radius) {
            this.ball.vy = -this.ball.vy;
        }
    }

    checkCollisions() {
        // Kolizja z lewą paletką (Gracz 1)
        if (this.ball.x - this.ball.radius <= this.player1Paddle.x + this.player1Paddle.width &&
            this.ball.y >= this.player1Paddle.y &&
            this.ball.y <= this.player1Paddle.y + this.player1Paddle.height &&
            this.ball.vx < 0) {

            this.ball.vx = -this.ball.vx;
            this.ball.x = this.player1Paddle.x + this.player1Paddle.width + this.ball.radius;
        }

        // Kolizja z prawą paletką (Gracz 2)
        if (this.ball.x + this.ball.radius >= this.player2Paddle.x &&
            this.ball.y >= this.player2Paddle.y &&
            this.ball.y <= this.player2Paddle.y + this.player2Paddle.height &&
            this.ball.vx > 0) {

            this.ball.vx = -this.ball.vx;
            this.ball.x = this.player2Paddle.x - this.ball.radius;
        }
    }

    checkScore() {
        // Punkt dla gracza 2 (piłka wyszła po lewej stronie)
        if (this.ball.x < 0) {
            this.player2Score++;
            this.updateScore();
            this.resetBall();

            if (this.player2Score >= this.maxScore) {
                this.endGame('Gracz 2');
            }
        }

        // Punkt dla gracza 1 (piłka wyszła po prawej stronie)
        if (this.ball.x > this.width) {
            this.player1Score++;
            this.updateScore();
            this.resetBall();

            if (this.player1Score >= this.maxScore) {
                this.endGame('Gracz 1');
            }
        }
    }

    updateScore() {
        document.getElementById('player1Score').textContent = this.player1Score;
        document.getElementById('player2Score').textContent = this.player2Score;
    }

    endGame(winner) {
        this.stop();
        document.getElementById('winnerText').textContent = `${winner} wygrywa!`;
        document.getElementById('finalPlayer1Score').textContent = this.player1Score;
        document.getElementById('finalPlayer2Score').textContent = this.player2Score;
        showScreen('gameOverScreen');
    }

    // FUNKCJE RENDEROWANIA - TO BYŁO BRAKUJĄCE!
    gameLoop() {
        if (!this.gameRunning) return;

        this.update();
        this.draw();

        if (!this.isPaused) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    draw() {
        // Wyczyść canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Narysuj linie środkowe
        this.drawCenterLine();

        // Narysuj paletki
        this.drawPaddles();

        // Narysuj piłkę
        this.drawBall();
    }

    drawCenterLine() {
        this.ctx.setLineDash([10, 10]);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawPaddles() {
        this.ctx.fillStyle = '#FFFFFF';

        // Lewa paletka (Gracz 1)
        this.ctx.fillRect(
            this.player1Paddle.x,
            this.player1Paddle.y,
            this.player1Paddle.width,
            this.player1Paddle.height
        );

        // Prawa paletka (Gracz 2)
        this.ctx.fillRect(
            this.player2Paddle.x,
            this.player2Paddle.y,
            this.player2Paddle.width,
            this.player2Paddle.height
        );
    }

    drawBall() {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

// Globalna instancja gry
let game = null;
