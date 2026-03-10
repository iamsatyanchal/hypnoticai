import psutil
import math
import time
import wmi
import subprocess
subprocess.run(["powercfg", "/batteryreport"])
battery_data = psutil.sensors_battery()
print(battery_data)
w = wmi.WMI()
for bat in w.Win32_Battery():
    print(bat)
# for battery in w.Win32_Battery():
#     print("Name:", battery.Name)
#     print("Estimated charge:", battery.EstimatedChargeRemaining)
#     print("Voltage:", battery.DesignVoltage)
#     print("Status:", battery.Status)
# battery = psutil.sensors_battery()
# SOC = battery.percent / 100
# T = 298 # assumed at 25deg C
# R = 8.314
# Ea = 50000
# A = 1e6
# beta = 5
# t = time.time()
# deg = A * math.exp(-Ea/(R*T)) * math.sqrt(t) * math.exp(beta * SOC)
# print("Estimated degradation:", deg)
