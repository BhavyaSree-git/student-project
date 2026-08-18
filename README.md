# this is my just student-project with OpenAI
## 1. Project Overview

- React + Vite frontend
- Flask REST API backend
- PostgreSQL
- Docker / Docker Compose
- GitHub Actions CI/CD
- OpenAI AI Summary feature

## 2. Features

- Student CRUD
- Subjects / marks
- Attendance
- Student details
- AI Performance Summary

## Environment & OpenAI key

1. Create a `.env` file at the project root (next to `docker-compose.yml`) from `.env.example` and fill in your OpenAI key:

	- Copy on Windows PowerShell:

	```powershell
	copy .env.example .env
	# then edit the .env file and set OPENAI_API_KEY
	```

2. Run with Docker Compose (rebuild if you changed the `.env`):

```powershell
docker-compose down
docker-compose up -d --build
```

3. Verify the backend sees the key:

```powershell
docker-compose exec backend python -c "import os; print(bool(os.getenv('OPENAI_API_KEY')))"
# Expect: True
```

4. Quick local test (when running backend locally):

```powershell
#$env:OPENAI_API_KEY = "sk-..."
python backend/app.py
curl -X POST http://localhost:5000/api/ai/student-summary -H "Content-Type: application/json" -d '{"student_id":1}'
```

Do not commit your `.env` with secret keys to git. Add `.env` to `.gitignore` if not already ignored.