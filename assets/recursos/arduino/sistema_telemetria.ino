/* const uint8_t PIN_TRIG=9;
const uint8_t PIN_ECHO=10;
const uint8_t PIN_LDR=A0;
const uint8_t PIN_VERDE=4;
const uint8_t PIN_AMARILLO=5;
const uint8_t PIN_ROJO=6;
const uint8_t PIN_FARO=7;
const uint8_t PIN_BUZZER=3;

// ----------------------------------------------------//
//paramtros
const unsigned long INTERVALO_MUESTREO_MS=50;
const unsigned int  TIMEOUT_ECHO_US=25000;
const int UMBRAL_LUZ=300;
// ----------------------------------------------------//

//estado 
unsigned long t_ultima_muestra=0;
// ----------------------------------------------------//

// buzzer
unsigned long t_buzzer_cambio=0;
bool buzzer_encendido=false;
unsigned int buzzer_periodo=0;
// ----------------------------------------------------//

// parpadeo leds
unsigned long t_led=0;
bool led_state=true;
// ----------------------------------------------------//

//controles
bool modoAuto=true;   // R=true
bool buzzerActivo=true;   // A=false  |  R=true
bool faroManual=false;  // C=true   |  R=false

// ----------------------------------------------------//
//semaforo
int estado_actual=0; // 0=verde, 1=amarillo, 2=rojo

// ----------------------------------------------------//
void setup() {
  pinMode(PIN_TRIG,     OUTPUT);
  pinMode(PIN_ECHO,     INPUT);
  pinMode(PIN_VERDE,    OUTPUT);
  pinMode(PIN_AMARILLO, OUTPUT);
  pinMode(PIN_ROJO,     OUTPUT);
  pinMode(PIN_FARO,     OUTPUT);
  pinMode(PIN_BUZZER,   OUTPUT);

  Serial.begin(115200);
  delay(100);
}
// ----------------------------------------------------//
//sensores
float medirDistanciaCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long duracion = pulseIn(PIN_ECHO, HIGH, TIMEOUT_ECHO_US);
  if (duracion==0) return -1.0;

  return (duracion*0.0343f)/2.0f;
}

// ----------------------------------------------------//
void actualizarSemaforo(float d) {

  if (d<=0) {
    estado_actual=0;
    return;
  }

  switch (estado_actual) {
    case 0: // verde
      if (d<80) estado_actual=1;
      break;
    case 1: // amarillo
      if (d<20)  estado_actual=2;
      else if (d>90) estado_actual=0;
      break;
    case 2: // rojo
      if (d>30) estado_actual=1;
      break;
  }
}

// ----------------------------------------------------//
void aplicarLeds(float d) {

  //vel. de parpadeo segyun distancia
  unsigned int intervalo;
  if      (d>60) intervalo=0; 
  else if (d>30) intervalo=400;
  else if (d>15) intervalo=200;
  else             intervalo=100;

  //actualizar fase del parpadeo
  if (intervalo>0) {
    if (millis()-t_led>=intervalo) {
      t_led=millis();
      led_state=!led_state;
    }
  } else {
    led_state=true;  // sin parpadeo --> siempre encendido
  }

  digitalWrite(PIN_VERDE,    LOW);
  digitalWrite(PIN_AMARILLO, LOW);
  digitalWrite(PIN_ROJO,     LOW);

  if (!led_state) return;   // fase apagada --> salir sin encender nada

  switch (estado_actual) {
    case 0: digitalWrite(PIN_VERDE,    HIGH); break;
    case 1: digitalWrite(PIN_AMARILLO, HIGH); break;
    case 2: digitalWrite(PIN_ROJO,     HIGH); break;
  }
}

// ----------------------------------------------------//
void actualizarBuzzer(float d) {

  if (!buzzerActivo) {
    noTone(PIN_BUZZER);
    buzzer_periodo=0;
    return;
  }

  if (d<=0 || d>80) {
    noTone(PIN_BUZZER);
    buzzer_periodo = 0;
    return;
  }

  // muy cerca=tono continuo
  if (d<=10) {
    tone(PIN_BUZZER, 2000);
    buzzer_periodo = 0;
    return;
  }

  // progresivo
  if      (d>40) buzzer_periodo=400;
  else if (d>20) buzzer_periodo=200;
  else             buzzer_periodo=100;
}

void servicioBuzzer(unsigned long ahora) {
  if (buzzer_periodo==0) return;

  if (ahora - t_buzzer_cambio>=buzzer_periodo) {
    t_buzzer_cambio=ahora;
    buzzer_encendido=!buzzer_encendido;

    if (buzzer_encendido) tone(PIN_BUZZER, 1500);
    else                  noTone(PIN_BUZZER);
  }
}

// ----------------------------------------------------//
//faro
void actualizarFaro(int luz) {
  if (faroManual) {
    digitalWrite(PIN_FARO, HIGH);
  } else {
    // Modo automatico
    digitalWrite(PIN_FARO, (luz > UMBRAL_LUZ) ? HIGH : LOW);
  }
}

// ----------------------------------------------------//
void loop() {

  unsigned long ahora = millis();
  servicioBuzzer(ahora);

  if (Serial.available()) {
    char cmd=Serial.read();

    if (cmd=='A') {
      buzzerActivo=false;
      noTone(PIN_BUZZER);
    }
    else if (cmd=='C') {
      faroManual=true;
    }
    else if (cmd=='R') {
      modoAuto=true;
      buzzerActivo=true;
      faroManual=false;
    }
  }

// ----------------------------------------------------//
  if (ahora - t_ultima_muestra < INTERVALO_MUESTREO_MS) return;
  t_ultima_muestra = ahora;

  float d=medirDistanciaCm();
  int   luz=analogRead(PIN_LDR);

  if (modoAuto) {
    actualizarSemaforo(d);
    aplicarLeds(d);       
    actualizarBuzzer(d);
  }

  actualizarFaro(luz);     
  
  Serial.print(d, 2);
  Serial.print(',');
  Serial.print(ahora);
  Serial.print(',');
  Serial.print(luz);
  Serial.print(',');
  Serial.println(d > 0 ? estado_actual : -1);
}
 */