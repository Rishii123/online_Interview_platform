# Online Interview Platform

A web-based platform for conducting online interviews, built with React (frontend) and FastAPI (backend).

## Features

- Real-time interview sessions
- User authentication
- Question management
- Video and text support

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
