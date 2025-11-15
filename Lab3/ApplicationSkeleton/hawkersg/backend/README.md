# HawkerSG Backend Setup

### 1. Prerequisites

* Python 3.12+
* `pip` (Python package installer)

### 2. Setup and Installation

1.  **Clone the Repository (If applicable):**
    ```bash
    git clone [your-repo-link]
    cd [your-repo-name]/backend
    ```

2.  **Create and Activate a Virtual Environment:**
    It's crucial to use a virtual environment to isolate project dependencies.

    ```bash
    # Create the environment
    python -m venv venv 
    
    # Activate the environment
    # On Linux/macOS:
    source venv/bin/activate
    # On Windows (Command Prompt):
    .\venv\Scripts\activate
    ```

3.  **Install Dependencies:**
    Install all required packages from the generated `requirements.txt` file.

    ```bash
    pip install -r requirements.txt
    ```

### 3. Running the Application

1.  **Run the Server:**
    Run the application using `uvicorn`, ensuring you are in the directory *containing* the `app` folder (e.g., the root `/backend` directory).

    ```bash
    uvicorn app.main:app --reload --port 8001
    ```
    The `--reload` flag automatically restarts the server on code changes.

2.  **Access the API Documentation:**
    Once the server is running, the API documentation is available at:
    * **Swagger UI:** [http://localhost:8001/docs](http://localhost:8001/docs)
    * **ReDoc:** [http://localhost:8001/redoc](http://localhost:8001/redoc)

***

## ⚙️ Architecture and Structure

The application follows a standard modular structure:
```
/app
├── /controllers        # Contains business logic (consumer_controller.py: hashing, user creation, retrieval).
├── /models             # Contains SQLAlchemy definitions (user_model.py, consumer_model.py).
├── /routes             # Contains FastAPI APIRouter definitions (consumer_route.py: API endpoints).
├── /schemas            # Contains Pydantic data validation/serialization models (user_schema.py, consumer_schema.py).
├── database.py         # Handles SQLAlchemy engine, session creation, and the Base object.
└── main.py             # Initializes the FastAPI app, sets up CORS, and includes the routers.
```