import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import {
  Video,
  VideoOff,
  Square,
  AlertTriangle,
  Eye,
  EyeOff,
  Users,
  Smartphone,
  BookOpen,
  Monitor,
  Clock,
  Activity,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VideoProctoring() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [session, setSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [currentDetections, setCurrentDetections] = useState({
    faces: 0,
    objects: [],
    focusStatus: 'focused'
  });
  
  // Model states
  const [models, setModels] = useState({
    objectDetection: null,
    loaded: false
  });
  
  // Detection states
  const [detectionStats, setDetectionStats] = useState({
    focusLostCount: 0,
    noFaceCount: 0,
    multipleFacesCount: 0,
    objectDetectedCount: 0
  });
  
  // Timing states
  const [timers, setTimers] = useState({
    noFaceTimer: 0,
    focusLostTimer: 0,
    sessionDuration: 0
  });
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const noFaceTimeoutRef = useRef(null);
  const focusTimeoutRef = useRef(null);

  useEffect(() => {
    initializeSession();
    loadModels();
    
    return () => {
      cleanup();
    };
  }, [sessionId]);

  useEffect(() => {
    if (models.loaded && isRecording) {
      startDetection();
    } else {
      stopDetection();
    }
  }, [models.loaded, isRecording]);

  const initializeSession = async () => {
    try {
      const response = await axios.get(`${API}/sessions/${sessionId}`);
      setSession(response.data);
      fetchEvents();
    } catch (error) {
      console.error("Failed to fetch session:", error);
      toast.error("Session not found");
      navigate("/");
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events/${sessionId}`);
      setEvents(response.data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  const loadModels = async () => {
    try {
      toast.info("Loading AI models...", { duration: 3000 });
      
      // Load TensorFlow.js backend
      await tf.ready();
      
      // Load models
      const [objectModel, faceModel] = await Promise.all([
        cocoSsd.load(),
        faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediaPipeFaceMesh)
      ]);
      
      setModels({
        objectDetection: objectModel,
        faceDetection: faceModel,
        loaded: true
      });
      
      toast.success("AI models loaded successfully!");
    } catch (error) {
      console.error("Failed to load models:", error);
      toast.error("Failed to load AI models");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      setIsRecording(true);
      startSessionTimer();
      toast.success("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to access camera");
    }
  };

  const stopRecording = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      stopSessionTimer();
      
      // End session in backend
      await axios.put(`${API}/sessions/${sessionId}/end`);
      
      toast.success("Recording stopped and session ended");
      navigate(`/reports/${sessionId}`);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error("Failed to stop recording");
    }
  };

  const startSessionTimer = () => {
    sessionTimerRef.current = setInterval(() => {
      setTimers(prev => ({
        ...prev,
        sessionDuration: prev.sessionDuration + 1
      }));
    }, 1000);
  };

  const stopSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
  };

  const startDetection = () => {
    detectionIntervalRef.current = setInterval(() => {
      detectObjects();
      detectFaces();
    }, 1000); // Run detection every second
  };

  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
  };

  const detectObjects = async () => {
    if (!models.objectDetection || !videoRef.current) return;

    try {
      const predictions = await models.objectDetection.detect(videoRef.current);
      
      const suspiciousObjects = predictions.filter(prediction => {
        const className = prediction.class.toLowerCase();
        return (
          className.includes('cell phone') ||
          className.includes('book') ||
          className.includes('laptop') ||
          className.includes('keyboard') ||
          className.includes('mouse')
        );
      });

      if (suspiciousObjects.length > 0) {
        suspiciousObjects.forEach(obj => {
          logEvent('object_detected', `${obj.class} detected with ${(obj.score * 100).toFixed(1)}% confidence`, obj.score);
        });
        
        setDetectionStats(prev => ({
          ...prev,
          objectDetectedCount: prev.objectDetectedCount + 1
        }));
      }

      setCurrentDetections(prev => ({
        ...prev,
        objects: suspiciousObjects
      }));
    } catch (error) {
      console.error("Object detection error:", error);
    }
  };

  const detectFaces = async () => {
    if (!models.faceDetection || !videoRef.current) return;

    try {
      const faces = await models.faceDetection.estimateFaces({
        input: videoRef.current,
        returnTensors: false,
        flipHorizontal: false,
      });

      const faceCount = faces.length;
      
      // Handle no face detection
      if (faceCount === 0) {
        handleNoFace();
      } else {
        clearNoFaceTimeout();
        
        // Handle multiple faces
        if (faceCount > 1) {
          logEvent('multiple_faces', `${faceCount} faces detected`, 1.0);
          setDetectionStats(prev => ({
            ...prev,
            multipleFacesCount: prev.multipleFacesCount + 1
          }));
        }

        // Simple focus detection based on face position
        // This is a simplified version - in a real implementation,
        // you'd use eye tracking and gaze estimation
        if (faces.length > 0) {
          const face = faces[0];
          const faceCenter = {
            x: face.boundingBox.topLeft[0] + face.boundingBox.bottomRight[0] / 2,
            y: face.boundingBox.topLeft[1] + face.boundingBox.bottomRight[1] / 2
          };
          
          const videoCenter = {
            x: videoRef.current.videoWidth / 2,
            y: videoRef.current.videoHeight / 2
          };
          
          const distance = Math.sqrt(
            Math.pow(faceCenter.x - videoCenter.x, 2) + 
            Math.pow(faceCenter.y - videoCenter.y, 2)
          );
          
          // If face is significantly off-center, consider it as focus lost
          if (distance > 100) {
            handleFocusLost();
          } else {
            clearFocusTimeout();
            setCurrentDetections(prev => ({
              ...prev,
              focusStatus: 'focused'
            }));
          }
        }
      }

      setCurrentDetections(prev => ({
        ...prev,
        faces: faceCount
      }));
    } catch (error) {
      console.error("Face detection error:", error);
    }
  };

  const handleNoFace = () => {
    if (!noFaceTimeoutRef.current) {
      noFaceTimeoutRef.current = setTimeout(() => {
        logEvent('no_face', 'No face detected for more than 10 seconds', 1.0);
        setDetectionStats(prev => ({
          ...prev,
          noFaceCount: prev.noFaceCount + 1
        }));
      }, 10000); // 10 seconds
    }
    
    setTimers(prev => ({
      ...prev,
      noFaceTimer: prev.noFaceTimer + 1
    }));
  };

  const clearNoFaceTimeout = () => {
    if (noFaceTimeoutRef.current) {
      clearTimeout(noFaceTimeoutRef.current);
      noFaceTimeoutRef.current = null;
    }
    setTimers(prev => ({ ...prev, noFaceTimer: 0 }));
  };

  const handleFocusLost = () => {
    if (!focusTimeoutRef.current) {
      focusTimeoutRef.current = setTimeout(() => {
        logEvent('focus_lost', 'Candidate looking away for more than 5 seconds', 1.0);
        setDetectionStats(prev => ({
          ...prev,
          focusLostCount: prev.focusLostCount + 1
        }));
      }, 5000); // 5 seconds
    }
    
    setCurrentDetections(prev => ({
      ...prev,
      focusStatus: 'unfocused'
    }));
    
    setTimers(prev => ({
      ...prev,
      focusLostTimer: prev.focusLostTimer + 1
    }));
  };

  const clearFocusTimeout = () => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    setTimers(prev => ({ ...prev, focusLostTimer: 0 }));
  };

  const logEvent = async (eventType, details, confidence = 1.0) => {
    try {
      const response = await axios.post(`${API}/events`, {
        session_id: sessionId,
        event_type: eventType,
        details: details,
        confidence: confidence
      });
      
      setEvents(prev => [response.data, ...prev]);
      
      // Show toast for critical events
      if (eventType === 'object_detected') {
        toast.warning(`Suspicious object detected: ${details}`);
      } else if (eventType === 'multiple_faces') {
        toast.warning("Multiple faces detected!");
      } else if (eventType === 'no_face') {
        toast.error("No face detected for extended period!");
      } else if (eventType === 'focus_lost') {
        toast.warning("Focus lost - candidate looking away!");
      }
    } catch (error) {
      console.error("Failed to log event:", error);
    }
  };

  const cleanup = () => {
    stopDetection();
    stopSessionTimer();
    clearNoFaceTimeout();
    clearFocusTimeout();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'focused': return <Eye className="w-4 h-4 text-green-600" />;
      case 'unfocused': return <EyeOff className="w-4 h-4 text-red-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'focus_lost': return <EyeOff className="w-4 h-4" />;
      case 'no_face': return <AlertTriangle className="w-4 h-4" />;
      case 'multiple_faces': return <Users className="w-4 h-4" />;
      case 'object_detected': return <Smartphone className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                Interview Session - {session.candidate_name}
              </h1>
              <p className="text-slate-600">Interviewer: {session.interviewer_name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(timers.sessionDuration)}
                </div>
                <div className="text-sm text-slate-500">Duration</div>
              </div>
              <Button
                onClick={() => navigate(`/reports/${sessionId}`)}
                variant="outline"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Report
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800">Video Feed</h2>
                <div className="flex items-center gap-2">
                  {!models.loaded && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      Loading AI Models...
                    </Badge>
                  )}
                  {models.loaded && (
                    <Badge className="bg-green-100 text-green-800">
                      AI Models Ready
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className={`video-container mb-4 ${
                currentDetections.objects.length > 0 || 
                currentDetections.faces > 1 || 
                currentDetections.faces === 0 ? 'detection-alert' : ''
              }`}>
                <video
                  ref={videoRef}
                  className="video-element"
                  autoPlay
                  muted
                  playsInline
                />
                <div className="video-overlay" />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>

              <div className="flex items-center justify-center gap-4">
                {!isRecording ? (
                  <Button onClick={startRecording} className="btn-primary" size="lg">
                    <Video className="w-5 h-5 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} className="btn-danger" size="lg">
                    <Square className="w-5 h-5 mr-2" />
                    Stop & End Session
                  </Button>
                )}
              </div>
            </Card>

            {/* Real-time Status */}
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Real-time Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`status-indicator ${
                  currentDetections.focusStatus === 'focused' ? 'status-active' : 'status-warning'
                }`}>
                  {getStatusIcon(currentDetections.focusStatus)}
                  <span>Focus: {currentDetections.focusStatus}</span>
                </div>
                
                <div className={`status-indicator ${
                  currentDetections.faces === 1 ? 'status-active' : 'status-danger'
                }`}>
                  <Users className="w-4 h-4" />
                  <span>Faces: {currentDetections.faces}</span>
                </div>
                
                <div className={`status-indicator ${
                  currentDetections.objects.length === 0 ? 'status-active' : 'status-danger'
                }`}>
                  <Smartphone className="w-4 h-4" />
                  <span>Objects: {currentDetections.objects.length}</span>
                </div>
                
                <div className="status-indicator status-active">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(timers.sessionDuration)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Detection Statistics */}
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Detection Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Focus Lost</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    {detectionStats.focusLostCount}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">No Face</span>
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    {detectionStats.noFaceCount}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Multiple Faces</span>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800">
                    {detectionStats.multipleFacesCount}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Objects Detected</span>
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    {detectionStats.objectDetectedCount}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Live Events Feed */}
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Live Events</h3>
              <div className="event-feed space-y-2">
                {events.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className={`event-item event-${event.event_type.replace('_', '-')}`}
                  >
                    <div className="flex items-start gap-3">
                      {getEventIcon(event.event_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {event.details}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {events.length === 0 && (
                  <div className="text-center py-4">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No events detected</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}