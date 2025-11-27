#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Render auto-redeploy watchdog
Phát hiện DDoS hoặc server sập, tự gọi API manual deploy lại.
"""

import requests, time, sys

SERVICE_ID = "srv-d3r5q36mcj7s73blptsg"
API_KEY = "rnd_c2zxgtRveEF704k8bJG0WpBnyAaf"
CHECK_URL = "https://api-l7k1.onrender.com/data"  # URL để kiểm tra
CHECK_INTERVAL = 60       # kiểm tra mỗi 60 giây
FAIL_THRESHOLD = 3         # số lần thất bại liên tiếp mới redeploy

def check_alive():
    try:
        r = requests.get(CHECK_URL, timeout=10)
        return r.status_code == 200
    except Exception:
        return False

def redeploy():
    print("[!] Gọi Render API để redeploy...")
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/deploys"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    try:
        r = requests.post(url, headers=headers, timeout=15)
        if 200 <= r.status_code < 300:
            print("[+] Redeploy thành công, Render sẽ khởi động lại app.")
        else:
            print(f"[x] Redeploy thất bại: {r.status_code} {r.text}")
    except Exception as e:
        print("[x] Lỗi khi redeploy:", e)

def main():
    fail_count = 0
    print("[*] Watchdog Render đang chạy... kiểm tra mỗi", CHECK_INTERVAL, "giây.")
    while True:
        alive = check_alive()
        if alive:
            fail_count = 0
            print("[OK] Server hoạt động bình thường.")
        else:
            fail_count += 1
            print(f"[!] Lỗi {fail_count}/{FAIL_THRESHOLD} — server không phản hồi.")
            if fail_count >= FAIL_THRESHOLD:
                redeploy()
                fail_count = 0
        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nDừng watchdog.")
        sys.exit(0)