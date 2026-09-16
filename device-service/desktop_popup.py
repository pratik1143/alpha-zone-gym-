import sys
import os
import time
import threading
import urllib.request
import io
import logging
from datetime import datetime

try:
    import tkinter as tk
    from PIL import Image, ImageTk, ImageDraw
    HAS_GUI = True
except Exception as e:
    HAS_GUI = False
    logging.warning(f"Tkinter/PIL GUI unavailable: {e}")

# Enable High-DPI Scaling Awareness on Windows for crisp typography & graphics
if sys.platform == 'win32':
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

CRM_BASE_URL = os.getenv("CRM_BASE_URL", "https://alphazonegym.in").rstrip('/')


def _create_circular_image(image_bytes_or_pil, size=(96, 96)):
    """Converts image bytes or PIL object to a circular PhotoImage."""
    try:
        if isinstance(image_bytes_or_pil, bytes):
            img = Image.open(io.BytesIO(image_bytes_or_pil)).convert("RGBA")
        elif isinstance(image_bytes_or_pil, Image.Image):
            img = image_bytes_or_pil.convert("RGBA")
        else:
            return None

        img = img.resize(size, Image.Resampling.LANCZOS)
        
        # Create smooth anti-aliased circular mask
        mask = Image.new('L', size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size[0], size[1]), fill=255)
        
        output = Image.new('RGBA', size, (0, 0, 0, 0))
        output.paste(img, (0, 0), mask=mask)
        return ImageTk.PhotoImage(output)
    except Exception as e:
        logging.error(f"Error making circular image: {e}")
        return None


def show_attendance_popup(popup_data):
    """
    Triggers a Premium Always-On-Top Windows Desktop Overlay Popup Window.
    Appears above Chrome, Excel, Word, or any minimized desktop app.
    
    popup_data dict keys:
    - status: 'granted' | 'denied' | 'unknown' | 'expired' | 'frozen'
    - memberName: str
    - memberId / memberCode: str
    - plan: str
    - daysRemaining: int or str
    - visitCount: int or str
    - avatarUrl: str (optional)
    - deviceId / deviceName: str
    - biometricId: str
    - timestamp: str
    """
    if not HAS_GUI:
        logging.warning("[Popup] Skipping popup because Tkinter/GUI is not available.")
        return

def show_attendance_popup(popup_data):
    """
    Triggers a Premium Always-On-Top Windows Desktop Overlay Popup Window.
    Appears above Chrome, Excel, Word, or any minimized desktop app.
    White & Royal Blue Theme displaying complete member information.
    """
    if not HAS_GUI:
        logging.warning("[Popup] Skipping popup because Tkinter/GUI is not available.")
        return

    def _gui_thread():
        try:
            root = tk.Tk()
            root.title("Alpha Zone Gym OS")

            # Always on top & borderless window
            root.attributes("-topmost", True)
            root.overrideredirect(True)

            status = str(popup_data.get('status', 'granted')).lower()
            member_name = popup_data.get('memberName', 'Gym Member')
            member_code = popup_data.get('memberCode', popup_data.get('memberId', ''))
            plan_name = popup_data.get('plan', 'Standard Membership')
            start_date = popup_data.get('startDate', 'N/A')
            expiry_date = popup_data.get('expiryDate', 'N/A')
            dob_str = popup_data.get('dob', 'N/A')
            days_left = popup_data.get('daysRemaining', popup_data.get('daysLeft', 'N/A'))
            visit_count = popup_data.get('visitCount', 1)
            avatar_url = popup_data.get('avatarUrl', '')
            biometric_id = popup_data.get('biometricId', popup_data.get('deviceId', 'N/A'))
            expired_days = popup_data.get('expiredDays', 0)

            # Check Birthday
            is_bday = False
            if dob_str and dob_str != 'N/A':
                try:
                    today = datetime.now()
                    d = datetime.strptime(str(dob_str).split('T')[0], "%Y-%m-%d")
                    if d.month == today.month and d.day == today.day:
                        is_bday = True
                except Exception:
                    pass

            # White & Blue Theme Palette
            bg_color = "#ffffff"       # Pure White background
            card_border = "#2563eb"    # Royal Blue Outer Border
            header_bg = "#1e40af"      # Deep Royal Blue Header
            
            if status == 'granted':
                status_text = "✓ ACCESS GRANTED"
                status_fg = "#1e40af"     # Deep Blue
                badge_bg = "#dbeafe"      # Light Blue
                message = "Welcome Back! 💪" if not is_bday else "🎉 HAPPY BIRTHDAY! 🎂"
            elif status == 'already_inside':
                first_checkin = popup_data.get('firstCheckInTime', popup_data.get('checkIn', ''))
                status_text = "✓ ALREADY INSIDE"
                status_fg = "#0369a1"
                badge_bg = "#e0f2fe"
                message = f"First Check-in Today: {first_checkin[11:16] if len(first_checkin)>=16 else 'Today'}"
            elif status in ('denied', 'expired', 'frozen'):
                status_text = "⚠ ACCESS DENIED"
                status_fg = "#991b1b"
                badge_bg = "#fee2e2"
                message = f"Expired {expired_days} days ago" if expired_days else "Membership Expired"
            else: # unmapped
                status_text = "⚠ UNMAPPED MEMBER"
                status_fg = "#92400e"
                badge_bg = "#fef3c7"
                message = f"Biometric ID #{biometric_id} needs CRM mapping"

            # Window Dimensions & Top-Right Screen Position
            win_width = 410
            win_height = 510
            screen_w = root.winfo_screenwidth()
            
            x_pos = screen_w - win_width - 25
            y_pos = 35
            root.geometry(f"{win_width}x{win_height}+{x_pos}+{y_pos}")
            root.configure(bg=card_border)

            # Outer Border Wrapper
            main_frame = tk.Frame(root, bg=bg_color, bd=0)
            main_frame.pack(fill=tk.BOTH, expand=True, padx=2, pady=2)

            # 1. Header Bar
            header_frame = tk.Frame(main_frame, bg=header_bg, height=44)
            header_frame.pack(fill=tk.X, side=tk.TOP)
            header_frame.pack_propagate(False)

            header_title = tk.Label(
                header_frame, 
                text="⚡ ALPHA ZONE GYM OS", 
                font=("Segoe UI", 10, "bold"), 
                fg="#ffffff", 
                bg=header_bg
            )
            header_title.pack(side=tk.LEFT, padx=14)

            close_btn = tk.Label(
                header_frame, 
                text="✕", 
                font=("Segoe UI", 12, "bold"), 
                fg="#bfdbfe", 
                bg=header_bg,
                cursor="hand2"
            )
            close_btn.pack(side=tk.RIGHT, padx=14)
            close_btn.bind("<Button-1>", lambda e: root.destroy())

            # 2. Status Badge Banner
            status_badge_frame = tk.Frame(main_frame, bg=badge_bg, bd=0)
            status_badge_frame.pack(fill=tk.X, padx=14, pady=(12, 4))

            status_label = tk.Label(
                status_badge_frame, 
                text=status_text, 
                font=("Segoe UI", 10, "bold"), 
                fg=status_fg, 
                bg=badge_bg,
                pady=5
            )
            status_label.pack()

            # 3. Circular Member Avatar
            photo_img = None
            if avatar_url and avatar_url.startswith("http"):
                try:
                    req = urllib.request.Request(avatar_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        img_data = resp.read()
                        photo_img = _create_circular_image(img_data, size=(86, 86))
                except Exception as e:
                    logging.warning(f"Could not download member avatar: {e}")

            avatar_canvas = tk.Canvas(main_frame, width=86, height=86, bg=bg_color, highlightthickness=0)
            avatar_canvas.pack(pady=4)

            if photo_img:
                avatar_canvas.create_image(43, 43, image=photo_img)
                avatar_canvas.image = photo_img
            else:
                clean_name = member_name.replace("Unmapped Biometric User #", "ID ")
                parts = clean_name.split()
                initials = (parts[0][0] + (parts[1][0] if len(parts) > 1 else '')).upper() if parts else "AZ"
                avatar_canvas.create_oval(2, 2, 84, 84, fill="#eff6ff", outline="#2563eb", width=2)
                avatar_canvas.create_text(43, 43, text=initials[:2], font=("Segoe UI", 18, "bold"), fill="#1e40af")

            # 4. Member Name & Reference Code
            name_label = tk.Label(
                main_frame, 
                text=member_name, 
                font=("Segoe UI", 13, "bold"), 
                fg="#0f172a", 
                bg=bg_color
            )
            name_label.pack(pady=(1, 0))

            sub_info = f"Ref: {member_code}" if member_code else ""
            if biometric_id and biometric_id != 'N/A':
                sub_info += f"  •  Bio ID: #{biometric_id}"

            code_label = tk.Label(
                main_frame, 
                text=sub_info, 
                font=("Consolas", 9, "bold"), 
                fg="#2563eb", 
                bg=bg_color
            )
            code_label.pack()

            # 5. Complete 2-Column Details Info Box
            info_box = tk.Frame(main_frame, bg="#f0f9ff", bd=1, highlightbackground="#bfdbfe", highlightthickness=1)
            info_box.pack(fill=tk.X, padx=14, pady=8)

            # Row 1: Plan / Package
            r1_frame = tk.Frame(info_box, bg="#f0f9ff")
            r1_frame.pack(fill=tk.X, padx=10, pady=(6, 2))
            tk.Label(r1_frame, text="PACKAGE:", font=("Segoe UI", 8, "bold"), fg="#64748b", bg="#f0f9ff").pack(side=tk.LEFT)
            tk.Label(r1_frame, text=plan_name, font=("Segoe UI", 9, "bold"), fg="#0f172a", bg="#f0f9ff").pack(side=tk.LEFT, padx=6)

            # Row 2: Start Date & Expiry Date
            r2_frame = tk.Frame(info_box, bg="#f0f9ff")
            r2_frame.pack(fill=tk.X, padx=10, pady=2)
            tk.Label(r2_frame, text=f"Start: {str(start_date).split('T')[0]}", font=("Segoe UI", 8, "bold"), fg="#334155", bg="#f0f9ff").pack(side=tk.LEFT)
            tk.Label(r2_frame, text=f"Expiry: {str(expiry_date).split('T')[0]}", font=("Segoe UI", 8, "bold"), fg="#dc2626" if status in ('expired','denied') else "#166534", bg="#f0f9ff").pack(side=tk.RIGHT)

            # Row 3: Birthday & Days Left / Visit Count
            r3_frame = tk.Frame(info_box, bg="#f0f9ff")
            r3_frame.pack(fill=tk.X, padx=10, pady=(2, 6))
            
            bday_display = f"DOB: {str(dob_str).split('T')[0]}" if dob_str and dob_str != 'N/A' else "DOB: N/A"
            if is_bday:
                bday_display += " 🎂"
            tk.Label(r3_frame, text=bday_display, font=("Segoe UI", 8, "bold"), fg="#9333ea" if is_bday else "#475569", bg="#f0f9ff").pack(side=tk.LEFT)

            if status in ('granted', 'already_inside'):
                tk.Label(r3_frame, text=f"{days_left} Days Left (Visit #{visit_count})", font=("Segoe UI", 8, "bold"), fg="#2563eb", bg="#f0f9ff").pack(side=tk.RIGHT)
            elif status in ('denied', 'expired'):
                tk.Label(r3_frame, text=f"Expired ({expired_days}d ago)", font=("Segoe UI", 8, "bold"), fg="#dc2626", bg="#f0f9ff").pack(side=tk.RIGHT)

            # 6. Action Button Footer
            if status in ('granted', 'already_inside'):
                msg_label = tk.Label(
                    main_frame, 
                    text=message, 
                    font=("Segoe UI", 10, "bold"), 
                    fg="#1e40af", 
                    bg=bg_color
                )
                msg_label.pack(pady=4)
            elif status in ('denied', 'expired', 'frozen'):
                def open_renew():
                    import webbrowser
                    member_id = popup_data.get('memberId', '')
                    url = f"{CRM_BASE_URL}/dashboard/billing/create?mode=renew&id={member_id}" if member_id else f"{CRM_BASE_URL}/dashboard/billing/create"
                    webbrowser.open(url)
                    root.destroy()

                btn = tk.Button(
                    main_frame, 
                    text="⚡ RENEW MEMBERSHIP", 
                    font=("Segoe UI", 9, "bold"), 
                    fg="#ffffff", 
                    bg="#dc2626", 
                    activebackground="#b91c1c",
                    activeforeground="#ffffff",
                    bd=0, 
                    padx=16, 
                    pady=6, 
                    cursor="hand2",
                    command=open_renew
                )
                btn.pack(pady=4)
            else: # unmapped
                btn_box = tk.Frame(main_frame, bg=bg_color)
                btn_box.pack(pady=4)

                def trigger_automap():
                    import webbrowser
                    try:
                        req = urllib.request.Request("http://localhost:5000/api/devices/auto-map-biometrics", method="POST")
                        urllib.request.urlopen(req, timeout=3)
                    except Exception:
                        pass
                    webbrowser.open(f"{CRM_BASE_URL}/dashboard/settings/member-migration")
                    root.destroy()

                def open_mapping():
                    import webbrowser
                    webbrowser.open(f"{CRM_BASE_URL}/dashboard/settings/member-migration")
                    root.destroy()

                btn_auto = tk.Button(
                    btn_box, 
                    text="⚡ AUTO MAP", 
                    font=("Segoe UI", 9, "bold"), 
                    fg="#ffffff", 
                    bg="#2563eb", 
                    activebackground="#1d4ed8",
                    activeforeground="#ffffff",
                    bd=0, 
                    padx=12, 
                    pady=6, 
                    cursor="hand2",
                    command=trigger_automap
                )
                btn_auto.pack(side=tk.LEFT, padx=6)

                btn_map = tk.Button(
                    btn_box, 
                    text="⚡ MAP MEMBER", 
                    font=("Segoe UI", 9, "bold"), 
                    fg="#ffffff", 
                    bg="#d97706", 
                    activebackground="#b45309",
                    activeforeground="#ffffff",
                    bd=0, 
                    padx=12, 
                    pady=6, 
                    cursor="hand2",
                    command=open_mapping
                )
                btn_map.pack(side=tk.LEFT, padx=6)

            # Auto close after 7 seconds
            root.after(7000, lambda: root.destroy() if root.winfo_exists() else None)
            
            root.mainloop()
        except Exception as ex:
            logging.error(f"[Popup Thread Error]: {ex}")

    t = threading.Thread(target=_gui_thread, daemon=True)
    t.start()


# Standalone Test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Testing Popup...")
    show_attendance_popup({
        'status': 'unknown',
        'memberName': 'Unmapped Biometric User #1145',
        'memberCode': 'ID #1145',
        'plan': 'Unmapped Biometric ID',
        'deviceId': 'Main Gate',
        'biometricId': '1145'
    })
    time.sleep(3)
