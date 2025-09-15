# Online Interview Platform

A web-based platform for conducting online interviews, built with React (frontend) and FastAPI (backend).

## Features

- Real-time interview sessions
- User authentication
- Question management
- Video and text support

<img width="1620" height="917" alt="Screenshot 2025-09-16 004623" src="https://github.com/user-attachments/assets/6e9d9a50-60a3-4e25-a723-2ad744d9a1f8" /><br>

<img width="1620" height="915" alt="Screenshot 2025-09-16 004638" src="https://github.com/user-attachments/assets/53bc536a-748e-47d0-8332-5751dbb92f87" /><br>

<img width="1920" height="918" alt="Screenshot 2025-09-16 004711" src="https://github.com/user-attachments/assets/79e09069-ba19-4fd2-a6fd-c2dc6f71169a" /><br>

<img width="1920" height="916" alt="image" src="https://github.com/user-attachments/assets/6abb264a-30b8-4cc3-afa2-6da56a9ab194" />

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://www.python.org/) (v3.9+ recommended)
- [MongoDB](https://www.mongodb.com/) (if used)
- [Git](https://git-scm.com/)

## Installation

### 1. Clone the repository

```sh
git clone https://github.com/your-username/online_Interview_platform.git
cd online_Interview_platform
```

### 2. Backend Setup

```sh
cd backend
pip install -r requirements.txt
python server.py
```

### 3. Frontend Setup

```sh
cd ../frontend
npm install --legacy-peer-deps
npm start
```

### 4. Environment Variables

Edit `frontend/.env` to set your backend URL:
```
REACT_APP_BACKEND_URL=http://localhost:8000
WDS_SOCKET_PORT=3000
```

### 5. Running the App

- Backend runs on [http://localhost:8000](http://localhost:8000)
- Frontend runs on [http://localhost:3000](http://localhost:3000)

## Deployment

You can use Docker or cloud platforms for deployment. See `.emergent/emergent.yml` for environment configuration.

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

[MIT](LICENSE)
