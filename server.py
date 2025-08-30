#!/usr/bin/env python3
import http.server
import socketserver
import ssl
import json
import os
import urllib.parse
import subprocess
import signal
import psutil
from datetime import datetime

class PongGameHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.game_data_file = 'game_data.json'
        super().__init__(*args, **kwargs)

    def log_message(self, format, *args):
        # Wyłącz domyślne logi HTTP serwera - zostawiamy tylko nasze ważne komunikaty
        pass

    def do_GET(self):
        # Loguj tylko ważne żądania, nie rutynowe /game-data
        if self.path != '/game-data':
            print(f"🌐 GET Request: {self.path} from {self.client_address[0]}")

        # AUTOMATYCZNE POŁĄCZENIE PO ZESKANOWANIU QR
        # Sprawdź czy to request od kontrolera (ma parametry player i host)
        if '?player=' in self.path and 'host=' in self.path:
            # Parsuj parametry URL
            from urllib.parse import urlparse, parse_qs
            parsed_url = urlparse(self.path)
            params = parse_qs(parsed_url.query)

            player_id = params.get('player', [None])[0]
            host = params.get('host', [None])[0]
            client_ip = self.client_address[0]

            if player_id and host:
                print(f"🎮 TELEFON ZESKANOWAŁ KOD QR!")
                print(f"📱 IP telefonu: {client_ip}")
                print(f"👤 Gracz: {player_id}")
                print(f"🏠 Host: {host}")

                # SPRAWDŹ CZY TEN TELEFON JEST JUŻ POŁĄCZONY JAKO INNY GRACZ
                game_data = self.load_game_data()

                # Dodaj tracking IP adresów
                if 'playerIPs' not in game_data:
                    game_data['playerIPs'] = {}

                # Sprawdź czy to IP jest już użyte przez innego gracza
                current_player_for_ip = None
                for pid, ip in game_data['playerIPs'].items():
                    if ip == client_ip and pid != f"player{player_id}":
                        current_player_for_ip = pid
                        break

                if current_player_for_ip:
                    print(f"⚠️  BŁĄD: Telefon {client_ip} jest już połączony jako {current_player_for_ip}!")
                    print(f"❌ Odmawiam połączenia jako gracz {player_id}")
                    print("-" * 50)

                    # Wyślij stronę błędu do telefonu
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html; charset=utf-8')
                    self.end_headers()

                    error_html = f"""
                    <!DOCTYPE html>
                    <html lang="pl">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Błąd połączenia</title>
                        <style>
                            body {{
                                font-family: Arial, sans-serif;
                                text-align: center;
                                padding: 50px;
                                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                                color: white;
                                margin: 0;
                            }}
                            .container {{
                                background: rgba(255,255,255,0.1);
                                padding: 30px;
                                border-radius: 15px;
                                max-width: 400px;
                                margin: 0 auto;
                            }}
                            h1 {{ color: #fff; margin-bottom: 20px; }}
                            .error-icon {{ font-size: 4rem; margin-bottom: 20px; }}
                            .message {{ font-size: 1.2rem; margin-bottom: 30px; }}
                            .info {{ background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="error-icon">⚠️</div>
                            <h1>Telefon już połączony!</h1>
                            <div class="message">
                                Ten telefon jest już połączony jako <strong>{current_player_for_ip.replace('player', 'Gracz ')}</strong>.
                            </div>
                            <div class="info">
                                <p>Nie możesz używać tego samego telefonu dla różnych graczy.</p>
                                <p>Użyj innego telefonu lub odłącz się od poprzedniego gracza.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """
                    self.wfile.write(error_html.encode('utf-8'))
                    return  # Nie pozwól na połączenie

                print("-" * 50)

                # AUTOMATYCZNIE ZAPISZ GRACZA JAKO POŁĄCZONEGO
                print(f"💾 AUTOMATYCZNE ZAPISYWANIE GRACZA {player_id} JAKO POŁĄCZONY")
                game_data['connectedPlayers'][f"player{player_id}"] = True
                game_data['playerIPs'][f"player{player_id}"] = client_ip  # Zapisz IP gracza
                self.save_game_data(game_data)
                print(f"✅ Gracz {player_id} automatycznie zapisany jako połączony (IP: {client_ip})!")

        # Jeśli request to pobieranie danych gry
        if self.path == '/game-data':
            self.send_game_data()
        elif self.path == '/reset-players':
            # Endpoint do resetowania połączeń graczy
            self.reset_player_connections()
        else:
            # Standardowe obsłużenie plików statycznych
            super().do_GET()

    def reset_player_connections(self):
        """Reset wszystkich połączeń graczy"""
        print("🔄 RESETOWANIE POŁĄCZEŃ GRACZY")
        game_data = self.load_game_data()
        game_data['connectedPlayers'] = {'player1': False, 'player2': False}
        game_data['playerIPs'] = {}
        self.save_game_data(game_data)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'reset_complete', 'message': 'Wszystkie połączenia zostały zresetowane'}).encode())
        print("✅ Połączenia graczy zostały zresetowane")

    def do_POST(self):
        print(f"📡 POST Request: {self.path} from {self.client_address[0]}")

        # Obsłuż dane od kontrolerów
        if self.path == '/controller-data':
            self.handle_controller_data()
        else:
            print(f"❌ Nieznany POST endpoint: {self.path}")
            self.send_response(404)
            self.end_headers()

    def handle_controller_data(self):
        print(f"✅ OTRZYMANO DANE OD KONTROLERA!")
        try:
            # Pobierz dane z requesta
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            print(f"📊 Typ żądania: {data.get('type')}")
            print(f"👤 Dane gracza: {data.get('data')}")

            # Wczytaj istniejące dane gry
            game_data = self.load_game_data()

            # Aktualizuj dane na podstawie typu
            if data['type'] == 'playerConnect':
                player_id = data['data']['playerId']
                game_data['connectedPlayers'][f"player{player_id}"] = True
                print(f"🎯 GRACZ {player_id} ZOSTAŁ POŁĄCZONY!")

            elif data['type'] == 'playerData':
                player_id = data['data']['playerId']
                tilt = data['data']['tilt']
                game_data['playerData'][f"player{player_id}"] = {
                    'tilt': tilt,
                    'timestamp': data['timestamp']
                }
                # Nie loguj danych ruchu żeby nie zaśmiecać konsoli

            # Zapisz zaktualizowane dane
            self.save_game_data(game_data)

            # Wyślij odpowiedź
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())

        except Exception as e:
            print(f"❌ Błąd obsługi danych kontrolera: {e}")
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.end_headers()

    def send_game_data(self):
        try:
            game_data = self.load_game_data()

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(game_data).encode())

        except Exception as e:
            print(f"Błąd wysyłania danych gry: {e}")
            self.send_response(500)
            self.end_headers()

    def load_game_data(self):
        if os.path.exists(self.game_data_file):
            try:
                with open(self.game_data_file, 'r') as f:
                    return json.load(f)
            except:
                pass

        # Domyślne dane gry
        return {
            'connectedPlayers': {'player1': False, 'player2': False},
            'playerData': {
                'player1': {'tilt': 0, 'timestamp': 0},
                'player2': {'tilt': 0, 'timestamp': 0}
            }
        }

    def save_game_data(self, data):
        try:
            print(f"💾 Zapisuję dane gry: {data}")
            with open(self.game_data_file, 'w') as f:
                json.dump(data, f)
            print(f"✅ Dane zapisane pomyślnie do {self.game_data_file}")
        except Exception as e:
            print(f"❌ Błąd zapisu danych gry: {e}")
            import traceback
            traceback.print_exc()

    def do_OPTIONS(self):
        # Obsłuż CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def kill_old_server(port):
    """Znajdź i zabij stary serwer na tym porcie"""
    print(f"Sprawdzam czy port {port} jest zajęty...")

    current_pid = os.getpid()
    killed_any = False

    try:
        # Znajdź procesy używające danego portu
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                # Pomiń aktualny proces
                if proc.info['pid'] == current_pid:
                    continue

                # Sprawdź czy proces używa naszego portu
                for conn in proc.connections():
                    if hasattr(conn, 'laddr') and conn.laddr.port == port:
                        print(f"Znaleziono proces {proc.info['pid']} ({proc.info['name']}) używający portu {port}")
                        proc.terminate()
                        killed_any = True
                        print(f"Zatrzymano proces {proc.info['pid']}")
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

        # Sprawdź też stare procesy python server.py (ale nie aktualny)
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if (proc.info['pid'] != current_pid and
                    proc.info['cmdline'] and
                    any('python' in str(cmd) for cmd in proc.info['cmdline']) and
                    any('server.py' in str(cmd) for cmd in proc.info['cmdline'])):
                    print(f"Znaleziono stary serwer Python {proc.info['pid']}")
                    proc.terminate()
                    killed_any = True
                    print(f"Zatrzymano stary serwer {proc.info['pid']}")
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

        if killed_any:
            print("Czekam 2 sekundy na zwolnienie portu...")
            import time
            time.sleep(2)
        else:
            print(f"Port {port} jest wolny")

    except Exception as e:
        print(f"Błąd podczas zabijania starych procesów: {e}")
        print("Kontynuuję uruchamianie serwera...")

if __name__ == "__main__":
    PORT = 8000

    print("=" * 60)
    print("URUCHAMIANIE SERWERA PONG")
    print("=" * 60)

    try:
        # Automatycznie zabij stary serwer
        kill_old_server(PORT)

        # WYCZYŚĆ WSZYSTKIE POŁĄCZENIA PRZY STARCIE
        print("🔄 Czyszczenie starych połączeń...")
        game_data_file = 'game_data.json'
        if os.path.exists(game_data_file):
            os.remove(game_data_file)
            print("✅ Usunięto stary plik game_data.json")

        # Stwórz czysty plik z pustymi połączeniami
        clean_data = {
            'connectedPlayers': {'player1': False, 'player2': False},
            'playerData': {
                'player1': {'tilt': 0, 'timestamp': 0},
                'player2': {'tilt': 0, 'timestamp': 0}
            },
            'playerIPs': {}
        }
        with open(game_data_file, 'w') as f:
            json.dump(clean_data, f)
        print("✅ Utworzono czysty plik game_data.json")

        print(f"Uruchamiam nowy serwer Pong na porcie {PORT}")
        print(f"Otwórz https://192.168.100.2:{PORT} w przeglądarce")
        print("=" * 60)
        print("LOGOWANIE AKTYWNE - będziesz widzieć kiedy telefon skanuje QR!")
        print("=" * 60)
        print("Serwer jest gotowy do połączeń...")

        # Utwórz serwer z opcją ponownego użycia adresu
        with ReusableTCPServer(("", PORT), PongGameHandler) as httpd:
            # Skonfiguruj HTTPS z nowszym API
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ssl_context.load_cert_chain("server.crt", "server.key")
            httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)
            print(f"🔒 Serwer HTTPS uruchomiony - czujniki będą działać!")
            httpd.serve_forever()

    except Exception as e:
        print(f"BŁĄD: Nie udało się uruchomić serwera na porcie {PORT}: {e}")
        print("Sprawdzam czy port jest rzeczywiście wolny...")

        # Dodatkowe czekanie i ponowna próba
        import time
        time.sleep(3)

        try:
            print(f"Ponowna próba uruchomienia na porcie {PORT}")
            with ReusableTCPServer(("", PORT), PongGameHandler) as httpd:
                # Skonfiguruj HTTPS z nowszym API
                ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                ssl_context.load_cert_chain("server.crt", "server.key")
                httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)
                print(f"✅ Serwer HTTPS pomyślnie uruchomiony na porcie {PORT}")
                print(f"🌐 Otwórz https://192.168.100.2:{PORT} w przeglądarce")
                print("🎮 Gotowy do skanowania kodów QR!")
                httpd.serve_forever()
        except Exception as e2:
            print(f"❌ Ostateczny błąd: Nie udało się uruchomić serwera na porcie {PORT}: {e2}")
            import traceback
            traceback.print_exc()
