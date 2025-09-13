import requests
import sys
import json
from datetime import datetime

class VideoProctoringAPITester:
    def __init__(self, base_url="https://focusdetect.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_create_session(self):
        """Test creating a new interview session"""
        test_data = {
            "candidate_name": "John Doe",
            "interviewer_name": "Jane Smith"
        }
        
        success, response = self.run_test(
            "Create Interview Session",
            "POST",
            "sessions",
            200,
            data=test_data
        )
        
        if success and 'id' in response:
            self.session_id = response['id']
            print(f"   Session ID: {self.session_id}")
            
            # Verify required fields
            required_fields = ['id', 'candidate_name', 'interviewer_name', 'start_time', 'status', 'integrity_score']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False
            
            # Verify field values
            if response['candidate_name'] != test_data['candidate_name']:
                print(f"❌ Candidate name mismatch")
                return False
            if response['interviewer_name'] != test_data['interviewer_name']:
                print(f"❌ Interviewer name mismatch")
                return False
            if response['status'] != 'active':
                print(f"❌ Expected status 'active', got '{response['status']}'")
                return False
            if response['integrity_score'] != 100.0:
                print(f"❌ Expected integrity_score 100.0, got {response['integrity_score']}")
                return False
                
        return success

    def test_get_sessions(self):
        """Test retrieving all sessions"""
        success, response = self.run_test(
            "Get All Sessions",
            "GET",
            "sessions",
            200
        )
        
        if success:
            if not isinstance(response, list):
                print(f"❌ Expected list, got {type(response)}")
                return False
            if len(response) == 0:
                print("⚠️  No sessions found (this might be expected)")
            else:
                print(f"   Found {len(response)} sessions")
                
        return success

    def test_get_session_by_id(self):
        """Test retrieving a specific session"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Session by ID",
            "GET",
            f"sessions/{self.session_id}",
            200
        )
        
        if success:
            if response.get('id') != self.session_id:
                print(f"❌ Session ID mismatch")
                return False
                
        return success

    def test_create_event(self):
        """Test creating detection events"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        # Test different event types
        test_events = [
            {
                "session_id": self.session_id,
                "event_type": "focus_lost",
                "details": "Candidate looking away from screen",
                "confidence": 0.85
            },
            {
                "session_id": self.session_id,
                "event_type": "object_detected",
                "details": "Cell phone detected with 92.3% confidence",
                "confidence": 0.923
            },
            {
                "session_id": self.session_id,
                "event_type": "no_face",
                "details": "No face detected for more than 10 seconds",
                "confidence": 1.0
            }
        ]
        
        all_success = True
        for i, event_data in enumerate(test_events):
            success, response = self.run_test(
                f"Create Event {i+1} ({event_data['event_type']})",
                "POST",
                "events",
                200,
                data=event_data
            )
            
            if success:
                # Verify required fields
                required_fields = ['id', 'session_id', 'event_type', 'details', 'confidence', 'timestamp']
                for field in required_fields:
                    if field not in response:
                        print(f"❌ Missing required field: {field}")
                        all_success = False
                        
                # Verify field values
                if response['session_id'] != event_data['session_id']:
                    print(f"❌ Session ID mismatch")
                    all_success = False
                if response['event_type'] != event_data['event_type']:
                    print(f"❌ Event type mismatch")
                    all_success = False
            else:
                all_success = False
                
        return all_success

    def test_get_events(self):
        """Test retrieving events for a session"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Session Events",
            "GET",
            f"events/{self.session_id}",
            200
        )
        
        if success:
            if not isinstance(response, list):
                print(f"❌ Expected list, got {type(response)}")
                return False
            print(f"   Found {len(response)} events for session")
            
        return success

    def test_end_session(self):
        """Test ending a session"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        success, response = self.run_test(
            "End Session",
            "PUT",
            f"sessions/{self.session_id}/end",
            200
        )
        
        if success:
            if 'message' not in response:
                print(f"❌ Missing success message")
                return False
            if 'integrity_score' not in response:
                print(f"❌ Missing integrity score")
                return False
            print(f"   Final integrity score: {response['integrity_score']}")
            
        return success

    def test_get_report(self):
        """Test generating a report"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Session Report",
            "GET",
            f"reports/{self.session_id}",
            200
        )
        
        if success:
            # Verify report structure
            required_fields = ['session', 'events', 'summary']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False
                    
            # Verify summary structure
            summary = response['summary']
            summary_fields = ['total_events', 'focus_lost_count', 'no_face_count', 
                            'multiple_faces_count', 'object_detected_count', 'detected_objects', 'timeline']
            for field in summary_fields:
                if field not in summary:
                    print(f"❌ Missing summary field: {field}")
                    return False
                    
            print(f"   Report generated with {summary['total_events']} events")
            
        return success

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test create status
        test_data = {"client_name": "test_client"}
        success1, response1 = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data=test_data
        )
        
        # Test get status
        success2, response2 = self.run_test(
            "Get Status Checks",
            "GET",
            "status",
            200
        )
        
        return success1 and success2

    def test_error_cases(self):
        """Test error handling"""
        print("\n🔍 Testing Error Cases...")
        
        # Test invalid session ID
        success1, _ = self.run_test(
            "Get Invalid Session",
            "GET",
            "sessions/invalid-id",
            404
        )
        
        # Test invalid event creation
        invalid_event = {
            "session_id": "invalid-id",
            "event_type": "invalid_type",
            "details": "test",
            "confidence": 1.0
        }
        success2, _ = self.run_test(
            "Create Event with Invalid Session",
            "POST",
            "events",
            200,  # This might still succeed depending on validation
            data=invalid_event
        )
        
        # Test invalid report
        success3, _ = self.run_test(
            "Get Invalid Report",
            "GET",
            "reports/invalid-id",
            404
        )
        
        return success1 and success3  # success2 might be expected to pass

def main():
    print("🚀 Starting Video Proctoring API Tests")
    print("=" * 50)
    
    tester = VideoProctoringAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic API tests
    test_results.append(tester.test_root_endpoint())
    test_results.append(tester.test_status_endpoints())
    
    # Session management tests
    test_results.append(tester.test_create_session())
    test_results.append(tester.test_get_sessions())
    test_results.append(tester.test_get_session_by_id())
    
    # Event management tests
    test_results.append(tester.test_create_event())
    test_results.append(tester.test_get_events())
    
    # Session completion tests
    test_results.append(tester.test_end_session())
    test_results.append(tester.test_get_report())
    
    # Error handling tests
    test_results.append(tester.test_error_cases())
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())