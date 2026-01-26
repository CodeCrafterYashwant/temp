// ==========================================
// 1. CONFIGURATION
// ==========================================
const API_HISTORY_URL = "https://temp-zw0w.onrender.com/attendance/history";

// ==========================================
// 2. INITIALIZATION (Runs when page loads)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("Dashboard Loaded. Initializing...");
    
    // Initialize Calendar Logic
    initCalendar();
    
    // Initialize History Logic
    loadStudentDashboardHistory();
});

// ==========================================
// 3. CALENDAR LOGIC (Arrows Fix)
// ==========================================
let currentDate = new Date();

function initCalendar() {
    const prevBtn = document.getElementById("prevMonth");
    const nextBtn = document.getElementById("nextMonth");

    // Render the calendar immediately
    renderCalendar();

    // Attach Click Listeners
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    } else {
        console.error("Error: 'prevMonth' arrow button not found in HTML.");
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    } else {
        console.error("Error: 'nextMonth' arrow button not found in HTML.");
    }
}

function renderCalendar() {
    const monthYearText = document.getElementById("currentMonthYear");
    const calendarGrid = document.getElementById("calendarGrid");

    if (!calendarGrid) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update Header Text
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (monthYearText) monthYearText.innerText = `${monthNames[month]} ${year}`;

    // Calculate Dates
    const firstDay = new Date(year, month, 1).getDay(); 
    const lastDate = new Date(year, month + 1, 0).getDate(); 
    const lastDatePrevMonth = new Date(year, month, 0).getDate(); 

    // Clear Grid
    calendarGrid.innerHTML = "";

    // 1. Previous Month Padding
    for (let i = firstDay; i > 0; i--) {
        const div = document.createElement("div");
        div.className = "calendar-date inactive";
        div.innerText = lastDatePrevMonth - i + 1;
        calendarGrid.appendChild(div);
    }

    // 2. Current Month Days
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
// 4. HISTORY LOGIC (Loading Fix)
// ==========================================
async function loadStudentDashboardHistory() {
    // Get container INSIDE function to ensure it exists
    const historyContainer = document.getElementById("recentAttendanceList");
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "../login page/login.html"; 
        return;
    }

    try {
        const response = await fetch(API_HISTORY_URL, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // Check for Session Expiry
        if (response.status === 401) {
            alert("Session Expired. Please login again.");
            localStorage.removeItem("token");
            window.location.href = "../login page/login.html";
            return;
        }

        const data = await response.json();

        if (historyContainer) {
            historyContainer.innerHTML = ""; // Clear "Loading..."

            // Check if data exists
            if (!data || data.length === 0) {
                historyContainer.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">No attendance marked yet.</p>`;
                return;
            }

            // Reverse to show newest first, then take top 5
            const recentRecords = data.reverse().slice(0, 5);

            recentRecords.forEach(record => {
                const session = record.session_id || {};
                const subject = session.class_name || session.className || "Unknown Class";
                
                // Date Formatting
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

                // Create Row
                const row = document.createElement("div");
                row.className = "history-row";
                
                // INLINE STYLES to ensure grid works even if CSS fails
                row.style.display = "grid";
                row.style.gridTemplateColumns = "1.5fr 1fr 1fr 1fr"; 
                row.style.padding = "15px";
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
        } else {
            console.error("Error: 'recentAttendanceList' container not found in HTML.");
        }

    } catch (error) {
        console.error("Dashboard Error:", error);
        if(historyContainer) {
            historyContainer.innerHTML = `<p style="text-align:center; color:red; padding:20px;">Failed to load history.</p>`;
        }
    }
}