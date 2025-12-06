# Hispandle - Wordle de Historia de España y Zaragoza

Un juego diario al estilo Wordle donde debes adivinar el año de eventos históricos importantes de España y Zaragoza.

🌐 **URL en vivo**: https://hispandle.es

## 🎮 Características

- **Juego diario**: Un nuevo evento histórico cada día
- **Historia de 7 días**: Juega eventos de los últimos 7 días
- **Estadísticas**: Seguimiento de victorias, rachas y distribución de intentos
- **Interfaz atractiva**: Diseño moderno con animaciones y tema oscuro
- **Eventos históricos**: 37 eventos importantes de la historia de España y Zaragoza

## 🚀 Despliegue en Cloudflare Pages

### Opción 1: Desde GitHub

1. Sube este repositorio a GitHub
2. Ve a [Cloudflare Pages](https://pages.cloudflare.com/)
3. Conecta tu cuenta de GitHub
4. Selecciona este repositorio
5. Configuración de build:
   - **Framework preset**: None
   - **Build command**: (dejar vacío)
   - **Build output directory**: `/`
6. Despliega

### Opción 2: Usando Wrangler CLI

```bash
# Instalar Wrangler
npm install -g wrangler

# Autenticarse
wrangler login

# Desplegar
wrangler pages deploy . --project-name=histodle
```

## 📁 Estructura del Proyecto

```
historiaEsGame/
├── index.html       # Página principal
├── script.js        # Lógica del juego
├── style.css        # Estilos
├── eventos.json     # Base de datos de eventos
└── README.md        # Este archivo
```

## 🎯 Cómo Jugar

1. Lee la pista del evento histórico
2. Intenta adivinar el año (tienes 6 intentos)
3. Después de cada intento, verás:
   - 🟢 Verde: Año correcto
   - 🟡 Amarillo: Muy cerca (±10 años)
   - 🟠 Naranja: Cerca (±25 años)
   - 🔴 Rojo: Lejos (±50 años)
   - ⚫ Gris: Muy lejos (>50 años)

## 📊 Estadísticas

El juego guarda tus estadísticas localmente:
- Juegos jugados
- Porcentaje de victorias
- Racha actual y máxima
- Distribución de intentos

## 🛠️ Desarrollo Local

```bash
# Iniciar servidor local
python3 server.py

# Abrir en navegador
http://localhost:8000
```

## 📝 Licencia

Proyecto educativo de código abierto.
