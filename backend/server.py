from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class DetectionEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    event_type: str  # 'focus_lost', 'no_face', 'multiple_faces', 'object_detected'
    details: str
    confidence: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DetectionEventCreate(BaseModel):
    session_id: str
    event_type: str
    details: str
    confidence: float = 0.0

class InterviewSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_name: str
    interviewer_name: str
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    status: str = "active"  # active, completed, interrupted
    total_events: int = 0
    integrity_score: float = 100.0

class InterviewSessionCreate(BaseModel):
    candidate_name: str
    interviewer_name: str

class InterviewReport(BaseModel):
    session: InterviewSession
    events: List[DetectionEvent]
    summary: dict

# Routes
@api_router.get("/")
async def root():
    return {"message": "Video Proctoring API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Interview Sessions
@api_router.post("/sessions", response_model=InterviewSession)
async def create_session(input: InterviewSessionCreate):
    session_dict = input.dict()
    session_obj = InterviewSession(**session_dict)
    session_data = session_obj.dict()
    session_data['start_time'] = session_data['start_time'].isoformat()
    if session_data['end_time']:
        session_data['end_time'] = session_data['end_time'].isoformat()
    _ = await db.interview_sessions.insert_one(session_data)
    return session_obj

@api_router.get("/sessions", response_model=List[InterviewSession])
async def get_sessions():
    sessions = await db.interview_sessions.find().to_list(1000)
    result = []
    for session in sessions:
        if isinstance(session.get('start_time'), str):
            session['start_time'] = datetime.fromisoformat(session['start_time'])
        if session.get('end_time') and isinstance(session.get('end_time'), str):
            session['end_time'] = datetime.fromisoformat(session['end_time'])
        result.append(InterviewSession(**session))
    return result

@api_router.get("/sessions/{session_id}", response_model=InterviewSession)
async def get_session(session_id: str):
    session = await db.interview_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if isinstance(session.get('start_time'), str):
        session['start_time'] = datetime.fromisoformat(session['start_time'])
    if session.get('end_time') and isinstance(session.get('end_time'), str):
        session['end_time'] = datetime.fromisoformat(session['end_time'])
    
    return InterviewSession(**session)

@api_router.put("/sessions/{session_id}/end")
async def end_session(session_id: str):
    session = await db.interview_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate integrity score based on events
    events = await db.detection_events.find({"session_id": session_id}).to_list(1000)
    integrity_score = calculate_integrity_score(events)
    
    update_data = {
        "end_time": datetime.now(timezone.utc).isoformat(),
        "status": "completed",
        "total_events": len(events),
        "integrity_score": integrity_score
    }
    
    await db.interview_sessions.update_one(
        {"id": session_id}, 
        {"$set": update_data}
    )
    
    return {"message": "Session ended successfully", "integrity_score": integrity_score}

# Detection Events
@api_router.post("/events", response_model=DetectionEvent)
async def create_event(input: DetectionEventCreate):
    event_dict = input.dict()
    event_obj = DetectionEvent(**event_dict)
    event_data = event_obj.dict()
    event_data['timestamp'] = event_data['timestamp'].isoformat()
    _ = await db.detection_events.insert_one(event_data)
    return event_obj

@api_router.get("/events/{session_id}", response_model=List[DetectionEvent])
async def get_events(session_id: str):
    events = await db.detection_events.find({"session_id": session_id}).to_list(1000)
    result = []
    for event in events:
        if isinstance(event.get('timestamp'), str):
            event['timestamp'] = datetime.fromisoformat(event['timestamp'])
        result.append(DetectionEvent(**event))
    return result

# Reports
@api_router.get("/reports/{session_id}", response_model=InterviewReport)
async def get_report(session_id: str):
    # Get session
    session = await db.interview_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if isinstance(session.get('start_time'), str):
        session['start_time'] = datetime.fromisoformat(session['start_time'])
    if session.get('end_time') and isinstance(session.get('end_time'), str):
        session['end_time'] = datetime.fromisoformat(session['end_time'])
    
    # Get events
    events = await db.detection_events.find({"session_id": session_id}).to_list(1000)
    parsed_events = []
    for event in events:
        if isinstance(event.get('timestamp'), str):
            event['timestamp'] = datetime.fromisoformat(event['timestamp'])
        parsed_events.append(DetectionEvent(**event))
    
    # Generate summary
    summary = generate_report_summary(parsed_events)
    
    return InterviewReport(
        session=InterviewSession(**session),
        events=parsed_events,
        summary=summary
    )

def calculate_integrity_score(events):
    """Calculate integrity score based on detected events"""
    base_score = 100.0
    
    for event in events:
        event_type = event.get('event_type', '')
        if event_type == 'focus_lost':
            base_score -= 2
        elif event_type == 'no_face':
            base_score -= 5
        elif event_type == 'multiple_faces':
            base_score -= 10
        elif event_type == 'object_detected':
            # Different penalties for different objects
            details = event.get('details', '').lower()
            if 'phone' in details or 'cell phone' in details:
                base_score -= 15
            elif 'book' in details or 'notebook' in details:
                base_score -= 10
            elif 'laptop' in details or 'computer' in details:
                base_score -= 8
            else:
                base_score -= 5
    
    return max(0, base_score)

def generate_report_summary(events):
    """Generate summary statistics from events"""
    summary = {
        'total_events': len(events),
        'focus_lost_count': 0,
        'no_face_count': 0,
        'multiple_faces_count': 0,
        'object_detected_count': 0,
        'detected_objects': [],
        'timeline': []
    }
    
    for event in events:
        event_type = event.event_type
        if event_type == 'focus_lost':
            summary['focus_lost_count'] += 1
        elif event_type == 'no_face':
            summary['no_face_count'] += 1
        elif event_type == 'multiple_faces':
            summary['multiple_faces_count'] += 1
        elif event_type == 'object_detected':
            summary['object_detected_count'] += 1
            summary['detected_objects'].append(event.details)
        
        summary['timeline'].append({
            'time': event.timestamp.isoformat(),
            'type': event_type,
            'details': event.details
        })
    
    return summary

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()