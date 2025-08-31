#!/usr/bin/env python3
import http.server
import socketserver
import ssl
import os
import sys
import socket
import subprocess
import signal
import time

PORT = 8443

class LocalTestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Dodaj nagłówki CORS i bezpieczeństwa
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def check_port_available(port):
    """Sprawdź czy port jest dostępny"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', port))
            return True
    except OSError:
        return False

def kill_process_on_port(port):
    """Zatrzymaj proces używający podanego portu"""
    try:
        # Znajdź proces używający portu
        result = subprocess.run(['lsof', '-t', f'-i:{port}'],
                              capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip():
            pid = result.stdout.strip()
            print(f"🔍 Znaleziono proces {pid} na porcie {port}")

            # Sprawdź czy to nasz proces (python dev.py)
            try:
                proc_info = subprocess.run(['ps', '-p', pid, '-o', 'command='],
                                         capture_output=True, text=True)
                if 'dev.py' in proc_info.stdout or 'python' in proc_info.stdout:
                    print(f"🛑 Zatrzymuję poprzedni serwer deweloperski (PID: {pid})")
                    os.kill(int(pid), signal.SIGTERM)
                    time.sleep(1)

                    # Sprawdź czy się zatrzymał
                    if not check_port_available(port):
                        print(f"⚡ Wymuszam zatrzymanie procesu {pid}")
                        os.kill(int(pid), signal.SIGKILL)
                        time.sleep(1)

                    print("✅ Poprzedni serwer zatrzymany")
                    return True
                else:
                    print(f"⚠️  Port {port} zajęty przez inny proces: {proc_info.stdout.strip()}")
                    return False
            except (ProcessLookupError, ValueError):
                print("✅ Proces już nie istnieje")
                return True

    except (subprocess.CalledProcessError, FileNotFoundError):
        # lsof nie jest dostępny lub nie znaleziono procesu
        pass

    return False

def ensure_port_available(port):
    """Upewnij się że port jest dostępny"""
    if check_port_available(port):
        print(f"✅ Port {port} jest dostępny")
        return True

    print(f"⚠️  Port {port} jest zajęty, próbuję zwolnić...")

    if kill_process_on_port(port):
        # Sprawdź ponownie po zatrzymaniu
        time.sleep(1)
        if check_port_available(port):
            print(f"✅ Port {port} został zwolniony")
            return True

    print(f"❌ Nie można zwolnić portu {port}")
    return False

def get_local_ip():
    """Pobierz rzeczywisty lokalny IP (nie localhost)"""
    try:
        # Połącz się z zewnętrznym adresem aby znaleźć lokalny IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        # Fallback - spróbuj znaleźć IP w sieci lokalnej
        hostname = socket.gethostname()
        return socket.gethostbyname(hostname)

def create_ssl_cert():
    """Utwórz samopodpisany certyfikat SSL dla lokalnych testów"""
    print("🔐 Tworzenie certyfikatu SSL dla testów lokalnych...")

    # Pobierz rzeczywisty IP lokalny
    local_ip = get_local_ip()
    print(f"📍 Wykryto lokalny IP: {local_ip}")

    # Utwórz certyfikat z rzeczywistym IP (bez localhost)
    cert_cmd = f"""
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes \
-subj "/C=PL/ST=Test/L=Test/O=LocalTest/CN={local_ip}" \
-addext "subjectAltName=IP:{local_ip},IP:127.0.0.1,DNS:*.local"
"""

    result = os.system(cert_cmd)
    if result == 0:
        print("✅ Certyfikat SSL utworzony pomyślnie")
        return True, local_ip
    else:
        print("❌ Błąd tworzenia certyfikatu SSL")
        return False, local_ip

def main():
    print("🎮 Lokalny serwer HTTPS dla testowania gry Pong")
    print("=" * 50)

    # Sprawdź i zwolnij port jeśli potrzeba
    if not ensure_port_available(PORT):
        print(f"❌ Nie można zwolnić portu {PORT}. Spróbuj innego portu.")
        sys.exit(1)

    # Pobierz lokalny IP
    local_ip = get_local_ip()

    # Sprawdź czy certyfikat istnieje lub utwórz nowy
    if not os.path.exists('server.crt') or not os.path.exists('server.key'):
        success, local_ip = create_ssl_cert()
        if not success:
            print("❌ Nie można utworzyć certyfikatu SSL")
            sys.exit(1)

    # Utwórz serwer HTTPS bindowany do rzeczywistego IP
    try:
        with socketserver.TCPServer((local_ip, PORT), LocalTestHandler) as httpd:
            # Skonfiguruj SSL
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            context.load_cert_chain('server.crt', 'server.key')
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

            print(f"🚀 Serwer HTTPS uruchomiony na IP: {local_ip}:{PORT}")
            print(f"")
            print(f"📱 Otwórz w przeglądarce:")
            print(f"   https://{local_ip}:{PORT}")
            print(f"")
            print(f"📱 Na telefonie (w tej samej sieci WiFi):")
            print(f"   https://{local_ip}:{PORT}")
            print(f"")
            print("⚠️  WAŻNE dla telefonów:")
            print("   1. Akceptuj ostrzeżenie o niezaufanym certyfikacie")
            print("   2. Kliknij 'Zaawansowane' → 'Przejdź do strony'")
            print("   3. Tylko wtedy żyroskop będzie działał!")
            print(f"")
            print("🔗 QR kody będą zawierać ten adres:")
            print(f"   https://{local_ip}:{PORT}/controller.html?player=X&peerID=Y")
            print(f"")
            print("🛑 Aby zatrzymać serwer naciśnij Ctrl+C")
            print("=" * 50)

            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\n🛑 Serwer zatrzymany")
    except Exception as e:
        print(f"❌ Błąd serwera: {e}")
        print(f"💡 Sprawdź czy port {PORT} nie jest zajęty przez inny proces")

if __name__ == "__main__":
    main()
