import base64
import io
import logging
import os
import re
import sys
import threading
import urllib.parse
import urllib.request
from datetime import datetime

try:
    import tkinter as tk
    from PIL import Image, ImageDraw, ImageTk
    HAS_GUI = True
except Exception as exc:
    HAS_GUI = False
    logging.warning(f"Tkinter/PIL GUI unavailable: {exc}")

if sys.platform == 'win32':
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

CRM_BASE_URL = os.getenv('CRM_BASE_URL', 'https://alphazonegym.in').rstrip('/')


def _create_circular_image(image_bytes, size=(104, 104)):
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGBA').resize(size, Image.Resampling.LANCZOS)
        mask = Image.new('L', size, 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size[0] - 1, size[1] - 1), fill=255)
        output = Image.new('RGBA', size, (0, 0, 0, 0))
        output.paste(image, (0, 0), mask=mask)
        return ImageTk.PhotoImage(output)
    except Exception as exc:
        logging.warning(f"Could not render member photo: {exc}")
        return None


def _load_photo(photo_url):
    try:
        if photo_url.startswith('data:image') and ',' in photo_url:
            return _create_circular_image(base64.b64decode(photo_url.split(',', 1)[1]))
        if photo_url.startswith('https://') or photo_url.startswith('http://'):
            request = urllib.request.Request(photo_url, headers={'User-Agent': 'AlphaZoneGym-Terminal/1.0'})
            with urllib.request.urlopen(request, timeout=3) as response:
                return _create_circular_image(response.read(5 * 1024 * 1024))
    except Exception as exc:
        logging.warning(f"Could not load member photo: {exc}")
    return None


def _age_from_dob(dob):
    try:
        born = datetime.strptime(str(dob).split('T')[0], '%Y-%m-%d').date()
        today = datetime.now().date()
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    except Exception:
        return ''


def _duration_label(duration, plan):
    value = str(duration or '').strip()
    if value and value.lower() not in ('unknown', 'n/a', 'none'):
        day_match = re.fullmatch(r'(\d+)\s*days?', value, re.IGNORECASE)
        if day_match and int(day_match.group(1)) >= 28:
            months = max(1, round(int(day_match.group(1)) / 30))
            return f'{months} ' + ('MONTH' if months == 1 else 'MONTHS')
        return value
    plan_text = str(plan or '').strip()
    match = re.search(r'(\d+)\s*(\+\s*\d+)?\s*(months?|mos?)', plan_text, re.IGNORECASE)
    if match:
        months = int(match.group(1)) + (int(match.group(2).replace('+', '').strip()) if match.group(2) else 0)
        return f'{months} ' + ('MONTH' if months == 1 else 'MONTHS')
    day_match = re.search(r'(\d+)\s*days?', plan_text, re.IGNORECASE)
    if day_match and int(day_match.group(1)) >= 28:
        months = max(1, round(int(day_match.group(1)) / 30))
        return f'{months} ' + ('MONTH' if months == 1 else 'MONTHS')
    return plan_text or 'Unknown'


def show_attendance_popup(popup_data):
    """Show a landscape member check-in card above other desktop windows."""
    if not HAS_GUI:
        logging.warning('[Popup] Skipping popup because Tkinter/GUI is not available.')
        return

    def _gui_thread():
        try:
            root = tk.Tk()
            root.title('Alpha Zone Gym OS')
            root.attributes('-topmost', True)
            root.overrideredirect(True)

            status = str(popup_data.get('status', 'granted')).lower()
            name = str(popup_data.get('memberName') or 'Gym Member')
            member_code = str(popup_data.get('memberCode') or popup_data.get('memberId') or '')
            biometric_id = str(popup_data.get('biometricId') or 'N/A')
            plan = str(popup_data.get('plan') or 'Membership unavailable')
            duration = _duration_label(popup_data.get('membershipDuration'), plan)
            phone = str(popup_data.get('phone') or 'Not on file')
            age = str(popup_data.get('age') or _age_from_dob(popup_data.get('dob')) or '—')
            expiry = str(popup_data.get('expiryDate') or 'N/A').split('T')[0]
            days_left = popup_data.get('daysRemaining', '—')
            device_name = str(popup_data.get('deviceName') or 'EasyBio Biometric')

            if status == 'granted':
                status_text, status_fg, badge_bg = '✓ ACCESS GRANTED', '#1553B7', '#EAF2FF'
                message = 'Welcome back. Have a great workout!'
            elif status == 'already_inside':
                status_text, status_fg, badge_bg = '✓ ALREADY CHECKED IN', '#0369A1', '#E0F2FE'
                first = str(popup_data.get('firstCheckInTime') or '')
                message = f"First check-in today: {first[11:16] if len(first) >= 16 else 'Today'}"
            elif status in ('denied', 'expired', 'frozen'):
                status_text, status_fg, badge_bg = '⚠ ACCESS DENIED', '#991B1B', '#FEF2F2'
                message = str(popup_data.get('reason') or 'Membership needs attention.')
            else:
                status_text, status_fg, badge_bg = '⚠ UNMAPPED BIOMETRIC', '#92400E', '#FEF3C7'
                message = f'New biometric punch · ID #{biometric_id}'

            width, height = 700, 344
            screen_w = root.winfo_screenwidth()
            root.geometry(f'{width}x{height}+{max(8, screen_w - width - 24)}+28')
            root.configure(bg='#1D4ED8')

            shell = tk.Frame(root, bg='#FFFFFF')
            shell.pack(fill=tk.BOTH, expand=True, padx=2, pady=2)

            header = tk.Frame(shell, bg='#173FA8', height=42)
            header.pack(fill=tk.X)
            header.pack_propagate(False)
            tk.Label(header, text='⚡  ALPHA ZONE GYM OS', font=('Segoe UI', 11, 'bold'), fg='white', bg='#173FA8').pack(side=tk.LEFT, padx=16)
            tk.Label(header, text=device_name.upper(), font=('Segoe UI', 8, 'bold'), fg='#C7D9FF', bg='#173FA8').pack(side=tk.LEFT, padx=10)
            close = tk.Label(header, text='✕', font=('Segoe UI', 13, 'bold'), fg='white', bg='#173FA8', cursor='hand2')
            close.pack(side=tk.RIGHT, padx=14)
            close.bind('<Button-1>', lambda _event: root.destroy())

            banner = tk.Frame(shell, bg=badge_bg, height=34)
            banner.pack(fill=tk.X, padx=14, pady=(10, 6))
            banner.pack_propagate(False)
            tk.Label(banner, text=status_text, font=('Segoe UI', 10, 'bold'), fg=status_fg, bg=badge_bg).pack(side=tk.LEFT, padx=12, pady=5)
            tk.Label(banner, text=message, font=('Segoe UI', 9, 'bold'), fg=status_fg, bg=badge_bg).pack(side=tk.RIGHT, padx=12, pady=5)

            content = tk.Frame(shell, bg='#FFFFFF')
            content.pack(fill=tk.BOTH, expand=True, padx=14)
            identity = tk.Frame(content, bg='#FFFFFF', width=210)
            identity.pack(side=tk.LEFT, fill=tk.Y, padx=(2, 14), pady=2)
            identity.pack_propagate(False)

            photo = _load_photo(str(popup_data.get('avatarUrl') or ''))
            avatar = tk.Canvas(identity, width=108, height=108, bg='#FFFFFF', highlightthickness=0)
            avatar.pack(pady=(0, 4))
            if photo:
                avatar.create_image(54, 54, image=photo)
                avatar.image = photo
            else:
                initials = ''.join(part[0] for part in name.split()[:2]).upper() or 'AZ'
                avatar.create_oval(4, 4, 104, 104, fill='#EEF4FF', outline='#2563EB', width=2)
                avatar.create_text(54, 54, text=initials, font=('Segoe UI', 24, 'bold'), fill='#1E40AF')

            tk.Label(identity, text=name, font=('Segoe UI', 15, 'bold'), fg='#0F172A', bg='#FFFFFF', wraplength=204, justify=tk.CENTER).pack(fill=tk.X, pady=(0, 3))
            ref_text = f'CRM {member_code}' if status != 'unmapped' else f'BIO ID  #{biometric_id}'
            tk.Label(identity, text=ref_text, font=('Consolas', 9, 'bold'), fg='#2563EB', bg='#FFFFFF').pack()

            details = tk.Frame(content, bg='#F5F9FF', highlightbackground='#CFE0FF', highlightthickness=1)
            details.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, pady=3)

            fields = [
                ('PHONE', phone), ('AGE', f'{age} years' if str(age).isdigit() else str(age)),
                ('MEMBERSHIP', duration), ('PACKAGE', plan),
                ('EXPIRY', expiry), ('REMAINING', f'{days_left} days' if status in ('granted', 'already_inside') else '—')
            ]
            for index, (label, value) in enumerate(fields):
                row, col = divmod(index, 2)
                field = tk.Frame(details, bg='#F5F9FF')
                field.grid(row=row, column=col, sticky='nsew', padx=(12, 8), pady=(12 if row == 0 else 8, 5))
                tk.Label(field, text=label, font=('Segoe UI', 8, 'bold'), fg='#64748B', bg='#F5F9FF', anchor='w').pack(fill=tk.X)
                tk.Label(field, text=value, font=('Segoe UI', 10, 'bold'), fg='#0F172A', bg='#F5F9FF', anchor='w', wraplength=205).pack(fill=tk.X, pady=(2, 0))
            details.grid_columnconfigure(0, weight=1)
            details.grid_columnconfigure(1, weight=1)
            details.grid_rowconfigure(2, weight=1)

            footer = tk.Frame(shell, bg='#FFFFFF', height=54)
            footer.pack(fill=tk.X, padx=14, pady=(8, 10))
            footer.pack_propagate(False)
            if status == 'unmapped':
                def open_add_member():
                    if not biometric_id.isdigit():
                        logging.error('[Popup] Cannot open Add Member flow: biometric ID is not numeric.')
                        return
                    query = urllib.parse.urlencode({
                        'action': 'add',
                        'biometricId': biometric_id,
                        'deviceUserId': biometric_id,
                        'deviceId': str(popup_data.get('deviceId') or 'dev_k90_main'),
                        'source': 'unmapped-punch'
                    })
                    import webbrowser
                    webbrowser.open(f'{CRM_BASE_URL}/dashboard/members?{query}')
                    root.destroy()

                tk.Label(footer, text=f'NEW MEMBER? Add the member and keep biometric ID #{biometric_id}.', font=('Segoe UI', 8, 'bold'), fg='#475569', bg='#FFFFFF').pack(side=tk.LEFT, padx=4)
                tk.Button(footer, text='ADD MEMBER  ·  MAP THIS ID', font=('Segoe UI', 9, 'bold'), fg='white', bg='#D97706', activebackground='#B45309', activeforeground='white', bd=0, padx=16, pady=9, cursor='hand2', command=open_add_member).pack(side=tk.RIGHT, padx=4)
            elif status in ('denied', 'expired', 'frozen'):
                def open_renewal():
                    import webbrowser
                    member_id = str(popup_data.get('memberId') or '')
                    suffix = '?mode=renew&id=' + urllib.parse.quote(member_id) if member_id else ''
                    webbrowser.open(f'{CRM_BASE_URL}/dashboard/billing/create{suffix}')
                    root.destroy()

                tk.Button(footer, text='RENEW MEMBERSHIP', font=('Segoe UI', 9, 'bold'), fg='white', bg='#DC2626', activebackground='#B91C1C', activeforeground='white', bd=0, padx=18, pady=9, cursor='hand2', command=open_renewal).pack(side=tk.RIGHT, padx=4)
            else:
                tk.Label(footer, text=f"Punch time  {str(popup_data.get('currentPunchTime') or popup_data.get('timestamp') or '').replace('T', ' ')[:19]}", font=('Segoe UI', 8), fg='#64748B', bg='#FFFFFF').pack(side=tk.LEFT, padx=4)
                tk.Label(footer, text=f"VISIT  #{popup_data.get('visitCount', 1)}", font=('Segoe UI', 9, 'bold'), fg='#1D4ED8', bg='#FFFFFF').pack(side=tk.RIGHT, padx=4)

            root.after(45000 if status == 'unmapped' else (12000 if status in ('denied', 'expired', 'frozen') else 8000), lambda: root.destroy() if root.winfo_exists() else None)
            root.mainloop()
        except Exception as exc:
            logging.error(f'[Popup Thread Error]: {exc}')

    threading.Thread(target=_gui_thread, daemon=True).start()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    show_attendance_popup({
        'status': 'unmapped', 'memberName': 'Unmapped Biometric User #2321',
        'memberCode': 'ID #2321', 'biometricId': '2321', 'deviceName': 'Main Gate'
    })
