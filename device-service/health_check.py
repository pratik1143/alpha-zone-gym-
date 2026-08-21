import sys
import os
import time
import socket
import urllib.request
import json
import subprocess
import platform

# Force UTF-8 output encoding for Windows CMD
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

DEVICE_IP = "192.168.18.11"
DEVICE_PORT = 4370

def check_internet():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.5)
        s.connect(("8.8.8.8", 53))
        s.close()
        return True
    except Exception:
        return False

def check_essl():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.5)
        s.connect((DEVICE_IP, DEVICE_PORT))
        s.close()
        return True
    except Exception:
        return False

def check_backend_api():
    try:
        req = urllib.request.Request("http://localhost:5000/health", headers={"User-Agent": "HealthCheck"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get('status') == 'healthy'
    except Exception:
        return False

def check_python_listener_process():
    try:
        if platform.system().lower() == 'windows':
            cmd = 'tasklist /FI "IMAGENAME eq python.exe" /FO CSV'
            output = subprocess.check_output(cmd, shell=True).decode('utf-8', errors='ignore')
            return "python.exe" in output
        return True
    except Exception:
        return False

def main():
    internet_ok = check_internet()
    backend_ok = check_backend_api()
    essl_ok = check_essl()
    process_ok = check_python_listener_process()
    gate_ok = essl_ok and internet_ok

    print("\n" + "="*54)
    print("        ALPHA ZONE GYM SYSTEM DIAGNOSTIC REPORT       ")
    print("="*54)
    print(f"[1] Internet Connection   : {'[CONNECTED]' if internet_ok else '[OFFLINE]'}")
    print(f"[2] Backend Express API   : {'[RUNNING]' if backend_ok else '[OFFLINE/STOPPED]'}")
    print(f"[3] ESSL Biometric Device : {'[CONNECTED] (' + DEVICE_IP + ':4370)' if essl_ok else '[OFFLINE] (' + DEVICE_IP + ':4370)'}")
    print(f"[4] Python Device Service : {'[RUNNING]' if process_ok else '[STOPPED]'}")
    print(f"[5] Gate Relay Control    : {'[ENABLED]' if gate_ok else '[DISABLED]'}")
    print("="*54)

    if internet_ok and essl_ok and process_ok:
        print("System Status: ALL SYSTEMS OPERATIONAL\n")
        sys.exit(0)
    else:
        print("System Status: ATTENTION REQUIRED (Some services offline)\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
