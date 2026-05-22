# ⚙️ NetOrchestrator — Microservicio de Orquestación de Jobs Kubernetes

<div align="center">

### 🛠️ Stack Tecnológico

![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11.0.1-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Jobs-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.3-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

### ☁️ Calidad & Seguridad

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-Security-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![SonarQube](https://img.shields.io/badge/SonarQube-Quality-4E9BCD?style=for-the-badge&logo=sonarqube&logoColor=white)
![Gitleaks](https://img.shields.io/badge/Gitleaks-Secret_Detection-DC382D?style=for-the-badge)
![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)

### 🏗️ Arquitectura

![Modular](https://img.shields.io/badge/Architecture-Modular_NestJS-blueviolet?style=for-the-badge)
![K8s Jobs](https://img.shields.io/badge/K8s-Batch_Jobs-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![REST API](https://img.shields.io/badge/REST-API-009688?style=for-the-badge)

</div>

---

## 📑 Tabla de Contenidos

1. [👤 Integrantes](#1--integrantes)
2. [🎯 Objetivo del Microservicio](#2--objetivo-del-microservicio)
3. [⚡ Funcionalidades Principales](#3--funcionalidades-principales)
4. [📋 Estrategia de Versionamiento y Branches](#4--estrategia-de-versionamiento-y-branches)
5. [⚙️ Tecnologías Utilizadas](#5-️-tecnologías-utilizadas)
6. [🧩 Funcionalidad y Endpoints](#6--funcionalidad-y-endpoints)
7. [🏛️ Arquitectura, Patrones y Módulos](#7-️-arquitectura-patrones-y-módulos)
8. [⚠️ Manejo de Errores](#8-️-manejo-de-errores)
9. [🧪 Evidencia de Pruebas y Cobertura](#9--evidencia-de-pruebas-y-cobertura)
10. [🗂️ Organización del Código](#10-️-organización-del-código)
11. [🔗 Conexiones con Servicios Externos](#11--conexiones-con-servicios-externos)
12. [🚀 Ejecución del Proyecto](#12--ejecución-del-proyecto)
13. [⚙️ Pipelines CI/CD y Seguridad](#13-️-pipelines-cicd-y-seguridad)
14. [🤝 Integrantes y Contribuciones](#14--integrantes-y-contribuciones)

---

## 1. 👤 Integrantes

- Tulio Riaño Sánchez
- Julian Camilo Lopez Barrero
- Juan Sebastián Puentes Julio
- David Alejandro Patacon Henao

---

## 2. 🎯 Objetivo del Microservicio

**NetOrchestrator** ejecuta proyectos Java/Maven del usuario en contenedores Kubernetes aislados. Recibe una URL de repositorio Git, crea un Kubernetes Job con la imagen Maven apropiada, monitorea su ejecución, y transmite los logs en tiempo real via WebSocket. También detecta la versión Java de un repositorio antes de ejecutarlo.

---

## 3. ⚡ Funcionalidades Principales

| Funcionalidad | Descripción |
|---|---|
| **Creación de Jobs K8s** | Lanza un `batch/v1 Job` con la imagen `tulio3101/omni-maven-{version}` para compilar y ejecutar el proyecto. |
| **Streaming de logs** | Transmite en tiempo real los logs del pod via WebSocket (Socket.IO) al cliente. |
| **Detección de versión Java** | Analiza el repositorio con un job especializado para determinar qué versión de Java usa. |
| **Eliminación de Jobs** | Limpia jobs terminados del cluster Kubernetes. |
| **Métricas Prometheus** | Expone `http_requests_total` y latencia en `/metrics`. |
| **Seguridad SAST** | Pipeline de seguridad con ESLint security, Gitleaks y npm audit. |

---

## 4. 📋 Estrategia de Versionamiento y Branches

### Estrategia de Ramas

#### `main` — Estable, dispara pipeline de seguridad
#### `develop` — Integración de features
#### `feature/*` — Desarrollo específico

### 4.1 Convenciones para commits

```
feat: agregar soporte para Java 21 en job specs
fix: corregir timeout de streaming de logs
test: agregar pruebas para orchestrator.service
security: actualizar gitleaks config para excluir test fixtures
```

---

## 5. ⚙️ Tecnologías Utilizadas

| **Tecnología** | **Uso en el proyecto** |
|---|---|
| **TypeScript 5.7.3** | Lenguaje base. |
| **NestJS 11.0.1** | Framework REST + WebSocket. |
| **Node.js 22** | Runtime. |
| **@kubernetes/client-node 1.4.0** | Cliente oficial K8s para crear/monitorear jobs y pods. |
| **Socket.IO 4.8.3** | WebSocket para streaming de logs en tiempo real. |
| **@nestjs/jwt** | Validación de JWT en REST y WebSocket. |
| **prom-client 15.1.3** | Métricas Prometheus. |
| **archiver 7.0.1** | Compresión de outputs de jobs. |
| **class-validator** | Validación de DTOs. |
| **Jest 30** | Framework de pruebas. |
| **pnpm 10** | Gestor de paquetes. |
| **Gitleaks v8.24.0** | Detección de secretos en el código. |
| **eslint-plugin-security** | SAST estático en pipeline. |

---

## 6. 🧩 Funcionalidad y Endpoints

### REST API (todas requieren `Authorization: Bearer <JWT>`)

---

#### 1️⃣ Ejecutar Proyecto — `POST /orchestrator/run`

#### 📦 Request

| Campo | Tipo | Restricción | Descripción |
|---|---|:---:|---|
| REPO_URL | string | URL HTTPS GitHub/GitLab | Repositorio Maven a compilar y ejecutar |
| JAVA_VERSION | string | Obligatorio | Versión Java (ej: `"21"`, `"17"`) |

#### 📤 Response (201 CREATED)

```json
{ "message": "Job creado exitosamente", "jobName": "maven-generator-1716384000000" }
```

**Job K8s creado:**
- Imagen: `tulio3101/omni-maven-{JAVA_VERSION}:latest`
- Recursos: 2.5Gi RAM / 1500m CPU (límites), 512Mi / 250m (requests)
- Volúmenes: output directory + Maven cache (`~/.m2`)

---

#### 2️⃣ Detectar Versión Java — `POST /orchestrator/java`

```json
{ "REPO_URL": "https://github.com/org/repo" }
```

**Response:** `{ "javaVersion": "21" }`

---

#### 3️⃣ Eliminar Job — `POST /orchestrator/clear`

```json
{ "jobName": "maven-generator-1716384000000" }
```

**Response:** `{ "message": "Job eliminado", "jobName": "..." }`

---

### WebSocket Gateway (`/orchestrator/socket.io`)

**Auth:** JWT en header `Authorization` del handshake.

| Evento (Cliente → Servidor) | Payload | Descripción |
|---|---|---|
| `logs` | `{ jobName }` | Suscribirse a logs del job |

| Evento (Servidor → Cliente) | Descripción |
|---|---|
| `logs:data` | Línea de log del pod en tiempo real |
| `logs:complete` | Job terminado |
| `logs:error` | Error al obtener logs |

---

#### Métricas — `GET /metrics`

Prometheus text format: `http_requests_total`, `http_request_duration_seconds`.

---

## 7. 🏛️ Arquitectura, Patrones y Módulos

### Flujo de Ejecución

```
Cliente
   │
   ├─ POST /orchestrator/run ─────────────────────────────────────►│
   │                                                                │ NestJS
   │   K8s Batch Job creado: maven-generator-{timestamp}           │
   │   (imagen: tulio3101/omni-maven-21:latest)                    │
   │                                                                │
   ├─ WS: logs { jobName } ────────────────────────────────────────►│
   │                                                                │ Stream K8s pod logs
   │◄── logs:data (línea a línea) ──────────────────────────────────│
   │◄── logs:complete ──────────────────────────────────────────────│
   │
   └─ POST /orchestrator/clear ──── delete K8s Job
```

### Módulos

```
AppModule
├── OrchestratorModule   (K8s service + REST controller + WebSocket gateway)
├── AuthModule           (JwtAuthGuard)
└── MetricsController    (Prometheus)
```

### Patrones Aplicados

| Patrón | Dónde | Propósito |
|---|---|---|
| **Guard** | `JwtAuthGuard` | Valida JWT en REST y WebSocket gateway. |
| **Proxy HTTP** | `OrchestratorService` | El servicio encapsula todas las llamadas a la API de Kubernetes. |
| **Interceptor** | `MetricsInterceptor` | Tracking de latencia Prometheus. |
| **DTO** | `CreateRunOrchestratorDto`, `JavaOrchestratorDto`, `ClearJobDto` | Contratos tipados para cada operación. |

---

## 8. ⚠️ Manejo de Errores

| ⚠️ Escenario | 🔢 HTTP | Descripción |
|:---|:---:|:---|
| JWT inválido | 401 | Guard rechaza REST y WebSocket |
| Validación de DTO | 422 | `ValidationPipe` global |
| Error K8s API | 500 | Error al crear/eliminar job |
| Pod no encontrado | WS `logs:error` | Evento de error en WebSocket |

---

## 9. 🧪 Evidencia de Pruebas y Cobertura

### Suites de prueba — 7 archivos

```
src/
├── orchestrator/orchestrator.service.spec.ts    # clearJob, javaVersion, runningProject, streamLogsToSocket
├── orchestrator/orchestrator.controller.spec.ts # Handlers REST
├── orchestrator/orchestrator.gateway.spec.ts    # WebSocket gateway
├── auth/jwt-auth.guard.spec.ts                  # Guard JWT
├── metrics/metrics.service.spec.ts
├── metrics/metrics.interceptor.spec.ts
└── orchestrator/orchestrator-dtos.spec.ts       # Validación de DTOs
```

### Cómo ejecutar

```bash
pnpm test          # Unitarias
pnpm test:cov      # Cobertura
```

---

## 10. 🗂️ Organización del Código

```
NetOrchestrator/
│
├── src/
│   ├── main.ts                              # Bootstrap
│   ├── app.module.ts                        # Módulo raíz
│   ├── orchestrator/
│   │   ├── orchestrator.module.ts
│   │   ├── orchestrator.service.ts          # Lógica K8s: runningProject, javaVersion, clearJob, streamLogsToSocket
│   │   ├── orchestrator.controller.ts       # REST: /orchestrator/run, /java, /clear
│   │   ├── orchestrator.gateway.ts          # WebSocket: logs subscription
│   │   └── dto/
│   │       ├── create-run-orchestrator.dto.ts
│   │       ├── java-orchestrator.dto.ts
│   │       └── clear-job-orchestrator.dto.ts
│   ├── auth/jwt-auth.guard.ts               # JWT validation
│   └── metrics/                             # Prometheus
│       ├── metrics.service.ts
│       ├── metrics.controller.ts            # GET /metrics
│       └── metrics.interceptor.ts
│
├── .github/workflows/security.yml           # Audit + Gitleaks + SAST
├── .gitleaks.toml                           # Reglas custom de detección de secretos
├── eslint.security.config.mjs               # ESLint security plugins
├── package.json
├── pnpm-lock.yaml
└── sonar-project.properties
```

---

## 11. 🔗 Conexiones con Servicios Externos

| Servicio | Variable de Entorno | Descripción |
|---|---|---|
| **Kubernetes Cluster** | `KUBECONFIG` | API de K8s para crear/monitorear/eliminar jobs. Usa in-cluster config si no se define. |
| **Docker Registry** | — | Imágenes `tulio3101/omni-maven-{version}:latest` y `tulio3101/omni-java:latest` se obtienen en el cluster. |
| **JWT** (NetAuthentication) | `JWT_SECRET` | Secreto compartido para validar tokens. |

---

## 12. 🚀 Ejecución del Proyecto

### 📋 Prerrequisitos

- **Node.js 22+**, **pnpm 10**
- Acceso a un cluster Kubernetes (local o remoto)

```bash
pnpm install
pnpm start:dev
```

📍 **URL Local:** `http://localhost:3000`
📚 **Swagger:** `http://localhost:3000/api`

### ⚙️ Variables de Entorno

| Variable | Requerida | Default | Descripción |
|:---|:---:|:---|:---|
| `PORT` | ❌ | `3000` | Puerto del servidor |
| `JWT_SECRET` | ✅ | — | Clave JWT |
| `KUBECONFIG` | ❌ | In-cluster config | Path al kubeconfig del cluster K8s |

---

## 13. ⚙️ Pipelines CI/CD y Seguridad

### Pipeline — `security.yml`

**Triggers:** push a cualquier rama

```
security-audit    → pnpm audit --audit-level=high (vulnerabilidades en dependencias)
secret-detection  → Gitleaks v8.24.0 (secrets en git history y código)
sast              → ESLint security analysis (eslint-plugin-security)
```

### Secrets requeridos

| Secret | Descripción |
|---|---|
| `SONAR_TOKEN` | SonarCloud (org: n3trs) |

---

## 14. 🤝 Integrantes y Contribuciones

<div align="center">

![Course](https://img.shields.io/badge/Course-ARSW-orange?style=for-the-badge)
![Year](https://img.shields.io/badge/Year-2026--1-blue?style=for-the-badge)

| 👤 Integrante | 🎓 Rol |
|:---|:---|
| Tulio Riaño Sánchez | Desarrollo y arquitectura |
| Julian Camilo Lopez Barrero | Desarrollo y arquitectura |
| Juan Sebastián Puentes Julio | Desarrollo y arquitectura |
| David Alejandro Patacon Henao | Desarrollo y arquitectura |

> 💡 **NetOrchestrator** ejecuta proyectos Java/Maven de usuarios en Kubernetes de forma aislada y segura, transmitiendo los logs de compilación y ejecución en tiempo real directamente al IDE colaborativo OmniCode.

**🎓 Escuela Colombiana de Ingeniería Julio Garavito**

</div>
