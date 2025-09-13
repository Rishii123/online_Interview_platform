import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { 
  Video, 
  Users, 
  FileText, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Play,
  BarChart3,
  User,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState("");
  const [interviewerName, setInterviewerName] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const startNewInterview = async () => {
    if (!candidateName.trim() || !interviewerName.trim()) {
      toast.error("Please enter both candidate and interviewer names");
      return;
    }

    try {
      const response = await axios.post(`${API}/sessions`, {
        candidate_name: candidateName,
        interviewer_name: interviewerName
      });

      toast.success("Interview session created successfully!");
      navigate(`/interview/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error("Failed to create interview session");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      interrupted: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={variants[status] || variants.active}>
        {status}
      </Badge>
    );
  };

  const getIntegrityColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Video Proctoring System
            </h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Advanced AI-powered interview monitoring with real-time focus and object detection
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 slide-up">
          <Card className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="stat-number text-blue-600">{sessions.length}</div>
                <div className="stat-label">Total Sessions</div>
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="stat-number text-green-600">
                  {sessions.filter(s => s.status === 'completed').length}
                </div>
                <div className="stat-label">Completed</div>
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="stat-number text-orange-600">
                  {sessions.filter(s => s.status === 'active').length}
                </div>
                <div className="stat-label">Active</div>
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="stat-number text-purple-600">
                  {sessions.length > 0 
                    ? Math.round(sessions.reduce((acc, s) => acc + s.integrity_score, 0) / sessions.length)
                    : 0
                  }%
                </div>
                <div className="stat-label">Avg Integrity</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Start New Interview */}
        <Card className="glass-card p-8 slide-up">
          <div className="flex items-center gap-3 mb-6">
            <Play className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-800">Start New Interview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="candidate" className="text-sm font-medium text-slate-700">
                Candidate Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="candidate"
                  placeholder="Enter candidate name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="pl-10 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interviewer" className="text-sm font-medium text-slate-700">
                Interviewer Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="interviewer"
                  placeholder="Enter interviewer name"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="pl-10 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <Button 
            onClick={startNewInterview}
            className="btn-primary w-full md:w-auto"
            size="lg"
          >
            <Video className="w-5 h-5 mr-2" />
            Start Interview Session
          </Button>
        </Card>

        {/* Recent Sessions */}
        <Card className="glass-card p-8 slide-up">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-slate-600" />
              <h2 className="text-2xl font-bold text-slate-800">Recent Sessions</h2>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No interviews yet</h3>
              <p className="text-slate-500">Start your first interview session to see it here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.slice(0, 10).map((session) => (
                <div key={session.id} className="p-4 border border-slate-200 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-slate-800">{session.candidate_name}</h3>
                        {getStatusBadge(session.status)}
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.start_time)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>Interviewer: {session.interviewer_name}</span>
                        <span>Events: {session.total_events}</span>
                        <span className={`font-medium ${getIntegrityColor(session.integrity_score)}`}>
                          Integrity: {session.integrity_score.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.status === 'active' && (
                        <Button
                          onClick={() => navigate(`/interview/${session.id}`)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Continue
                        </Button>
                      )}
                      <Button
                        onClick={() => navigate(`/reports/${session.id}`)}
                        variant="outline"
                        size="sm"
                      >
                        View Report
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}