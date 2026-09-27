"""Perform and verify a fingerprint enrollment using the configured ESSL/pyzk device.

This command deliberately exits non-zero unless the device user and requested
finger template can both be read back after the enrollment operation.
"""
import json
import os
import sys
import traceback

from zk import ZK


def emit(status, **details):
    print(json.dumps({"status": status, **details}), flush=True)


def main():
    if len(sys.argv) < 3:
        emit("REQUEST_FAILED", error="Usage: enroll_hardware.py <numeric_device_user_id> <name> [finger_index] [verify_only]")
        return 2

    raw_id, name = sys.argv[1], sys.argv[2]
    try:
        user_id = int(raw_id)
        finger_index = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    except ValueError:
        emit("REQUEST_FAILED", error="Device employee ID and finger index must be integers.")
        return 2

    if not 1 <= user_id <= 65535 or not 0 <= finger_index <= 9:
        emit("REQUEST_FAILED", error="Device employee ID must be 1..65535 and finger index 0..9.")
        return 2

    ip = os.getenv("EASYBIO_DEVICE_IP") or os.getenv("DEVICE_IP") or "192.168.18.11"
    port = int(os.getenv("EASYBIO_DEVICE_PORT") or os.getenv("DEVICE_PORT") or "4370")
    zk = ZK(ip, port=port, timeout=15)
    conn = None
    try:
        emit("CONNECTING", deviceIp=ip, devicePort=port, biometricId=str(user_id))
        conn = zk.connect()
        users = conn.get_users()
        device_user = next((u for u in users if str(u.user_id).strip() == str(user_id)), None)
        if not device_user:
            emit("USER_CREATING", biometricId=str(user_id))
            conn.set_user(uid=user_id, name=name[:24].strip(), privilege=0,
                          password="", group_id="", user_id=str(user_id))
            users = conn.get_users()
            device_user = next((u for u in users if str(u.user_id).strip() == str(user_id)), None)
        if not device_user:
            emit("DEVICE_REJECTED", error=f"Device did not return user {user_id} after creation.")
            return 3
        if (device_user.name or "").strip() != name[:24].strip():
            emit("DEVICE_REJECTED", error=f"Device user {user_id} exists with a different name; refusing to enroll against the wrong mapping.", deviceName=device_user.name or "")
            return 3
        emit("USER_CREATED", biometricId=str(user_id), deviceName=device_user.name or "")

        templates = conn.get_templates()
        has_template = any(int(t.uid) == int(device_user.uid) and int(t.fid) == finger_index for t in templates)
        fingerprint_count = sum(1 for t in templates if int(t.uid) == int(device_user.uid))
        verify_only = len(sys.argv) > 4 and sys.argv[4] == "verify-only"
        if verify_only:
            if not has_template:
                emit("TEMPLATE_SAVE_FAILED", error=f"No fingerprint template found for device user {user_id}, finger {finger_index}.")
                return 4
            emit("FINGERPRINT_SAVED", biometricId=str(user_id), deviceUid=int(device_user.uid), fingerIndex=finger_index, fingerprintsCount=fingerprint_count, verified=True)
            return 0
        if has_template:
            emit("FINGERPRINT_SAVED", biometricId=str(user_id), deviceUid=int(device_user.uid), fingerIndex=finger_index, fingerprintsCount=fingerprint_count, verified=True, alreadyEnrolled=True)
            return 0

        emit("ENROLLMENT_REQUESTED", biometricId=str(user_id), fingerIndex=finger_index)
        emit("DEVICE_READY", message="Follow the biometric terminal prompts and complete all required scans.")
        conn.enroll_user(uid=int(device_user.uid), temp_id=finger_index, user_id=str(user_id))

        emit("VERIFYING", biometricId=str(user_id), fingerIndex=finger_index)
        users_after = conn.get_users()
        readback_user = next((u for u in users_after if str(u.user_id).strip() == str(user_id)), None)
        templates_after = conn.get_templates()
        saved = readback_user is not None and any(
            int(t.uid) == int(readback_user.uid) and int(t.fid) == finger_index
            for t in templates_after
        )
        if not saved:
            emit("TEMPLATE_SAVE_FAILED", error=f"Device did not return fingerprint template for user {user_id}, finger {finger_index} after enrollment.")
            return 4
        fingerprint_count = sum(1 for t in templates_after if int(t.uid) == int(readback_user.uid))
        emit("FINGERPRINT_SAVED", biometricId=str(user_id), deviceUid=int(readback_user.uid), fingerIndex=finger_index, fingerprintsCount=fingerprint_count, verified=True)
        return 0
    except Exception as exc:
        emit("DEVICE_REJECTED", error=str(exc), errorType=type(exc).__name__)
        return 5
    finally:
        if conn is not None:
            try:
                conn.disconnect()
            except Exception:
                pass


if __name__ == "__main__":
    sys.exit(main())
