const express = require('express');
const router = express.Router();
const Session = require('../models/session'); 
const Attendance = require('../models/attendance');
const User = require('../models/user');
const { jwtAuthMiddleware } = require('../jwt');

// --- Helper Functions ---

const checkFacultyRole = async (userID) => {
    try {
        const user = await User.findById(userID);
        return user.role === 'faculty';
    } catch (error) {
        return false;
    }
}

// Haversine Formula for Distance (in Meters)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; 
}


// --- Routes ---

// 1. CREATE SESSION (Faculty Only)
router.post('/create_session', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!(await checkFacultyRole(req.user.id))) {
            return res.status(403).json({ message: "Access Denied" });
        }

        const { latitude, longitude } = req.body;
        
        // 1. Fetch Faculty Details to store in Session
        const faculty = await User.findById(req.user.id);

        const generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

        const newSession = new Session({
            creator_id: faculty._id,
            creator_name: faculty.name,   // <--- Save Name
            creator_email: faculty.email, // <--- Save Email
            otp: generatedOTP,
            center_location: { latitude, longitude }
        });

        const response = await newSession.save();
        
        res.status(200).json({ 
            message: 'Session Started', 
            otp: generatedOTP, 
            sessionId: response._id 
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// 2. MARK ATTENDANCE (Student)
router.post('/mark', jwtAuthMiddleware, async (req, res) => {
    try {
        const { sessionId, otp, latitude, longitude } = req.body;
        const studentId = req.user.id;

        // --- 1. INPUT VALIDATION ---
        // Ensure GPS coordinates are provided and valid
        if (!latitude || !longitude) {
            return res.status(400).json({ 
                message: "GPS missing. Ensure body has 'latitude' and 'longitude' (lowercase)." 
            });
        }

        // --- 2. FETCH DATA ---
        // Find the Session
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Find the Student (To get Name & Email for the list)
        const studentUser = await User.findById(studentId);
        if (!studentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // --- 3. CHECK TIME (30 Seconds Window) ---
        const timeDifference = Date.now() - session.createdAt;
        if (timeDifference > 30000) { 
            return res.status(400).json({ message: 'Session Expired (Time limit exceeded)' });
        }

        // --- 4. CHECK OTP ---
        if (session.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // --- 5. CHECK DUPLICATE ---
        // Check if student ID is already inside the 'attendees' array
        const isAlreadyPresent = session.attendees.some(
            (record) => record.student_id.toString() === studentId
        );

        if (isAlreadyPresent) {
            return res.status(400).json({ message: 'You have already marked attendance.' });
        }

        // --- 6. CHECK LOCATION ---
        // Force conversion to Numbers to avoid crashes
        const lat1 = parseFloat(session.center_location.latitude);
        const lon1 = parseFloat(session.center_location.longitude);
        const lat2 = parseFloat(latitude);
        const lon2 = parseFloat(longitude);

        // Calculate Distance
        const distance = getDistance(lat1, lon1, lat2, lon2);

        // Safety: If calculation failed (NaN), reject it
        if (isNaN(distance)) {
            return res.status(400).json({ message: "Invalid GPS data format." });
        }

        // The Limit: 20 Meters
        if (distance > 50) {
            return res.status(403).json({ 
                message: `Location Mismatch. You are ${Math.round(distance)} meters away.` 
            });
        }

        // --- 7. SAVE DATA (Success) ---

        // A. Add to Session "Live List"
        session.attendees.push({
            student_id: studentId,
            name: studentUser.name,
            email: studentUser.email,
            location: { latitude: lat2, longitude: lon2 }
        });

        // B. Update Count
        session.total_present += 1;
        await session.save(); // Save the Session updates

        // C. Create Permanent Attendance Record (For History)
        const newAttendance = new Attendance({
            student_id: studentId,
            session_id: sessionId,
            status: 'Present'
        });
        await newAttendance.save();

        console.log(`Success: ${studentUser.name} marked present.`);
        res.status(200).json({ message: 'Attendance Marked Successfully' });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// 3. GET HISTORY (Student)
router.get('/history', jwtAuthMiddleware, async (req, res) => {
    try {
        // Populate 'session_id' to show the Date of that session
        const history = await Attendance.find({ student_id: req.user.id }).populate('session_id');
        res.status(200).json(history);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//how many students are present in session(Faculty)
router.get('/report/:sessionId', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!(await checkFacultyRole(req.user.id))) {
            return res.status(403).json({ message: "Access Denied" });
        }
        const { sessionId } = req.params;

        // 1. Check if the user is a Faculty (Optional security)
        // If you want strictly only the creator to see it:
        // const session = await Session.findOne({ _id: sessionId, creator_id: req.user.id });
        
        // For now, let's allow any authorized faculty to view it:
        const session = await Session.findById(sessionId);

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // 2. Filter the data to show ONLY Names
        // We map the 'attendees' array to return just a list of names
        const studentNames = session.attendees.map(student => student.name);

        // 3. Send the clean response
        res.status(200).json({
            total_students: session.total_present,
            present_list: studentNames
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;