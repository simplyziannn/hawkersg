# HawkerSG Backend

FastAPI backend powering the HawkerSG platform. It provides REST APIs for hawker centres, stalls, menus, reviews, authentication, and business management. The backend uses SQLite for local development and includes scripts to seed hawker data from the Singapore Food Agency (SFA).

---

## Key Capabilities
- Browse hawker centres, stalls, menus, and reviews  
- Manage stall profiles, menus, and gallery images (business owners)  
- Review submission with moderation guards  
- JWT authentication + OneMap geocoding  
- Automatic DB creation + SFA data seeding on startup  

---

## Tech Stack
| Layer | Tools |
|-------|-------|
| Runtime | Python 3.12+, Uvicorn |
| Framework | FastAPI + Starlette |
| Database | SQLite via SQLAlchemy ORM |
| Validation | Pydantic models |
| Instrumentation | PyInstrument |
| Data ingestion | Scripts under `backend/SFA/` |

---

## Directory Overview
```text
backend/
├── app/
│   ├── controllers/     # Business logic
│   ├── models/          # SQLAlchemy tables
│   ├── routes/          # API routers
│   ├── schemas/         # Pydantic models
│   ├── services/        # Favourites, reviews, guards
│   ├── utils/           # JWT, email, OneMap, profiling
│   ├── assets/          # Seed images
│   └── main.py          # App factory + middleware
├── SFA/                 # Hawker datasets + scripts
├── requirements.txt
└── README.md
```

---

## Getting Started

### Prerequisites
- Python **3.12+**
- `pip` / `venv`
- SQLite (bundled with Python)

### Installation
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .\.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Running the Server
```bash
uvicorn app.main:app --reload --port 8001
```

- Swagger UI: http://localhost:8001/docs  
- ReDoc: http://localhost:8001/redoc  

---

## Environment Variables
Ensure that you have your own keys for the following; if not, it will not work.
Before running this project, create a `.env` file in the backend/app directory and add the following variables:
| Variable                      | Purpose                                        |
|-------------------------------|------------------------------------------------|
| `SENDGRID_API_KEY`            | SendGrid API Key                               |
| `SENDGRID_SENDER_EMAIL`       | SendGrid sender email address                  |
| `FRONTEND_URL`                | URL of the frontend application                |
| `SECRET_KEY`                  | Secret for backend/JWT authentication          |
| `ALGORITHM`                   | JWT signing algorithm (e.g., HS256)            |
| `ACCESS_TOKEN_EXPIRE_SECONDS` | JWT access token expiry time in seconds        |
| `SQLALCHEMY_DATABASE_URL`     | Replace SQLite with PostgreSQL/MySQL           |
| `JWT_SECRET_KEY`              | Secret for signing JWT tokens                  |
| `ONEMAP_EMAIL`                | Email for live OneMap token requests           |
| `ONEMAP_PASSWORD`             | Password for live OneMap token requests        |
| `OPENAI_API_KEY`              | OpenAI API key                                 |
| `OPENAI_CLASSIFIER_MODEL`     | OpenAI classifier model name                   |

---

## API Overview
| Area | Prefix | Description |
|------|--------|-------------|
| Consumers | `/consumers` | Signup, login, profile, favourites |
| Business | `/business` | Stall profile, menus, gallery |
| Hawkers | `/hawkers` | Hawker centre directory |
| Stalls | `/stalls` | Stall details + menus |
| Reviews | `/reviews` | Review submission & retrieval |
