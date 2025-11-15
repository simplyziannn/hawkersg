# 2006-SCED-103

# HawkerSG

HawkerSG is a full-stack prototype that helps diners discover hawker centres and stalls, manage personal favourites, and let business owners maintain their listings. The repository contains a FastAPI backend that exposes the REST API and seeds hawker-centre data gathered from the Singapore Food Agency (SFA), alongside a Vite + React frontend for the consumer- and business-facing experiences.

<br>
<br>


<p align="center">
  <img src="Lab5/HawkerSGLogo.jpg" alt="HawkerSG Logo" width="700">
</p>

<p align="center">
  <a href="https://youtu.be/DeGJBotqPmE" target="_blank"><strong>Demo Video</strong></a>
</p>

<details>
<summary><h2>Diagrams</h2></summary>

<br>

1. [White Box Graph – Login](HawkerSG/Diagrams/SC2006%20Lab4%20White%20Box%20Graph%20-%20Login.png)

2. [White Box Graph – Add Menu Item](HawkerSG/Diagrams/White%20Box%20Graph%20-%20Add%20Menu%20Item.jpeg)

3. [Sequence Diagram – Business Sign Up](HawkerSG/Diagrams/Sequence%20Diagram%20-%20Business%20Sign%20Up.png)

4. [Sequence Diagram – Manage Consumer Profile](HawkerSG/Diagrams/Sequence%20Diagram%20-%20Manage%20Consumer%20Profile.png)

5. [Sequence Diagram – Search](HawkerSG/Diagrams/Sequence%20Diagram%20-%20Search.png)

6. [Sequence Diagram – Upload Reviews](HawkerSG/Diagrams/Sequence%20Diagram%20-%20Upload%20Reviews.png)

7. [System Architecture Diagram](HawkerSG/Diagrams/System%20Architecture%20-%20latest.png)

8. [Use Case Diagram](HawkerSG/Diagrams/UC%20Diagram-latest.png)

9. [Entity Class Diagram](HawkerSG/Diagrams/class%20diagram%20of%20entity%20classes.jpeg)

10. [Control Flow – Add Menu](HawkerSG/Diagrams/control%20flow%20add%20menu.jpeg)

11. [Dialog Map](HawkerSG/Diagrams/dialog%20map.jpeg)

12. [Key Boundary & Control Class Diagram](HawkerSG/Diagrams/keyboundaryclassandcontrollclass.jpeg)

</details>
<details>
<summary><h2>Finalised Lab Submissions</h2></summary>

1. [Lab 1 Deliverables](Lab1/Lab%201%20Deliverables.pdf)
2. [Lab 2 Deliverables](Lab2/Lab%202%20Deliverables.pdf)
3. [Lab 3 Deliverables](Lab3/Lab%203%20Deliverables.pdf)
4. [Lab 4 Deliverables](Lab4/Lab%204%20Deliverables.pdf)
5. [Presentation Slides](Lab4/Presentation%20Slides.pdf)
6. [Journey Progression](Lab5/HawkerSG%20Progression.pdf)
7. [Software Requirements Specifications](Lab5/Software%20Requirements%20Specification.pdf)
8. [Link to Demo Video](https://www.youtube.com/watch?v=DeGJBotqPmE)


</details>


<br>
<br>




## Repository layout

| Path | Description |
|------|-------------|
| [`backend/`](HawkerSG/backend/) | FastAPI application, SQLAlchemy database models, data seeding utilities, and services. |
| [`frontend/`](HawkerSG/frontend/) | Vite + React + TypeScript web application that consumes the backend API. |
| [`DemoImages/`](HawkerSG/DemoImages/) | Assorted mockups used during design discussions. 

Each sub-project has its own README with detailed setup instructions. The sections below provide a high-level overview and the minimal steps to get both tiers running for local development.

## Tech stack

- **Backend:** Python 3.12+, FastAPI, SQLAlchemy, SQLite, PyInstrument middleware for profiling, plus CLI utilities for ingesting SFA data dumps.
- **Frontend:** Node.js 18+ (Vite 5 requirement), React 18, React Router, Tailwind CSS, Framer Motion animations, Lucide icons.

## Quick start

1. **Clone the repository**
   ```bash
   git clone <https://github.com/softwarelab3/2006-SCED-103/tree/main>
   cd hawkersg
   ```
2. **Start the backend API**
   ```bash
   cd backend
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8001
   ```
   The FastAPI docs are then available at http://localhost:8001/docs.
3. **Start the frontend dev server**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Vite defaults to http://localhost:5173 and proxies requests to `http://localhost:8001` as configured in the React code (`API_BASE_URL`).

Refer to [`backend/README.md`](HawkerSG/backend/README.md) and [`frontend/README.md`](HawkerSG/frontend/README.md) for deeper dives into configuration, data seeding, and available scripts.


# Contributors

| Name | Role |
| --- | --- |
| Lee Yong Liang | Backend |
| Lee Zi An | Backend |
| Lee Jun De, Kavan | Backend |
| Lim Xiao Xuan | Frontend |
| Lim Seow Kiat | Frontend |
| Leck Kye-Cin | Frontend |

Feel free to file issues for feature requests, data corrections, or bug reports.
