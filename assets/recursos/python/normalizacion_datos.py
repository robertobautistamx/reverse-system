"""
Aplica normalización Min-Max a los datos crudos del Arduino
y guarda los resultados en una nueva tabla: data_normalizada
"""
import mysql.connector
import math

# --------------------------------- #
DB=dict(
    host="",
    port=0000,
    user="admin",
    password="pasword",
    database="database"
)
# --------------------------------- #
# Rangos fisicos reales de cada sensor
RANGOS={
    "distancia_cm":  (0,   400),
    "velocidad_cms": (-50,  50),
    "luz":           (0,  1023),
}
# --------------------------------- #
def min_max(valor, vmin, vmax):
    """Normaliza un valor al rango [0, 1]. Clampea si esta fuera de rango."""
    if vmax==vmin:
        return 0.0
    norm=(valor-vmin)/(vmax - vmin)
    return round(max(0.0, min(1.0, norm)), 4)
# --------------------------------- #
def main():
    conn=mysql.connector.connect(**DB)
    cur=conn.cursor(dictionary=True)

    #tabla normalizada
    cur.execute("""
        CREATE TABLE IF NOT EXISTS data_normalizada (
            id               INT PRIMARY KEY,
            dist_norm        DECIMAL(6,4) COMMENT 'distancia_cm normalizada [0-1]',
            vel_norm         DECIMAL(6,4) COMMENT 'velocidad_cms normalizada [0-1]',
            luz_norm         DECIMAL(6,4) COMMENT 'luz normalizada [0-1]',
            semaforo         VARCHAR(10),
            alarma           VARCHAR(3),
            led_activo       TINYINT,
            created_at       TIMESTAMP,
            FOREIGN KEY (id) REFERENCES data(id)
        )
    """)
    conn.commit()
# --------------------------------- #
    # Leer datos crudos
    cur.execute("SELECT * FROM data ORDER BY id ASC")
    filas=cur.fetchall()

    if not filas:
        print("No hay datos en la tabla 'data' todavia.")
        return

    print(f"Procesando {len(filas)} registros...")

    insertados=0
    omitidos=0

    for fila in filas:
        d_norm = min_max(float(fila["distancia_cm"]),*RANGOS["distancia_cm"])
        v_norm = min_max(float(fila["velocidad_cms"]),*RANGOS["velocidad_cms"])
        l_norm = min_max(float(fila["luz"]),*RANGOS["luz"])

        try:
            cur.execute("""
                INSERT INTO data_normalizada
                    (id, dist_norm, vel_norm, luz_norm, semaforo, alarma, led_activo, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    dist_norm  = VALUES(dist_norm),
                    vel_norm   = VALUES(vel_norm),
                    luz_norm   = VALUES(luz_norm)
            """, (
                fila["id"],
                d_norm, v_norm, l_norm,
                fila["semaforo"],
                fila["alarma"],
                fila["led_activo"],
                fila["created_at"]
            ))
            insertados += 1
        except Exception as e:
            print(f"  Error en id={fila['id']}: {e}")
            omitidos += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"Listo: {insertados} registros normalizados, {omitidos} omitidos.")
    print("Tabla: data_normalizada")
    print("\nEjemplo de interpretacion:")
    print("  dist_norm = 0.0  --> objeto pegado al sensor (0 cm)")
    print("  dist_norm = 1.0  -->  objeto muy lejos o sin detección (400 cm)")
    print("  luz_norm  = 0.0  -->  oscuridad total")
    print("  luz_norm  = 1.0  -->  luz máxima")
    print("  vel_norm  = 0.5  -->  sin movimiento (0 cm/s)")
    print("  vel_norm  > 0.5  -->  objeto se aleja")
    print("  vel_norm  < 0.5  -->  objeto se aproxima")

if __name__ == "__main__":
    main()