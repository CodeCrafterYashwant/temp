// ==========================================
// CONFIGURATION
// ==========================================
const API_HISTORY_URL = "https://temp-zw0w.onrender.com/attendance/history";
const historyContainer = document.getElementById("recentAttendanceList");

// ==========================================
// CALENDAR ELEMENTS
// ==========================================
const monthYearText = document.getElementById("currentMonthYear");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

let currentDate = new Date();

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadStudentDashboardHistory();
    renderCalendar(); // Load Calendar
});

// ==========================================
// 1. CALENDAR LOGIC (Interactive)
// ==========================================
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if(monthYearText) monthYearText.innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay(); 
    const lastDate = new Date(year, month + 1, 0).getDate();
    const lastDatePrevMonth = new Date(year, month, 0).getDate();

    if(!calendarGrid) return;
    calendarGrid.innerHTML = "";

    // Prev Month Padding
    for (let i = firstDay; i > 0; i--) {
        const div = document.createElement("div");
        div.className = "calendar-date inactive";
        div.innerText = lastDatePrevMonth - i + 1;
        calendarGrid.appendChild(div);
    }

    // Current Month
    const today = new Date();
    for (let i = 1; i <= lastDate; i++) {
        const div = document.createElement("div");
        div.className = "calendar-date";
        div.innerText = i;

        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            div.classList.add("today");
        }
        calendarGrid.appendChild(div);
    }
}

// Button Listeners
if(prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
}

if(nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}


// ==========================================
// 2. LOAD HISTORY LOGIC
// ==========================================
async function loadStudentDashboardHistory() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "../login page/login.html"; 
        return;
    }

    try {
        const response = await fetch(API_HISTORY_URL, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // 401 Check
        if (response.status === 401) {
            alert("Session Expired. Please login again.");
            localStorage.removeItem("token");
            window.location.href = "../login page/login.html";
            return;
        }

        const data = await response.json();
        historyContainer.innerHTML = "";

        if (!data || data.length === 0) {
            historyContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">No attendance marked yet.</p>`;
            return;
        }

        const recentRecords = data.reverse().slice(0, 5);

        recentRecords.forEach(record => {
            const session = record.session_id || {};
            const subject = session.class_name || session.className || "Unknown Class";
            
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

            const row = document.createElement("div");
            row.className = "history-row";
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

            historyContainer.appendChild(row);
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        historyContainer.innerHTML = `<p style="text-align:center; color:red; padding:20px;">Failed to load history.</p>`;
    }
}