import sys
import json
import logging
from zk import ZK

def main():
    zk = ZK('192.168.18.11', port=4370, timeout=10)
    try:
        conn = zk.connect()
        users = conn.get_users()
        device_users = []
        for u in users:
            device_users.append({
                'user_id': str(u.user_id),
                'name': (u.name or '').strip(),
                'card': str(u.card) if u.card else ''
            })
        conn.disconnect()
        print(json.dumps({'success': True, 'count': len(device_users), 'users': device_users}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e), 'users': []}))

if __name__ == '__main__':
    main()
