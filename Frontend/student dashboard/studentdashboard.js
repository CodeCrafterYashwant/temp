// ==========================================
// CONFIGURATION
// ==========================================
const API_HISTORY_URL = "https://temp-zw0w.onrender.com/attendance/history";
const historyContainer = document.getElementById("recentAttendanceList");

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load History
    loadStudentDashboardHistory();
    
    // 2. Initialize Calendar (Fixes Arrows)
    initCalendar(); 
});

// ==========================================
// PART 1: CALENDAR LOGIC (The Fix)
// ==========================================
let currentDate = new Date();

function initCalendar() {
    const prevMonthBtn = document.getElementById("prevMonth");
    const nextMonthBtn = document.getElementById("nextMonth");

    // Render immediately so the calendar appears on load
    renderCalendar();

    // Attach Event Listeners safely
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    } else {
        console.warn("Previous Month button not found in HTML");
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    } else {
        console.warn("Next Month button not found in HTML");
    }
}

function renderCalendar() {
    const monthYearText = document.getElementById("currentMonthYear");
    const calendarGrid = document.getElementById("calendarGrid");

    if (!calendarGrid) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update Header Text (e.g., "January 2026")
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (monthYearText) monthYearText.innerText = `${monthNames[month]} ${year}`;

    // Calculate Date Offsets
    const firstDay = new Date(year, month, 1).getDay(); // Day of week (0-6)
    const lastDate = new Date(year, month + 1, 0).getDate(); // Days in current month
    const lastDatePrevMonth = new Date(year, month, 0).getDate(); // Days in prev month

    // Clear previous grid
    calendarGrid.innerHTML = "";

    // Render Previous Month Padding (Inactive Days)
    for (let i = firstDay; i > 0; i--) {
        const div = document.createElement("div");
        div.className = "calendar-date inactive";
        div.innerText = lastDatePrevMonth - i + 1;
        calendarGrid.appendChild(div);
    }

    // Render Current Month Days
    const today = new Date();
    for (let i = 1; i <= lastDate; i++) {
        const div = document.createElement("div");
        div.className = "calendar-date";
        div.innerText = i;

        // Highlight Today
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            div.classList.add("today");
        }
        calendarGrid.appendChild(div);
    }
}

// ==========================================
// PART 2: HISTORY LOGIC (Your Existing Code)
// ==========================================
async function loadStudentDashboardHistory() {
    const token = localStorage.getItem("token");

    // 1. Check if token exists locally
    if (!token) {
        window.location.href = "../index.html"; // Redirect if missing
        return;
    }

    try {
        // 2. Fetch Data from Backend
        const response = await fetch(API_HISTORY_URL, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // 3. Handle Token Expiry (401 Unauthorized)
        if (response.status === 401) {
            alert("Session Expired. Please login again.");
            localStorage.removeItem("token");
            window.location.href = "../index.html";
            return;
        }

        const data = await response.json();

        // Clear "Loading..." text
        if (historyContainer) historyContainer.innerHTML = "";

        // 4. Handle Empty Data
        if (!data || data.length === 0) {
            if (historyContainer) historyContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">No attendance marked yet.</p>`;
            return;
        }

        // 5. Sort & Slice (Latest 5 records)
        const recentRecords = data.reverse().slice(0, 5);

        // 6. Generate Rows
        recentRecords.forEach(record => {
            const session = record.session_id || {};
            
            // Safe Data Handling
            const subject = session.class_name || session.className || "Unknown Class";
            
            // Date Parsing
            const rawDate = record.createdAt || record.timestamp || session.createdAt;
            let dateStr = "N/A";
            let timeStr = "--:--";

            if (rawDate) {
                const dateObj = new Date(rawDate);
                if (!isNaN(dateObj.getTime())) {
                    dateStr = dateObj.toLocaleDateString();
                    timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
            }

            // Create Row Element
            const row = document.createElement("div");
            row.className = "history-row";
            
            // Apply Grid Styles
            row.style.display = "grid";
            row.style.gridTemplateColumns = "1.5fr 1fr 1fr 1fr";
            row.style.padding = "12px 15px";
            row.style.borderBottom = "1px solid #eee";
            row.style.alignItems = "center";
            row.style.fontSize = "0.9rem";

            row.innerHTML = `
                <span style="font-weight:600; color:#1f3c88;">${subject}</span>
                <span style="color:#555;">${dateStr}</span>
                <span style="color:#555;">${timeStr}</span>
                <span>
                    <span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">
                        Present
                    </span>
                </span>
            `;

            if (historyContainer) historyContainer.appendChild(row);
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        if (historyContainer) historyContainer.innerHTML = `<p style="text-align:center; color:red; padding:20px;">Failed to load history.</p>`;
    }
}