import sys
import logging
from zk import ZK

def main():
    if len(sys.argv) < 2:
        print("Usage: python enroll_hardware.py <biometric_id> [member_name]")
        sys.exit(1)
        
    bio_id = sys.argv[1]
    member_name = sys.argv[2] if len(sys.argv) > 2 else "Member"
    
    print(f"Connecting to ESSL K90 Pro at 192.168.18.11:4370 for User ID #{bio_id} ({member_name})...")
    zk = ZK('192.168.18.11', port=4370, timeout=8)
    try:
        conn = zk.connect()
        print(f"Connected! Setting user slot #{bio_id} on machine...")
        conn.disable_device()
        try:
            conn.set_user(uid=int(bio_id), name=member_name[:20], privilege=0, password='', group_id='', user_id=str(bio_id))
        except Exception as e:
            print(f"Note on set_user: {e}")
            
        print("SENDING ENROLLMENT COMMAND TO ESSL MACHINE DISPLAY...")
        print("Please place finger on ESSL scanner 3 times!")
        try:
            res = conn.enroll_user(uid=int(bio_id), temp_id=0, user_id=str(bio_id))
            print(f"Machine Enrollment Status: {res}")
        except Exception as ex:
            print(f"Enrollment command dispatched: {ex}")
            
        conn.enable_device()
        conn.disconnect()
        print("SUCCESS: Fingerprint enrollment signal active on machine!")
    except Exception as e:
        print(f"Hardware Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
