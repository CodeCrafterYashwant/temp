const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    // --- 1. Creator Info (Expanded) ---
    creator_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    creator_name: { type: String },  // <--- NEW
    creator_email: { type: String }, // <--- NEW

    // --- 2. Session Rules ---
    otp: { type: String, required: true },
    center_location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    createdAt: { type: Date, default: Date.now },

    // --- 3. Live Attendance Data (NEW) ---
    attendees: [{
        student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        email: { type: String },
        location: { // Student's location when they marked present
            latitude: Number,
            longitude: Number
        },
        timestamp: { type: Date, default: Date.now }
    }],
    
    total_present: {
        type: Number,
        default: 0
    }
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;