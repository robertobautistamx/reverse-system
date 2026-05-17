# Panel Admin - Reverse System

Panel web para visualizar lecturas del sistema de monitoreo de muelle. Consume la API REST de `api-sensores` y muestra indicadores, tablas y graficas con el estado del semaforo.

## Requisitos

- Node.js 18+
- API REST en ejecucion (ver README principal)

## Instalacion y uso

```bash
cd reverse_system/panel_admin
npm install
npm start
```

Abrir http://localhost:3000 en el navegador.

## Estructura del proyecto

```
panel_admin/
├── package.json
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
└── src/
	├── App.css
	├── App.tsx
	├── index.css
	├── index.tsx
	├── react-app-env.d.ts
	├── reportWebVitals.js
	└── dashboard/
		├── DashboardPage.tsx
		├── index.ts
		├── types.ts
		├── components/
		│   ├── Chart.tsx
		│   ├── DataTable.tsx
		│   └── StatCard.tsx
		├── hooks/
		│   └── useDashboardData.ts
		└── utils/
			└── format.ts
```

## Build de produccion

```bash
npm run build
```

## Capturas

![Panel Reverse System](../../assets/dashboard_images/panel_reverse-system.jpg)
![Panel Reverse System 1.2](../../assets/dashboard_images/panel_reverse-system-1.2.jpg)
![Panel Reverse System 1.3](../../assets/dashboard_images/panel_reverse-system-1.3.jpeg)
