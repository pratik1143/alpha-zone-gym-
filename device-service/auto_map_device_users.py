import sys
import json
import os
import time
import logging
from zk import ZK

CACHE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), 'device_cache.json'))

def main():
    device_ip = os.getenv('EASYBIO_DEVICE_IP') or os.getenv('DEVICE_IP') or '192.168.18.11'
    device_port = int(os.getenv('EASYBIO_DEVICE_PORT') or os.getenv('DEVICE_PORT') or '4370')
    zk = ZK(device_ip, port=device_port, timeout=5)
    device_users = []
    source = 'device'
    success = False
    error_msg = ""

    # Attempt 1: Connect directly to ESSL K90 Pro machine
    try:
        conn = zk.connect()
        users = conn.get_users()
        try:
            templates = conn.get_templates()
        except Exception as template_error:
            templates = []
            logging.warning('Could not read fingerprint template counts: %s', template_error)

        for u in users:
            fingerprint_count = sum(
                1 for template in templates
                if str(getattr(template, 'uid', '')) == str(u.uid)
                or str(getattr(template, 'user_id', '')) == str(u.user_id)
            )
            device_users.append({
                'user_id': str(u.user_id),
                'name': (u.name or '').strip(),
                'card': str(u.card) if u.card else '',
                'fingerprint_count': fingerprint_count
            })
        conn.disconnect()
        success = True

        # Save cache for instant offline reads
        try:
            with open(CACHE_FILE, 'w') as f:
                json.dump(device_users, f)
        except Exception:
            pass

    except Exception as e:
        error_msg = str(e)
        # Attempt 2: Read from cached device_users file if socket is busy
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r') as f:
                    device_users = json.load(f)
                    if len(device_users) > 0:
                        success = True
                        error_msg = "Read from device cache"
                        source = 'cache'
            except Exception:
                pass

    print(json.dumps({'success': success, 'source': source, 'count': len(device_users), 'users': device_users, 'error': error_msg}))

if __name__ == '__main__':
    main()
