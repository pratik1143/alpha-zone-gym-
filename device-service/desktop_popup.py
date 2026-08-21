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
    from tkinter import ttk
    from PIL import Image, ImageTk, ImageDraw
    HAS_GUI = True
except Exception as e:
    HAS_GUI = False
    logging.warning(f"Tkinter/PIL GUI unavailable: {e}")

# Enable DPI Awareness on Windows for crisp high-resolution UI
if sys.platform == 'win32':
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


def _create_circular_image(image_bytes_or_pil, size=(90, 90)):
    """Converts image bytes or PIL object to a circular Tkinter ImageTk PhotoImage."""
    try:
        if isinstance(image_bytes_or_pil, bytes):
            img = Image.open(io.BytesIO(image_bytes_or_pil)).convert("RGBA")
        elif isinstance(image_bytes_or_pil, Image.Image):
            img = image_bytes_or_pil.convert("RGBA")
        else:
            return None

        img = img.resize(size, Image.Resampling.LANCZOS)
        
        # Create circular mask
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
    Triggers an Always-On-Top desktop popup overlay on Windows.
    Runs on its own thread so it does not block the biometric device listener.
    
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

    def _gui_thread():
        try:
            root = tk.Tk()
            root.title("Alpha Zone Gym - Attendance Event")

            # Always on top & borderless window
            root.attributes("-topmost", True)
            root.overrideredirect(True)

            status = popup_data.get('status', 'granted').lower()
            member_name = popup_data.get('memberName', 'Gym Member')
            member_code = popup_data.get('memberCode', popup_data.get('memberId', ''))
            plan_name = popup_data.get('plan', 'Standard Membership')
            days_left = popup_data.get('daysRemaining', popup_data.get('daysLeft', 'N/A'))
            visit_count = popup_data.get('visitCount', 1)
            avatar_url = popup_data.get('avatarUrl', '')
            biometric_id = popup_data.get('biometricId', popup_data.get('deviceId', 'N/A'))
            expired_days = popup_data.get('expiredDays', 0)

            # Colors & Styling
            if status == 'granted':
                bg_color = "#0f172a"      # Slate 900
                card_border = "#10b981"   # Emerald 500
                header_bg = "#064e3b"     # Emerald 900
                status_text = "✓ ACCESS GRANTED"
                status_color = "#34d399"  # Emerald 400
                message = "Welcome Back! 💪"
            elif status in ('denied', 'expired', 'frozen'):
                bg_color = "#0f172a"
                card_border = "#ef4444"   # Red 500
                header_bg = "#7f1d1d"     # Red 900
                status_text = "⚠ ACCESS DENIED"
                status_color = "#f87171"  # Red 400
                message = f"Membership Expired ({expired_days} days ago)" if expired_days else "Please renew your membership."
            else: # unknown
                bg_color = "#0f172a"
                card_border = "#f59e0b"   # Amber 500
                header_bg = "#78350f"     # Amber 900
                status_text = "⚠ UNKNOWN MEMBER"
                status_color = "#fbbf24"  # Amber 400
                message = f"Device Biometric ID #{biometric_id} is not mapped."

            # Dimensions and Position (Top Right corner of primary display)
            win_width = 380
            win_height = 420
            screen_w = root.winfo_screenwidth()
            screen_h = root.winfo_screenheight()
            
            x_pos = screen_w - win_width - 30
            y_pos = 40
            root.geometry(f"{win_width}x{win_height}+{x_pos}+{y_pos}")
            root.configure(bg=card_border)

            # Main Card Container with padding for border
            main_frame = tk.Frame(root, bg=bg_color, bd=0)
            main_frame.pack(fill=tk.BOTH, expand=True, padx=2, pady=2)

            # 1. Header Bar
            header_frame = tk.Frame(main_frame, bg=header_bg, height=45)
            header_frame.pack(fill=tk.X, side=tk.TOP)

            header_title = tk.Label(
                header_frame, 
                text="ALPHA ZONE GYM", 
                font=("Outfit", 11, "bold"), 
                fg="#ffffff", 
                bg=header_bg
            )
            header_title.pack(side=tk.LEFT, padx=15, pady=8)

            close_btn = tk.Label(
                header_frame, 
                text="✕", 
                font=("Outfit", 12, "bold"), 
                fg="#cbd5e1", 
                bg=header_bg,
                cursor="hand2"
            )
            close_btn.pack(side=tk.RIGHT, padx=12, pady=8)
            close_btn.bind("<Button-1>", lambda e: root.destroy())

            # 2. Status Banner
            status_label = tk.Label(
                main_frame, 
                text=status_text, 
                font=("Outfit", 13, "bold"), 
                fg=status_color, 
                bg=bg_color
            )
            status_label.pack(pady=(12, 4))

            # 3. Member Avatar Image
            photo_img = None
            if avatar_url and avatar_url.startswith("http"):
                try:
                    req = urllib.request.Request(avatar_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        img_data = resp.read()
                        photo_img = _create_circular_image(img_data, size=(90, 90))
                except Exception as e:
                    logging.warning(f"Could not load member avatar URL: {e}")

            avatar_canvas = tk.Canvas(main_frame, width=90, height=90, bg=bg_color, highlightthickness=0)
            avatar_canvas.pack(pady=6)

            if photo_img:
                avatar_canvas.create_image(45, 45, image=photo_img)
                # Keep reference so python doesn't garbage collect image
                avatar_canvas.image = photo_img
            else:
                # Default Avatar Circle with Initials
                initials = "".join([part[0] for part in member_name.split()[:2]]).upper() or "AZ"
                avatar_canvas.create_oval(2, 2, 88, 88, fill="#1e293b", outline=card_border, width=2)
                avatar_canvas.create_text(45, 45, text=initials, font=("Outfit", 20, "bold"), fill="#ffffff")

            # 4. Member Name & Code
            name_label = tk.Label(
                main_frame, 
                text=member_name, 
                font=("Outfit", 14, "bold"), 
                fg="#ffffff", 
                bg=bg_color
            )
            name_label.pack(pady=(2, 0))

            if member_code:
                code_label = tk.Label(
                    main_frame, 
                    text=f"Ref: {member_code}", 
                    font=("JetBrains Mono", 9), 
                    fg="#94a3b8", 
                    bg=bg_color
                )
                code_label.pack()

            # 5. Membership Details Grid Box
            info_box = tk.Frame(main_frame, bg="#1e293b", bd=1, relief=tk.SOLID)
            info_box.pack(fill=tk.X, padx=20, pady=10)

            # Details Rows
            if status == 'granted':
                r1 = tk.Label(info_box, text=f"Membership: {plan_name}", font=("Outfit", 9, "bold"), fg="#e2e8f0", bg="#1e293b")
                r1.pack(anchor="w", padx=12, pady=(8, 2))
                
                r2 = tk.Label(info_box, text=f"Days Remaining: {days_left} Days", font=("Outfit", 9, "bold"), fg="#34d399", bg="#1e293b")
                r2.pack(anchor="w", padx=12, pady=2)

                r3 = tk.Label(info_box, text=f"Today's Visit: #{visit_count}", font=("Outfit", 9), fg="#94a3b8", bg="#1e293b")
                r3.pack(anchor="w", padx=12, pady=(2, 8))
            elif status in ('denied', 'expired', 'frozen'):
                r1 = tk.Label(info_box, text=f"Plan: {plan_name}", font=("Outfit", 9, "bold"), fg="#e2e8f0", bg="#1e293b")
                r1.pack(anchor="w", padx=12, pady=(8, 2))
                
                r2 = tk.Label(info_box, text=message, font=("Outfit", 9, "bold"), fg="#f87171", bg="#1e293b")
                r2.pack(anchor="w", padx=12, pady=(2, 8))
            else: # unknown
                r1 = tk.Label(info_box, text=f"Device User ID: #{biometric_id}", font=("Outfit", 9, "bold"), fg="#e2e8f0", bg="#1e293b")
                r1.pack(anchor="w", padx=12, pady=(8, 2))
                
                r2 = tk.Label(info_box, text="Biometric ID needs member mapping", font=("Outfit", 9), fg="#fbbf24", bg="#1e293b")
                r2.pack(anchor="w", padx=12, pady=(2, 8))

            # 6. Action Button / Welcome Message Footer
            if status == 'granted':
                msg_label = tk.Label(
                    main_frame, 
                    text=message, 
                    font=("Outfit", 10, "bold"), 
                    fg="#34d399", 
                    bg=bg_color
                )
                msg_label.pack(pady=4)
            elif status in ('denied', 'expired', 'frozen'):
                def open_renew():
                    import webbrowser
                    url = f"http://localhost:3000/dashboard/members/{popup_data.get('memberId', '')}/renew"
                    webbrowser.open(url)
                    root.destroy()

                btn = tk.Button(
                    main_frame, 
                    text="RENEW MEMBERSHIP", 
                    font=("Outfit", 10, "bold"), 
                    fg="#ffffff", 
                    bg="#ef4444", 
                    activebackground="#dc2626",
                    activeforeground="#ffffff",
                    bd=0, 
                    padx=15, 
                    pady=6, 
                    cursor="hand2",
                    command=open_renew
                )
                btn.pack(pady=4)
            else: # unknown
                def open_mapping():
                    import webbrowser
                    webbrowser.open("http://localhost:3000/dashboard/settings/member-migration")
                    root.destroy()

                btn = tk.Button(
                    main_frame, 
                    text="MAP MEMBER", 
                    font=("Outfit", 10, "bold"), 
                    fg="#000000", 
                    bg="#f59e0b", 
                    activebackground="#d97706",
                    activeforeground="#000000",
                    bd=0, 
                    padx=15, 
                    pady=6, 
                    cursor="hand2",
                    command=open_mapping
                )
                btn.pack(pady=4)

            # Auto close after 7 seconds
            root.after(7000, lambda: root.destroy() if root.winfo_exists() else None)
            
            root.mainloop()
        except Exception as ex:
            logging.error(f"[Popup Thread Error]: {ex}")

    t = threading.Thread(target=_gui_thread, daemon=True)
    t.start()


# Standalone Test Execution
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Testing Granted Popup...")
    show_attendance_popup({
        'status': 'granted',
        'memberName': 'Rahul Singh',
        'memberCode': 'AZ-2026-0087',
        'plan': '3 Months Pro',
        'daysRemaining': 57,
        'visitCount': 87,
        'deviceId': 'ESSL Terminal 01',
        'biometricId': '1234'
    })
    time.sleep(3)
