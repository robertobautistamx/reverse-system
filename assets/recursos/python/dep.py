import sys

import mysql
import serial
import serial.tools.list_ports
import csv
import os
import time
import threading
import requests
from datetime import datetime
from collections import deque
from normalizacion_datos import min_max, RANGOS, DB

from PyQt5 import QtWidgets
from PyQt5.QtCore import QTimer
from interfaz import Ui_MainWindow

# --------------------------------- #
ARCHIVO_CSV='monitoreo_muelle.csv'
API_URL='http://localhost:'
# --------------------------------- #

# filtros
class MedianFilter:
    def __init__(self, ventana=5):
        self.buffer = deque(maxlen=ventana)

    def update(self, x):
        self.buffer.append(x)
        ordenado = sorted(self.buffer)
        return ordenado[len(ordenado) // 2]

class MovingAverage:
    def __init__(self, ventana=8):
        self.buffer = deque(maxlen=ventana)

    def update(self, x):
        self.buffer.append(x)
        return sum(self.buffer) / len(self.buffer)
# --------------------------------- #

#telemetry
class TelemetryProcessor:
    V_PRECAUCION_CMS=5.0
    V_PELIGRO_CMS=20.0

    def __init__(self):
        self.filtro_distancia = MedianFilter(5)
        self.filtro_velocidad = MovingAverage(8)
        self._d_anterior = None
        self._t_anterior = None

    def _semaforo(self, v):
        if v >= self.V_PELIGRO_CMS:
            return "ROJO"
        if v >= self.V_PRECAUCION_CMS:
            return "AMARILLO"
        return "VERDE"

    def _alarma(self, v):
        return "ON" if v >= self.V_PRECAUCION_CMS else "OFF"

    def procesar(self, d, t, luz):
        if d <= 0:
            return None

        d_filtrada = self.filtro_distancia.update(d)
        velocidad = 0.0

        if self._d_anterior is not None and self._t_anterior is not None:
            dt=(t-self._t_anterior)/1000.0
            if dt>0:
                v_inst=(self._d_anterior-d_filtrada)/dt
                velocidad=self.filtro_velocidad.update(v_inst)

        self._d_anterior=d_filtrada
        self._t_anterior=t

        return {
            "distancia": d_filtrada,
            "velocidad": velocidad,
            "luz": luz,
            "semaforo": self._semaforo(velocidad),
            "alarma": self._alarma(velocidad),
            "t": t
        }
# --------------------------------- #

#app
class MiApp(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.ui = Ui_MainWindow()
        self.ui.setupUi(self)

        self.serial_port=None
        self.procesador=TelemetryProcessor()

        # CSV abierto una sola vez
        self.csv_file= open(ARCHIVO_CSV, 'a', newline='')
        self.csv_writer=csv.writer(self.csv_file)

        if os.stat(ARCHIVO_CSV).st_size==0:
            self.csv_writer.writerow([
                "timestamp_pc", "t_arduino", "distancia_cm",
                "velocidad_cms", "luz", "semaforo", "alarma", "led_activo"
            ])

        #botones
        self.ui.btn_actualizar.clicked.connect(self.listar_puertos)
        self.ui.btn_enviar.clicked.connect(self.enviar_datos)

        self.ui.btn_auto.clicked.connect(lambda: self.enviar_comando('R'))  #   R= modo automatico completo (restaura buzzer y faro LDR)
        self.ui.btn_abrir.clicked.connect(lambda: self.enviar_comando('A'))#   A=apaga el buzzer
        self.ui.btn_cerrar.clicked.connect(lambda: self.enviar_comando('C')) #   C=faro en modo manual (encendido fijo, ignora LDR)

        # timer de lectura
        self.timer = QTimer()
        self.timer.timeout.connect(self.leer_datos)

        self.ui.txt_monitor.setReadOnly(True)
        self.listar_puertos()
# --------------------------------- #

    #perto serial
    def listar_puertos(self):
        self.ui.cb_COM.clear()
        for puerto in serial.tools.list_ports.comports():
            self.ui.cb_COM.addItem(puerto.device)

    def conectar(self):
        puerto = self.ui.cb_COM.currentText()
        try:
            self.serial_port = serial.Serial(puerto, 115200, timeout=1)
            time.sleep(2)
            self.serial_port.reset_input_buffer()
            self.ui.txt_monitor.append(f"Conectado a {puerto}")
            self.timer.start(100)
        except Exception as e:
            self.ui.txt_monitor.append("Error: " + str(e))

    # Envio de datos / comandos
    def enviar_datos(self):
        if not self.serial_port:
            self.conectar()
        if self.serial_port and self.serial_port.is_open:
            dato = self.ui.lineEdit.text()
            self.serial_port.write((dato + "\n").encode())
            self.ui.txt_monitor.append("Enviado: " + dato)

    def enviar_comando(self, comando):
        if not self.serial_port:
            self.conectar()
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.write(comando.encode())
            descripciones = {
                'R': "Modo AUTOMATICO restaurado (buzzer ON, faro por LDR)",
                'A': "Buzzer APAGADO",
                'C': "Faro MANUAL encendido (ignora LDR)",
            }
            self.ui.txt_monitor.append(f"Comando [{comando}]: {descripciones.get(comando, '')}")

    def leer_datos(self):
        if not (self.serial_port and self.serial_port.is_open):
            return

        while self.serial_port.in_waiting:
            try:
                linea = self.serial_port.readline().decode(errors="ignore").strip()

                partes = linea.split(",")
                if len(partes) != 4:
                    continue

                d=float(partes[0])
                t=int(partes[1])
                luz=int(partes[2])
                led_raw=int(partes[3])   # 0=VERDE 1=AMARILLO 2=ROJO -1=sin objeto

                LED_LABEL = {
                    0:  "VERDE", 1:  "AMARILLO", 2:  "ROJO", -1: "SIN OBJETO",
                }
                led_texto = LED_LABEL.get(led_raw, "?")
                datos = self.procesador.procesar(d, t, luz)
                if not datos:
                    continue

                ahora = datetime.now().strftime("%H:%M:%S")
                texto = (
                    f"[{ahora}] "
                    f"D:{datos['distancia']:.2f}cm | "
                    f"V:{datos['velocidad']:.2f}cm/s | "
                    f"L:{datos['luz']} | "
                    f"{datos['semaforo']} | {datos['alarma']} | "
                    f"LED: {led_texto}"
                )

                #evitar saturacion de ui
                if self.ui.txt_monitor.document().blockCount() > 200:
                    self.ui.txt_monitor.clear()
                self.ui.txt_monitor.append(texto)

                # guardar CSV
                self.csv_writer.writerow([
                    datetime.now().isoformat(), datos["t"],
                    f"{datos['distancia']:.2f}", f"{datos['velocidad']:.2f}",
                    datos["luz"], datos["semaforo"], datos["alarma"], led_raw
                ])
                self.csv_file.flush()

                #API + normalizaciOn en segundo plano
                payload = {
                    "distancia_cm":round(datos["distancia"], 2),
                    "velocidad_cms":round(datos["velocidad"], 2),
                    "luz":datos["luz"],
                    "semaforo":datos["semaforo"],
                    "alarma":datos["alarma"],
                    "led_activo":led_raw
                }
                threading.Thread(
                    target=self._enviar_api,
                    args=(payload,),
                    daemon=True
                ).start()

            except Exception as e:
                self.ui.txt_monitor.append("Error lectura: " + str(e))

    def _enviar_api(self, payload):
        """
        1. Envia el dato crudo a la API -> se guarda en tabla 'data'
        2. Usa el id devuelto para guardar en 'data_normalizada'
        Importa min_max y RANGOS de normalizacion_datos.py
        """
        #SE ENVIA a node.js
        nuevo_id=None
        try:
            r = requests.post(API_URL, json=payload, timeout=2)
            if r.status_code == 201:
                nuevo_id = r.json().get("id")
            else:
                print(f"[API] Error {r.status_code}: {r.text}")
        except requests.exceptions.ConnectionError:
            print("[API] Sin conexión al servidor Node.js")
            return
        except Exception as e:
            print(f"[API] Error: {e}")
            return

        #normalizar y guardar en MySQL directamente
        if not nuevo_id:
            return
        try:
            d_norm = min_max(payload["distancia_cm"], *RANGOS["distancia_cm"])
            v_norm = min_max(payload["velocidad_cms"], *RANGOS["velocidad_cms"])
            l_norm = min_max(payload["luz"], *RANGOS["luz"])

            conn = mysql.connector.connect(**DB)
            cur = conn.cursor()
            cur.execute("""
                        INSERT INTO data_normalizada
                            (id, dist_norm, vel_norm, luz_norm, semaforo, alarma, led_activo, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        ON DUPLICATE KEY UPDATE
                            dist_norm = VALUES(dist_norm),
                            vel_norm  = VALUES(vel_norm),
                            luz_norm  = VALUES(luz_norm)
                    """, (
                nuevo_id, d_norm, v_norm, l_norm,
                payload["semaforo"], payload["alarma"], payload["led_activo"]
            ))
            conn.commit()
            cur.close()
            conn.close()

        except Exception as e:
            print(f"[Norm] Error id={nuevo_id}: {e}")

#-------------------------------
if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    ventana = MiApp()
    ventana.show()
    sys.exit(app.exec_())