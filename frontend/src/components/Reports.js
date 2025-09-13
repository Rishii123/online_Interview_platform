import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import {
  ArrowLeft,
  Download,
  FileText,
  User,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Users,
  Smartphone,
  Activity,
  BarChart3,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Reports() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/reports/${sessionId}`);
      setReport(response.data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
      toast.error("Failed to load report");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startTime, endTime) => {
    if (!endTime) return "Ongoing";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end - start) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getIntegrityColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getIntegrityBadge = (score) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
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

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'focus_lost': return "bg-yellow-100 text-yellow-800";
      case 'no_face': return "bg-red-100 text-red-800";
      case 'multiple_faces': return "bg-purple-100 text-purple-800";
      case 'object_detected': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const exportReport = () => {
    if (!report) return;

    const reportData = {
      session: report.session,
      summary: report.summary,
      events: report.events,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json"
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-report-${report.session.candidate_name}-${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Report exported successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Report Not Found</h2>
          <p className="text-slate-600 mb-4">The requested interview report could not be loaded.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { session, events, summary } = report;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button onClick={exportReport} className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
          
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Interview Proctoring Report
              </h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600">Candidate: </span>
                <span className="font-semibold text-slate-800">{session.candidate_name}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600">Interviewer: </span>
                <span className="font-semibold text-slate-800">{session.interviewer_name}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600">Date: </span>
                <span className="font-semibold text-slate-800">{formatDate(session.start_time)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className={`stat-number ${getIntegrityColor(session.integrity_score)}`}>
                  {session.integrity_score.toFixed(1)}%
                </div>
                <div className="stat-label">Integrity Score</div>
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="stat-number text-green-600">
                  {formatDuration(session.start_time, session.end_time)}
                </div>
                <div className="stat-label">Duration</div>
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="stat-number text-orange-600">{summary.total_events}</div>
                <div className="stat-label">Total Events</div>
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className={`stat-number ${session.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}>
                  {session.status}
                </div>
                <div className="stat-label">Status</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Breakdown */}
          <Card className="glass-card p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Event Breakdown
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <EyeOff className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-slate-800">Focus Lost</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: `${summary.total_events > 0 ? (summary.focus_lost_count / summary.total_events) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {summary.focus_lost_count}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-slate-800">No Face Detected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${summary.total_events > 0 ? (summary.no_face_count / summary.total_events) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <Badge className="bg-red-100 text-red-800">
                    {summary.no_face_count}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-slate-800">Multiple Faces</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${summary.total_events > 0 ? (summary.multiple_faces_count / summary.total_events) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    {summary.multiple_faces_count}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-slate-800">Suspicious Objects</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${summary.total_events > 0 ? (summary.object_detected_count / summary.total_events) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <Badge className="bg-red-100 text-red-800">
                    {summary.object_detected_count}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Integrity Score Visualization */}
            <div className="mt-6 p-4 bg-white/70 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-800">Overall Integrity Score</span>
                <span className={`font-bold text-2xl ${getIntegrityColor(session.integrity_score)}`}>
                  {session.integrity_score.toFixed(1)}%
                </span>
              </div>
              <Progress value={session.integrity_score} className="h-3" />
              <p className="text-sm text-slate-600 mt-2">
                {session.integrity_score >= 90 
                  ? "Excellent - High integrity maintained throughout the interview"
                  : session.integrity_score >= 70 
                  ? "Good - Minor integrity issues detected"
                  : "Poor - Multiple integrity violations detected"
                }
              </p>
            </div>
          </Card>

          {/* Detected Objects */}
          <Card className="glass-card p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Detected Objects
            </h3>
            
            {summary.detected_objects.length > 0 ? (
              <div className="space-y-3">
                {Array.from(new Set(summary.detected_objects)).map((object, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-800">{object}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h4 className="font-medium text-slate-800 mb-1">No Suspicious Objects</h4>
                <p className="text-sm text-slate-600">No unauthorized items were detected during the interview</p>
              </div>
            )}

            <Separator className="my-6" />

            {/* Recommendations */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Recommendations</h4>
              <div className="space-y-2">
                {session.integrity_score < 70 && (
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                    <p className="text-sm text-red-800">
                      <strong>High Risk:</strong> Multiple violations detected. Consider additional verification or re-interview.
                    </p>
                  </div>
                )}
                {session.integrity_score >= 70 && session.integrity_score < 90 && (
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Moderate Risk:</strong> Some issues detected. Review event timeline carefully.
                    </p>
                  </div>
                )}
                {session.integrity_score >= 90 && (
                  <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                    <p className="text-sm text-green-800">
                      <strong>Low Risk:</strong> Interview conducted with high integrity. Candidate followed guidelines well.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Event Timeline */}
        <Card className="glass-card p-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Event Timeline
          </h3>
          
          {events.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-4 p-4 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getEventColor(event.event_type)}>
                        {event.event_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{event.details}</p>
                    {event.confidence < 1.0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Confidence: {(event.confidence * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h4 className="font-medium text-slate-800 mb-1">No Events Detected</h4>
              <p className="text-sm text-slate-600">The interview was conducted without any detected violations</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}