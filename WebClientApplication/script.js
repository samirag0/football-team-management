/* API CONFIGURATION - Stores all backend REST API endpoint URLs used by the frontend. */

const API_URL = "http://localhost:3000/api/players";
const TEAMS_API_URL = "http://localhost:3000/api/teams";
const MATCHES_API_URL = "http://localhost:3000/api/matches";
const DASHBOARD_API_URL = "http://localhost:3000/api/dashboard/stats";
const LEAGUE_API_URL = "http://localhost:3000/api/league-table";
const NEWS_API_URL = "http://localhost:3000/api/news";
const PLAYER_STATS_API_URL = "http://localhost:3000/api/player-stats";
const USERS_API_URL = "http://localhost:3000/api/users";

/* GLOBAL STATE - Stores API data locally so it can be reused for searching, filtering,
   editing and dynamic rendering without repeatedly requesting the same data. */

let allPlayers = [];
let allMatches = [];
let allPlayerStats = [];
let allTeams = [];
let allMatchGoals = [];
let pendingGoalEvents = [];

/* AUTHENTICATION AND ROLE CONTROL - Checks the logged-in user and controls access to admin-only pages/features. */

const getEl = (id) => document.getElementById(id);
const user = JSON.parse(localStorage.getItem("user"));
const isAdmin = user && user.role === "admin";

// Protect pages
if (!user && !window.location.pathname.includes("index.html")) {
  window.location.href = "index.html";
}

const currentPage = window.location.pathname;

const adminPages = [
  "dashboard.html",
];

if (user && !isAdmin) {
  const tryingToAccessAdminPage = adminPages.some((page) =>
    currentPage.includes(page)
  );

  if (tryingToAccessAdminPage) {
    window.location.href = "league-table.html";
  }
}

// Builds request headers with the JWT token for protected API routes
function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/* USER MANAGEMENT - Handles loading, creating and deleting user accounts.*/
async function fetchUsers() {
  const tableBody = getEl("usersTableBody");
  if (!tableBody) return;

  try {
    const res = await fetch(USERS_API_URL, {
      headers: authHeaders(),
    });

    const users = await res.json();

    if (!res.ok) throw new Error(users.error || "Failed to load users");

    tableBody.innerHTML = "";

    if (!users || users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">No users found.</td>
        </tr>
      `;
      return;
    }

    users.forEach((user) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${user.user_id}</td>
        <td><strong>${user.username}</strong></td>

        <td>${user.email || "Not set"}</td>

        <td>
          <span class="role-pill role-${user.role}">
            ${user.role}
          </span>
        </td>
        <td>
          <button class="delete-btn" onclick="deleteUser(${user.user_id})">
            Delete
          </button>
        </td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Users error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Unable to load users.</td>
      </tr>
    `;
  }
}

/* Create a new user account, hash the password securely and send login credentials via email */
async function addUser() {
  const username = getEl("newUsername")?.value.trim();
  const password = getEl("newPassword")?.value.trim();
  const email = getEl("newEmail")?.value.trim();
  const role = getEl("newRole")?.value;

  if (!username || !email || !password || !role) {
    alert("Please fill in all user fields.");
    return;
  }

  try {
    const res = await fetch(USERS_API_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ username, email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to create user");

    getEl("newUsername").value = "";
    getEl("newEmail").value = "";
    getEl("newPassword").value = "";
    getEl("newRole").value = "guest";

    await fetchUsers();

    alert("User created successfully.");
  } catch (error) {
    console.error("Add user error:", error);
    alert(error.message || "Could not create user.");
  }
}

/* Delete a user account from the system using the selected user ID */
async function deleteUser(id) {
  const loggedInUser =
    JSON.parse(localStorage.getItem("loggedInUser")) ||
    JSON.parse(localStorage.getItem("user"));

  console.log("DELETE CHECK:", loggedInUser);

  if (!loggedInUser || loggedInUser.role !== "admin") {
    alert("Access denied. Only admins can delete users.");
    return;
  }

  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const res = await fetch(`${USERS_API_URL}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to delete user");

    await fetchUsers();

    alert("User deleted successfully.");
  } catch (error) {
    console.error("Delete user error:", error);
    alert(error.message || "Could not delete user.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser =
    JSON.parse(localStorage.getItem("loggedInUser")) ||
    JSON.parse(localStorage.getItem("user"));

  const isAdmin = loggedInUser && loggedInUser.role === "admin";

  document.querySelectorAll(".admin-nav").forEach(link => {
    link.style.display = isAdmin ? "block" : "none";
  });
});

// Logout - Session Management
function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Hide admin-only elements
function applyRolePermissions() {
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = isAdmin ? "" : "none";
  });
}

// Team suggestions
function loadTeamSuggestions() {
  const dataList = getEl("teamSuggestions");
  if (!dataList || typeof womenTeams === "undefined") return;

  dataList.innerHTML = "";

  womenTeams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team;
    dataList.appendChild(option);
  });
}

/* PLAYER MANAGEMENT - Handles player CRUD, player display, search, previews and statistics refresh. */
async function fetchPlayers() {
  const playerList = getEl("playerList");
  const totalPlayers = getEl("totalPlayers");
  const averageAge = getEl("averageAge");
  const totalTeams = getEl("totalTeams");

  if (!playerList && !totalPlayers && !averageAge && !totalTeams) return;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch players");

    const players = await res.json();
    allPlayers = players;

    displayPlayers(players);
    updateStats(players);
    displayRecentPlayers(players);
  } catch (error) {
    console.error("Error fetching players:", error);

    if (playerList) {
      playerList.innerHTML = `<li class="error-message">Unable to load players right now.</li>`;
    }
  }
}

// Display players
function displayPlayers(players) {
  const list = getEl("playerList");
  if (!list) return;

  list.innerHTML = "";

  if (!players || players.length === 0) {
    list.innerHTML = `<li class="empty-message">No players found.</li>`;
    return;
  }

  players.forEach((player) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <div class="player-card-content new-player-layout">

        <div class="player-image-area">
          ${
            player.profile_image
              ? `
                <img 
                  src="${player.profile_image}" 
                  alt="${player.player_name}" 
                  class="player-card-image"
                >
              `
              : `
                <div class="player-placeholder">
                  ${getInitials(player.player_name)}
                </div>
              `
          }
        </div>

        <div class="player-card-main">
          <h3>${player.player_name}</h3>

          <div class="player-meta new-player-meta">
            <span>Age: ${player.age}</span>
            <span>Position: ${player.position}</span>
          </div>

          <div class="player-team-line">
            Team: ${player.team_name}
          </div>
        </div>

        ${
          isAdmin
            ? `
            <div class="player-actions-right">
              <button class="edit-btn" onclick="editPlayer(${player.player_id})">Edit</button>
              <button class="delete-btn" onclick="deletePlayer(${player.player_id})">Delete</button>
            </div>
          `
            : ""
        }

      </div>
    `;

    list.appendChild(li);
  });
}

// Recent players
function displayRecentPlayers(players) {
  const list = getEl("recentPlayersList");
  if (!list) return;

  list.innerHTML = "";

  if (!players || players.length === 0) {
    list.innerHTML = `<li class="empty-message">No recent players found.</li>`;
    return;
  }

  const recentPlayers = [...players].slice(-3).reverse();

  recentPlayers.forEach((player) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="player-info">
        <strong>${player.player_name}</strong>
        <div class="player-meta">
          <span>${player.position}</span>
          <span>${player.team_name}</span>
        </div>
      </div>
    `;
    list.appendChild(li);
  });
}

// Add player
async function addPlayer() {
  if (!isAdmin) {
    alert("Only admin users can add players.");
    return;
  }

  const player_name = getEl("name")?.value.trim();
  const age = getEl("age")?.value.trim();
  const position = getEl("position")?.value.trim();
  const team_name = getEl("team_name")?.value.trim();
  const profile_image = getEl("profile_image").value.trim();

  if (!player_name || !age || !position || !team_name) {
    alert("Please fill in all fields.");
    return;
  }

  if (Number(age) <= 0 || Number.isNaN(Number(age))) {
    alert("Please enter a valid age.");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        player_name,
        age: Number(age),
        position,
        team_name,
        profile_image,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add player");

    clearForm();
    resetFormMode();

    if (getEl("profile_image")) {
      getEl("profile_image").value = "";
    }

    if (getEl("playerImagePreview")) {
      getEl("playerImagePreview").src = "";
      getEl("playerImagePreview").style.display = "none";
    }
    
    await fetchPlayers();
    await fetchTeams();
    await fetchPlayerStats();
    alert("Player added successfully.");

  } catch (error) {
    console.error("Error adding player:", error);
    alert(error.message || "Could not add player.");
  }
}

// Delete player
async function deletePlayer(id) {
  if (!isAdmin) {
    alert("Only admin users can delete players.");
    return;
  }

  if (!confirm("Are you sure you want to delete this player?")) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, {method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || data.message || "Failed to delete player");

    await fetchPlayers();
    await fetchTeams();
    await fetchPlayerStats();
    alert("Player deleted successfully.");

  } catch (error) {
    console.error("Error deleting player:", error);
    alert(error.message || "Could not delete player.");
  }
}

// Save player
async function savePlayer() {
  if (!isAdmin) {
    alert("Only admin users can save players.");
    return;
  }

  const editPlayerId = getEl("editPlayerId");
  if (!editPlayerId) return;

  if (editPlayerId.value) {
    await updatePlayer(editPlayerId.value);
  } else {
    await addPlayer();
  }
}

// Edit player
function editPlayer(id) {
  if (!isAdmin) {
    alert("Only admin users can edit players.");
    return;
  }

  const player = allPlayers.find((p) => p.player_id === id);
  if (!player) return alert("Player not found.");

  getEl("editPlayerId").value = player.player_id;
  getEl("name").value = player.player_name;
  getEl("age").value = player.age;
  getEl("position").value = player.position;
  getEl("team_name").value = player.team_name;

  getEl("submitPlayerBtn").textContent = "Update Player";
  getEl("cancelEditBtn").style.display = "block";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Update player
async function updatePlayer(id) {
  if (!isAdmin) {
    alert("Only admin users can update players.");
    return;
  }

  const player_name = getEl("name")?.value.trim();
  const age = getEl("age")?.value.trim();
  const position = getEl("position")?.value.trim();
  const team_name = getEl("team_name")?.value.trim();
  const profile_image = getEl("profile_image").value.trim();
  

  if (!player_name || !age || !position || !team_name) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        player_name,
        age: Number(age),
        position,
        team_name,
        profile_image,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Failed to update player");

    clearForm();
    resetFormMode();

    await fetchPlayers();
    await fetchTeams();
    await fetchPlayerStats();
    alert("Player updated successfully.");

  } catch (error) {
    console.error("Error updating player:", error);
    alert(error.message || "Could not update player.");
  }
}

// Canceling any edits
function cancelEdit() {
  clearForm();
  resetFormMode();
}

// Reset the form back to add mode after editing is completed or cancelled
function resetFormMode() {
  if (getEl("editPlayerId")) getEl("editPlayerId").value = "";
  if (getEl("submitPlayerBtn")) getEl("submitPlayerBtn").textContent = "Add Player";
  if (getEl("cancelEditBtn")) getEl("cancelEditBtn").style.display = "none";
}

// Clear all form input fields and reset preview content
function clearForm() {
  getEl("name").value = "";
  getEl("age").value = "";
  getEl("position").value = "";
  getEl("team_name").value = "";
  getEl("editPlayerId").value = "";

  if (getEl("profile_image")) {
    getEl("profile_image").value = "";
  }

  if (getEl("playerImagePreview")) {
    getEl("playerImagePreview").src = "";
    getEl("playerImagePreview").style.display = "none";
  }
}

/* TEAM MANAGEMENT - Handles team CRUD, badge previews, squad panels and stadium location maps.*/
async function saveTeam() {
  if (!isAdmin) {
    alert("Only admin users can save teams.");
    return;
  }

  const team_name = getEl("team_name_input")?.value.trim();
  const coach_name = getEl("coach_name")?.value.trim();
  const primary_color = getEl("primary_color")?.value || "#2f4356";
  const secondary_color = getEl("secondary_color")?.value || "#5d7f8c";
  const logo_url = getEl("logo_url")?.value.trim();
  const editTeamId = getEl("editTeamId");
  const stadium_location = getEl("stadium_location")?.value.trim();

  console.log("STADIUM LOCATION FROM FORM:", stadium_location);

  if (!team_name || !coach_name || !editTeamId) {
    alert("Please fill in all fields.");
    return;
  }

  const team = { team_name, coach_name, primary_color, secondary_color, logo_url, stadium_location };

  try {
    let res;

    if (editTeamId.value) {
      res = await fetch(`${TEAMS_API_URL}/${editTeamId.value}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(team),
      });
    } else {
      res = await fetch(TEAMS_API_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(team),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save team");

    clearTeamForm();
    resetTeamFormMode();
    await fetchTeams();
    alert("Team saved successfully.");
  } catch (error) {
    console.error("Error saving team:", error);
    alert(error.message || "Could not save team.");
  }
}

// Submit a new team using the shared saveTeam() function
async function addTeam() {
  await saveTeam();
}

// Populate the form with existing team data to enable editing
function editTeam(
  id,
  teamName,
  coachName,
  logoUrl,
  primaryColor,
  secondaryColor,
  stadium_location
) {
  if (!isAdmin) {
    alert("Only admin users can edit teams.");
    return;
  }

  getEl("editTeamId").value = id;
  getEl("team_name_input").value = teamName;
  getEl("coach_name").value = coachName;
  getEl("primary_color").value = primaryColor;
  getEl("secondary_color").value = secondaryColor;

  if (getEl("logo_url")) getEl("logo_url").value = logoUrl || "";

  if (getEl("stadium_location")) {
    getEl("stadium_location").value = stadium_location || "";
  }

  updateLogoPreview();

  getEl("submitTeamBtn").textContent = "Update Team";
  getEl("cancelTeamEditBtn").style.display = "block";
  getEl("teamFormTitle").textContent = "Edit Team";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Cancel edit mode and restore the form back to add mode
function cancelTeamEdit() {
  clearTeamForm();
  resetTeamFormMode();
}

// Clear all team form input fields and reset the logo preview
function clearTeamForm() {
  if (getEl("team_name_input")) getEl("team_name_input").value = "";
  if (getEl("coach_name")) getEl("coach_name").value = "";
  if (getEl("logo_url")) getEl("logo_url").value = "";
  if (getEl("stadium_location")) getEl("stadium_location").value = "";

  updateLogoPreview();

  if (getEl("editTeamId")) getEl("editTeamId").value = "";
}

// Reset the team form interface back to default add mode
function resetTeamFormMode() {
  if (getEl("submitTeamBtn")) getEl("submitTeamBtn").textContent = "Add Team";
  if (getEl("cancelTeamEditBtn")) getEl("cancelTeamEditBtn").style.display = "none";
  if (getEl("teamFormTitle")) getEl("teamFormTitle").textContent = "Add Team";
  if (getEl("editTeamId")) getEl("editTeamId").value = "";
}

// Delete a team from the database using the selected team ID
async function deleteTeam(id) {
  if (!isAdmin) {
    alert("Only admin users can delete teams.");
    return;
  }

  if (!confirm("Are you sure you want to delete this team?")) return;

  try {
    const res = await fetch(`${TEAMS_API_URL}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to delete team");

    await fetchTeams();
    alert("Team deleted successfully.");
  } catch (error) {
    console.error("Error deleting team:", error);
    alert(error.message || "Could not delete team.");
  }
}

// Fetch teams
async function fetchTeams() {
  const teamList = getEl("teamList");
  if (!teamList) return;

  try {
    const res = await fetch(TEAMS_API_URL);
    if (!res.ok) throw new Error("Failed to fetch teams");

    const teams = await res.json();
    allTeams = teams;

    if (!allPlayers || allPlayers.length === 0) {
      await fetchPlayers();
    }

    displayTeams(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    teamList.innerHTML = `<li class="error-message">Unable to load teams right now.</li>`;
  }
}

function showTeamMap(locationName, teamName) {
  const mapContainer = document.getElementById("mapContainer");

  if (!mapContainer) {
    alert("Map container not found.");
    return;
  }

  if (!locationName || locationName === "null") {
    mapContainer.innerHTML = `
      <p class="error-message">No stadium location stored for ${teamName}.</p>
    `;
    return;
  }

  mapContainer.innerHTML = `
    <div class="map-info">
      <h3>${teamName}</h3>
      <p>${locationName}</p>
    </div>

    <iframe
      width="100%"
      height="350"
      style="border:0; border-radius:16px;"
      loading="lazy"
      allowfullscreen
      src="https://www.google.com/maps?q=${encodeURIComponent(locationName)}&output=embed">
    </iframe>
  `;

  mapContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const isAdmin = loggedInUser && loggedInUser.role === "admin";

  document.querySelectorAll(".admin-nav").forEach(link => {
    link.style.display = isAdmin ? "block" : "none";
  });
});

// Render all football teams, squad data, badges and team actions dynamically
function displayTeams(teams) {
  const list = getEl("teamList");
  if (!list) return;

  list.innerHTML = "";

  if (!teams || teams.length === 0) {
    list.innerHTML = `<li class="empty-message">No teams found.</li>`;
    return;
  }

  teams.forEach((team) => {
    const safeTeamName = String(team.team_name || "").replace(/'/g, "\\'");
    const safeCoachName = String(team.coach_name || "").replace(/'/g, "\\'");
    const safeLogoUrl = String(team.logo_url || "").replace(/'/g, "\\'");
    const safePrimaryColor = String(team.primary_color || "#2f4356").replace(/'/g, "\\'");
    const safeSecondaryColor = String(team.secondary_color || "#5d7f8c").replace(/'/g, "\\'");
    const safeStadiumLocation = String(team.stadium_location || "").replace(/'/g, "\\'");

    const teamPlayers = allPlayers.filter(
      (player) => Number(player.team_id) === Number(team.team_id)
    );

    const li = document.createElement("li");

    li.innerHTML = `
      <div class="team-card-content new-team-layout">

        <div class="team-badge-area">
          ${
            team.logo_url
              ? `
                <img 
                  src="${team.logo_url}" 
                  alt="${team.team_name} badge"
                  class="team-badge-img"
                >
              `
              : `
                <div class="team-badge-placeholder">
                  ${getInitials(team.team_name)}
                </div>
              `
          }
        </div>

        <div class="team-card-main">
          <div class="team-title-row">
            <h3>${team.team_name}</h3>

            <div class="team-colour-pair">
              <span 
                class="team-colour-dot"
                style="background:${team.primary_color || "#2f4356"}">
              </span>

              <span 
                class="team-colour-dot"
                style="background:${team.secondary_color || "#c0d3de"}">
              </span>
            </div>
          </div>

          <div class="team-meta new-team-meta">
            <span>Coach: ${team.coach_name || "Not set"}</span>
            <span>Players: ${team.player_count}</span>
            <span>📍 ${team.stadium_location || "Location not set"}</span>
          </div>

          <div class="team-card-buttons">
            <button class="squad-toggle-btn" onclick="toggleTeamSquad(this)">
              View Squad ▼
            </button>

            <button 
              class="map-toggle-btn" 
              onclick="showTeamMap('${String(team.stadium_location || "").replace(/'/g, "\\'")}', '${safeTeamName}')">
              View Location 📍
            </button>
          </div>

          <div class="team-squad-panel">
            ${
              teamPlayers.length > 0
                ? teamPlayers
                    .map(
                      (player) => `
                        <div class="squad-player-row">
                          <span>${player.player_name}</span>
                          <small>${player.position} • Age ${player.age}</small>
                        </div>
                      `
                    )
                    .join("")
                : `<p class="empty-squad">No players assigned to this team yet.</p>`
            }
          </div>
        </div>

        ${
          isAdmin
            ? `
            <div class="team-actions-right">

              <button
                class="edit-btn"
                onclick="editTeam(${team.team_id}, '${safeTeamName}', '${safeCoachName}', '${safeLogoUrl}', '${safePrimaryColor}', '${safeSecondaryColor}', '${safeStadiumLocation}')">
                Edit
              </button>

              <button 
                class="delete-btn" 
                onclick="deleteTeam(${team.team_id})">
                Delete
              </button>

            </div>
          `
            : ""
        }

      </div>
    `;

    list.appendChild(li);
  });
}

// Expand or collapse the selected team's squad player list
function toggleTeamSquad(button) {
  const teamCard = button.closest(".team-card-content");
  const squadPanel = teamCard.querySelector(".team-squad-panel");

  if (!squadPanel) return;

  const isOpen = squadPanel.classList.toggle("open");

  button.textContent = isOpen ? "Hide Squad ▲" : "View Squad ▼";
}

// Filter displayed teams using the team name or coach search input
function searchTeams() {
  const searchInput = getEl("searchTeam");
  if (!searchInput) return;

  const searchValue = searchInput.value.toLowerCase().trim();

  const filteredTeams = allTeams.filter((team) =>
    (team.team_name || "").toLowerCase().includes(searchValue) ||
    (team.coach_name || "").toLowerCase().includes(searchValue)
  );

  displayTeams(filteredTeams);
}

// Filter displayed matches using the home or away team search input
function searchMatches() {
  const searchInput = getEl("searchMatches");
  if (!searchInput) return;

  const searchValue = searchInput.value.toLowerCase().trim();

  const filteredMatches = allMatches.filter((match) =>
    (match.home_team || "").toLowerCase().includes(searchValue) ||
    (match.away_team || "").toLowerCase().includes(searchValue)
  );

  displayMatches(filteredMatches);
}

// Display the selected team's stadium location using an embedded Google Maps view
function showTeamMap(locationName, teamName) {
  const mapContainer = document.getElementById("mapContainer");

  if (!mapContainer) return;

  if (!locationName) {
    mapContainer.innerHTML = `
      <p class="error-message">No stadium location has been stored for ${teamName} yet.</p>
    `;
    return;
  }

  mapContainer.innerHTML = `
    <div class="map-info">
      <h3>${teamName}</h3>
      <p>${locationName}</p>
    </div>

    <iframe
      width="100%"
      height="350"
      style="border:0; border-radius: 16px;"
      loading="lazy"
      allowfullscreen
      referrerpolicy="no-referrer-when-downgrade"
      src="https://www.google.com/maps?q=${encodeURIComponent(locationName)}&output=embed">
    </iframe>
  `;

  mapContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* MATCH MANAGEMENT - Handles fixtures, scores, goal events, filtering and match result rendering.*/
async function fetchMatches() {
  const matchList = getEl("matchList");
  const totalMatches = getEl("totalMatches");

  if (!matchList && !totalMatches) return;

  try {
    const res = await fetch(MATCHES_API_URL);
    if (!res.ok) throw new Error("Failed to fetch matches");

    const matches = await res.json();
    allMatches = matches;

    displayMatches(matches);
    displayRecentMatches(matches);
    updateMatchStats(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);

    if (matchList) {
      matchList.innerHTML = `<li class="error-message">Unable to load matches right now.</li>`;
    }
  }
}
// Display a live preview of the selected team badge image URL
function updateLogoPreview() {
  const logoInput = getEl("logo_url");
  const previewImg = getEl("logoPreview");
  const previewText = getEl("logoPreviewText");

  if (!logoInput || !previewImg || !previewText) return;

  const url = logoInput.value.trim();

  if (!url) {
    previewImg.style.display = "none";
    previewImg.src = "";
    previewText.textContent = "No badge selected";
    return;
  }

  previewImg.src = url;
  previewImg.style.display = "block";
  previewText.textContent = "Preview loaded";

  previewImg.onerror = () => {
    previewImg.style.display = "none";
    previewText.textContent = "Invalid image URL";
  };
}

// Render all fixtures, scores, goal scorers and match cards dynamically
function displayMatches(matches) {
  const list = getEl("matchList");
  if (!list) return;

  list.innerHTML = "";

  if (!matches || matches.length === 0) {
    list.innerHTML = `<li class="empty-message">No matches found.</li>`;
    return;
  }

  matches.forEach((match) => {
    const hasScore =
      match.home_score !== null &&
      match.home_score !== undefined &&
      match.home_score !== "" &&
      match.away_score !== null &&
      match.away_score !== undefined &&
      match.away_score !== "";

    const status = hasScore ? "Finished" : "Upcoming";

    const homePrimary = match.home_primary_color || "#2f4356";
    const awayPrimary = match.away_primary_color || "#5d7f8c";

    const homeTeamData = allTeams.find(
      (team) => normaliseText(team.team_name) === normaliseText(match.home_team)
    );

    const awayTeamData = allTeams.find(
      (team) => normaliseText(team.team_name) === normaliseText(match.away_team)
    );

    const matchGoals = allMatchGoals
      .filter((goal) => Number(goal.match_id) === Number(match.match_id))
      .sort((a, b) => Number(a.minute || 0) - Number(b.minute || 0));

    const homeGoals = matchGoals.filter(
      (goal) => normaliseText(goal.team_name) === normaliseText(match.home_team)
    );

    const awayGoals = matchGoals.filter(
      (goal) => normaliseText(goal.team_name) === normaliseText(match.away_team)
    );

    const goalsHtml =
      matchGoals.length > 0
        ? `
          <button class="goal-toggle-btn" onclick="toggleGoalDetails(this)">
            View Goals ▼
          </button>

          <div class="fixture-goals">
            <h4>Goal Scorers</h4>
            ${matchGoals
              .map(
                (goal) =>
                  `<span>${goal.minute ? goal.minute + "'" : ""} ${goal.player_name} - ${goal.team_name}</span>`
              )
              .join("")}
          </div>
        `
        : `
          <div class="no-goals-note">No goal scorers recorded.</div>
        `;
    
    const li = document.createElement("li");
    li.className = "fixture-card";

    li.innerHTML = `
      <div class="fixture-main">
        <button class="fixture-team team-click-card" type="button" onclick="showTeamSnapshot('${escapeForInline(match.home_team)}')">
          <div class="fixture-badge">
            ${
              homeTeamData?.logo_url
                ? `
                  <img 
                    src="${homeTeamData.logo_url}" 
                    alt="${match.home_team}"
                    class="fixture-logo"
                  >
                `
                : `
                  <div 
                    class="fixture-badge-fallback"
                    style="background:${homePrimary}">
                    ${getInitials(match.home_team)}
                  </div>
                `
            }
          </div>

          <div>
            <strong>${match.home_team}</strong>
            <span>Home</span>
          </div>
        </button>

        <div class="fixture-score-block">
          <span class="fixture-date">${formatMatchDate(match.match_date)}</span>

          <div class="fixture-score">
            ${
              hasScore
                ? `<span>${match.home_score}</span><b>-</b><span>${match.away_score}</span>`
                : `<span class="fixture-time">VS</span>`
            }
          </div>

          <span class="match-status ${hasScore ? "status-finished" : "status-upcoming"}">
            ${status}
          </span>
        </div>

        <button class="fixture-team away-team team-click-card" type="button" onclick="showTeamSnapshot('${escapeForInline(match.away_team)}')">
          <div>
            <strong>${match.away_team}</strong>
            <span>Away</span>
          </div>

          <div class="fixture-badge">
            ${
              awayTeamData?.logo_url
                ? `
                  <img 
                    src="${awayTeamData.logo_url}" 
                    alt="${match.away_team}"
                    class="fixture-logo"
                  >
                `
                : `
                  <div 
                    class="fixture-badge-fallback"
                    style="background:${awayPrimary}">
                    ${getInitials(match.away_team)}
                  </div>
                `
            }
          </div>
        </button>
      </div>

      ${goalsHtml}

      ${
        isAdmin
          ? `
            <div class="fixture-actions">
              <button class="edit-btn" onclick="editMatchScore(${match.match_id}, '${match.home_score ?? ""}', '${match.away_score ?? ""}')">
                Edit Score
              </button>
            </div>
          `
          : ""
      }
    `;

    list.appendChild(li);
  });
}

function displayRecentMatches(matches) {
  const list = getEl("recentMatchesList");
  if (!list) return;

  list.innerHTML = "";

  if (!matches || matches.length === 0) {
    list.innerHTML = `<li class="empty-message">No recent matches found.</li>`;
    return;
  }

  const recentMatches = [...matches].slice(-3).reverse();

  recentMatches.forEach((match) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <div class="match-info">
        <strong>${match.home_team} <span class="vs">vs</span> ${match.away_team}</strong>
        <div class="match-meta">
          <span>${match.match_date}</span>
          <span>${match.score || "Not played yet"}</span>
        </div>
      </div>
    `;

    list.appendChild(li);
  });
}

/* Create a new fixture, validate input fields, save scores and submit all goal events to the REST API database. */
async function addMatch() {
  if (!isAdmin) {
    alert("Only admin users can add matches.");
    return;
  }

  await loadTeamsData();
  await loadPlayerSuggestions();

  const home_team = getEl("home_team")?.value.trim();
  const away_team = getEl("away_team")?.value.trim();
  const match_date = getEl("match_date")?.value;
  const match_status = getEl("match_status")?.value || "upcoming";

  let home_score = getEl("home_score")?.value;
  let away_score = getEl("away_score")?.value;

  if (!home_team || !away_team || !match_date) {
    alert("Please fill in home team, away team, and match date.");
    return;
  }

  if (normaliseText(home_team) === normaliseText(away_team)) {
    alert("Home team and away team cannot be the same.");
    return;
  }

  if (match_status === "upcoming") {
    home_score = "";
    away_score = "";
  }

  if (match_status === "finished" && (home_score === "" || away_score === "")) {
    alert("Please enter both scores for a finished match.");
    return;
  }

  try {
    const res = await fetch(MATCHES_API_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        home_team,
        away_team,
        match_date,
        home_score,
        away_score,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to add match");
    }

    const newMatchId = data.match_id;
    const failedGoals = [];

    for (const goal of pendingGoalEvents) {
      const player = findPlayerByName(goal.player_name);
      const team = findTeamByName(goal.team_name);

      if (!player || !team) {
        failedGoals.push(`${goal.player_name} - ${goal.team_name}`);
        continue;
      }

      const goalRes = await fetch(`${MATCHES_API_URL}/${newMatchId}/goals`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          player_id: player.player_id,
          team_id: team.team_id,
          minute: goal.minute || null,
        }),
      });

      if (!goalRes.ok) {
        failedGoals.push(`${goal.player_name} - ${goal.team_name}`);
      }
    }

    clearMatchForm();
    resetMatchFormMode();

    await fetchMatchGoals();
    await fetchMatches();
    await fetchDashboardStats();
    await fetchLeagueTable();

    if (failedGoals.length > 0) {
      alert(`Match added, but these goal events could not be saved: ${failedGoals.join(", ")}`);
    } else {
      alert("Match added successfully.");
    }
  } catch (error) {
    console.error("Error adding match:", error);
    alert(error.message || "Could not add match.");
  }
}

// Clear all match form fields, goal events and reset the form back to its default add match state.
function clearMatchForm() {
  if (getEl("home_team")) getEl("home_team").value = "";
  if (getEl("away_team")) getEl("away_team").value = "";
  if (getEl("match_date")) getEl("match_date").value = "";
  if (getEl("match_status")) getEl("match_status").value = "upcoming";
  if (getEl("home_score")) getEl("home_score").value = "";
  if (getEl("away_score")) getEl("away_score").value = "";
  if (getEl("goal_player_name")) getEl("goal_player_name").value = "";
  if (getEl("goal_team_name")) getEl("goal_team_name").value = "";
  if (getEl("goal_minute")) getEl("goal_minute").value = "";

  pendingGoalEvents = [];
  displayPendingGoalEvents();
  toggleScoreInputs();
}

//Load all available player names from the API and populate the player suggestion datalist used for goal event selection.
async function loadPlayerSuggestions() {
  try {
    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error("Failed to load player suggestions");
    }

    const players = await res.json();
    allPlayers = players;

    const dataList = getEl("playerSuggestions");
    if (!dataList) return;

    dataList.innerHTML = "";

    players.forEach((player) => {
      const option = document.createElement("option");
      option.value = player.player_name;
      dataList.appendChild(option);
    });
  } catch (error) {
    console.error("Player suggestions error:", error);
  }
}

async function addPendingGoalEvent() {
  await loadTeamsData();
  await loadPlayerSuggestions();

  const playerName = getEl("goal_player_name")?.value.trim();
  const teamName = getEl("goal_team_name")?.value.trim();
  const minute = getEl("goal_minute")?.value;

  if (!playerName || !teamName) {
    alert("Please enter the goal scorer and scoring team.");
    return;
  }

  const player = findPlayerByName(playerName);
  const team = findTeamByName(teamName);

  if (!player || !team) {
    alert("Player or team could not be found. Please select names from the suggestions.");
    return;
  }

  pendingGoalEvents.push({
    player_name: player.player_name,
    team_name: team.team_name,
    minute: minute || "",
  });

  getEl("goal_player_name").value = "";
  getEl("goal_team_name").value = "";
  getEl("goal_minute").value = "";

  displayPendingGoalEvents();
}

function displayPendingGoalEvents() {
  const list = getEl("pendingGoalsList");
  if (!list) return;

  if (pendingGoalEvents.length === 0) {
    list.innerHTML = `<p class="pending-empty">No goal events added yet.</p>`;
    return;
  }

  list.innerHTML = `
    <h4>Goals added to this match</h4>
    ${pendingGoalEvents
      .map(
        (goal, index) => `
          <div class="pending-goal-item">
            <span>${goal.minute ? goal.minute + "'" : ""} ${goal.player_name} - ${goal.team_name}</span>
            <button type="button" onclick="removePendingGoalEvent(${index})">Remove</button>
          </div>
        `
      )
      .join("")}
  `;
}

function removePendingGoalEvent(index) {
  pendingGoalEvents.splice(index, 1);
  displayPendingGoalEvents();
}

function updateMatchStats(matches) {
  const totalMatches = getEl("totalMatches");
  if (totalMatches) totalMatches.textContent = matches.length;
}

/* DASHBOARD STATISTICS - Loads summary statistics used on the manager dashboard. */
async function fetchDashboardStats() {
  const totalPlayersEl = getEl("totalPlayers");
  const totalTeamsEl = getEl("totalTeams");
  const totalMatchesEl = getEl("totalMatches");
  const averageAgeEl = getEl("averageAge");

  if (!totalPlayersEl && !totalTeamsEl && !totalMatchesEl && !averageAgeEl) return;

  try {
    const res = await fetch(DASHBOARD_API_URL);
    const data = await res.json();

    if (totalPlayersEl) totalPlayersEl.textContent = data.totalPlayers;
    if (totalTeamsEl) totalTeamsEl.textContent = data.totalTeams;
    if (totalMatchesEl) totalMatchesEl.textContent = data.totalMatches;
    if (averageAgeEl) averageAgeEl.textContent = data.averageAge;
  } catch (error) {
    console.error("Dashboard stats error:", error);
  }
}

function updateDashboardTimestamp() {
  const timestampEl = getEl("dashboardLastUpdated");

  if (!timestampEl) return;

  const now = new Date();

  timestampEl.textContent = now.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* LEAGUE TABLE - Loads and renders the calculated league table from completed match results. */
async function fetchLeagueTable() {
  const tableBody = getEl("leagueTableBody");
  if (!tableBody) return;

  try {
    const res = await fetch(LEAGUE_API_URL);
    const teams = await res.json();

    if (!res.ok) throw new Error(teams.error || "Failed to load league table");

    tableBody.innerHTML = "";

    if (!teams || teams.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10">No completed matches yet. Add scores to generate the table.</td>
        </tr>
      `;
      return;
    }

    displayLeagueSummary(teams);

    teams.forEach((team, index) => {
      const row = document.createElement("tr");

        // Leader styling
        if (index === 0) {
          row.classList.add("top-team-row");
        }

        // Relegation styling
        if (index >= teams.length - 1) {
          row.classList.add("relegation-row");
        }

      const teamData = allTeams.find(
        (t) => normaliseText(t.team_name) === normaliseText(team.team)
      );

      const gdClass =
        team.goalDifference > 0
          ? "positive-gd"
          : team.goalDifference < 0
          ? "negative-gd"
          : "neutral-gd";

      row.innerHTML = `
        <td><strong>${index + 1}</strong></td>

        <td>
          <div class="league-team-cell">
            ${
              teamData?.logo_url
                ? `<img src="${teamData.logo_url}" alt="${team.team}" class="league-team-badge">`
                : `<div class="league-team-placeholder">${getInitials(team.team)}</div>`
            }
            <strong>${team.team}</strong>
          </div>
        </td>

        <td>${team.played}</td>
        <td>${team.wins}</td>
        <td>${team.draws}</td>
        <td>${team.losses}</td>
        <td>${team.goalsFor}</td>
        <td>${team.goalsAgainst}</td>
        <td class="${gdClass}"><strong>${team.goalDifference}</strong></td>
        <td><strong>${team.points}</strong></td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("League table error:", error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="10">Unable to load league table.</td>
      </tr>
    `;
  }
}

function displayLeagueSummary(teams) {
  const container = getEl("leagueSummaryCards");
  if (!container || !teams || teams.length === 0) return;

  const topTeam = teams[0];

  const mostGoals = [...teams].sort(
    (a, b) => b.goalsFor - a.goalsFor
  )[0];

  const bestDefence = [...teams].sort(
    (a, b) => a.goalsAgainst - b.goalsAgainst
  )[0];

  container.innerHTML = `
    <div class="league-summary-card">
      <span>Top Team</span>
      <strong>${topTeam.team}</strong>
      <p>${topTeam.points} points</p>
    </div>

    <div class="league-summary-card">
      <span>Most Goals</span>
      <strong>${mostGoals.team}</strong>
      <p>${mostGoals.goalsFor} goals scored</p>
    </div>

    <div class="league-summary-card">
      <span>Best Defence</span>
      <strong>${bestDefence.team}</strong>
      <p>${bestDefence.goalsAgainst} goals conceded</p>
    </div>
  `;
}

/* HELPER FUNCTIONS - Shared utility functions for formatting, searching and text normalisation. */
function normaliseText(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeForInline(value) {
  return String(value || "").replace(/'/g, "\\'");
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatMatchDate(dateValue) {
  if (!dateValue) return "Date TBC";
  return dateValue;
}

function goalScorerChip(goal) {
  return `<span>${goal.minute ? goal.minute + "'" : ""} ${goal.player_name}</span>`;
}

function findPlayerByName(playerName) {
  return allPlayers.find(
    (player) => normaliseText(player.player_name) === normaliseText(playerName)
  );
}

function findTeamByName(teamName) {
  return allTeams.find(
    (team) => normaliseText(team.team_name) === normaliseText(teamName)
  );
}

function showTeamSnapshot(teamName) {
  const team = findTeamByName(teamName);
  const teamPlayers = allPlayers.filter(
    (player) => normaliseText(player.team_name) === normaliseText(teamName)
  );

  const playerNames = teamPlayers.length > 0
    ? teamPlayers.map((player) => `${player.player_name} (${player.position})`).join("\n")
    : "No players recorded for this team yet.";

  alert(`${teamName}\nCoach: ${team?.coach_name || "Not set"}\nPlayers: ${teamPlayers.length}\n\n${playerNames}`);
}

function toggleScoreInputs() {
  const status = getEl("match_status")?.value;
  const homeScore = getEl("home_score");
  const awayScore = getEl("away_score");

  if (!homeScore || !awayScore) return;

  const isUpcoming = status === "upcoming";
  homeScore.disabled = isUpcoming;
  awayScore.disabled = isUpcoming;

  if (isUpcoming) {
    homeScore.value = "";
    awayScore.value = "";
  }
}

async function loadTeamsData() {
  try {
    const res = await fetch(TEAMS_API_URL);
    if (!res.ok) throw new Error("Failed to fetch teams");

    allTeams = await res.json();

    const dataList = getEl("teamSuggestions");
    if (dataList) {
      dataList.innerHTML = "";
      allTeams.forEach((team) => {
        const option = document.createElement("option");
        option.value = team.team_name;
        dataList.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Teams data error:", error);
  }
}

async function fetchMatchGoals() {
  try {
    const res = await fetch(`${MATCHES_API_URL}/goals`);
    allMatchGoals = await res.json();
  } catch (error) {
    console.error("Goal scorer fetch error:", error);
  }
}

// Local stats fallback
function updateStats(players) {
  const totalPlayers = getEl("totalPlayers");
  const averageAge = getEl("averageAge");
  const totalTeams = getEl("totalTeams");

  if (totalPlayers) totalPlayers.textContent = players.length;

  const averageAgeValue =
    players.length > 0
      ? Math.round(players.reduce((sum, player) => sum + Number(player.age), 0) / players.length)
      : 0;

  if (averageAge) averageAge.textContent = averageAgeValue;

  const uniqueTeams = new Set(players.map((player) => player.team_name).filter(Boolean));
  if (totalTeams) totalTeams.textContent = uniqueTeams.size;
}

// Search players
function searchPlayers() {
  const searchInput = getEl("searchPlayer");
  if (!searchInput) return;

  const searchValue = searchInput.value.toLowerCase().trim();

  const filteredPlayers = allPlayers.filter((player) =>
    (player.player_name || "").toLowerCase().includes(searchValue)
  );

  displayPlayers(filteredPlayers);
}

const searchStatsInput = getEl("searchStats");
if (searchStatsInput) {
  searchStatsInput.addEventListener("input", searchPlayerStats);
}

const logoInput = getEl("logo_url");
if (logoInput) {
  logoInput.addEventListener("input", updateLogoPreview);
}

// Events
const searchPlayerInput = getEl("searchPlayer");
if (searchPlayerInput) {
  searchPlayerInput.addEventListener("input", searchPlayers);
}

const searchTeamInput = getEl("searchTeam");

if (searchTeamInput) {
  searchTeamInput.addEventListener("input", searchTeams);
}

const searchMatchesInput = getEl("searchMatches");
if (searchMatchesInput) {
  searchMatchesInput.addEventListener("input", searchMatches);
}

let allNews = [];

/* NEWS MANAGEMENT - Handles club news loading, posting, searching and category filtering. */
async function fetchNews() {
  const list = getEl("newsList");
  if (!list) return;

  try {
    const res = await fetch(NEWS_API_URL);
    const news = await res.json();

    allNews = news || [];
    displayNews(allNews);
  } catch (err) {
    console.error("News error:", err);
    list.innerHTML = `<li class="news-empty">Unable to load news right now.</li>`;
  }
}

function displayNews(news) {
  const list = getEl("newsList");
  if (!list) return;

  list.innerHTML = "";

  if (!news || news.length === 0) {
    list.innerHTML = `<li class="news-empty">No news has been posted yet.</li>`;
    return;
  }

  news
    .slice()
    .reverse()
    .forEach((item) => {
      const li = document.createElement("li");
      li.className = "news-card";

      const category = item.category || "General";
      const date = item.created_at
        ? new Date(item.created_at).toLocaleDateString()
        : "Recently";

      li.innerHTML = `
        <div class="news-card-top">
          <span class="news-category-pill">${category}</span>
          <span class="news-date">${date}</span>
        </div>

        <h3>${item.title}</h3>
        <p>${item.content}</p>
      `;

      list.appendChild(li);
    });
}

// Filter club news articles using the search bar and selected news category to dynamically update displayed results.
function searchAndFilterNews() {
  const searchValue = getEl("searchNews")?.value.toLowerCase().trim() || "";
  const selectedCategory = getEl("filterNewsCategory")?.value || "all";

  const filteredNews = allNews.filter((item) => {
    const matchesSearch =
      (item.title || "").toLowerCase().includes(searchValue) ||
      (item.content || "").toLowerCase().includes(searchValue);

    const itemCategory = item.category || "General";
    const matchesCategory =
      selectedCategory === "all" || itemCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  displayNews(filteredNews);
}

// Create and publish a new club news article through the REST API with validation and dynamic frontend updates.
async function addNews() {
  if (!isAdmin) {
    alert("Only admins can post news.");
    return;
  }

  const title = getEl("newsTitle")?.value.trim();
  const content = getEl("newsContent")?.value.trim();
  const category = getEl("newsCategory")?.value || "General";

  if (!title || !content) {
    alert("Please fill in the title and content.");
    return;
  }

  try {
    const res = await fetch(NEWS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ title, content, category }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to post news");
    }

    getEl("newsTitle").value = "";
    getEl("newsContent").value = "";
    getEl("newsCategory").value = "General";

    await fetchNews();

    alert("News posted successfully.");
  } catch (err) {
    console.error(err);
    alert(err.message || "Error posting news.");
  }
}

const searchNewsInput = getEl("searchNews");
if (searchNewsInput) {
  searchNewsInput.addEventListener("input", searchAndFilterNews);
}

const filterNewsCategory = getEl("filterNewsCategory");
if (filterNewsCategory) {
  filterNewsCategory.addEventListener("change", searchAndFilterNews);
}

async function saveMatch() {
  const editMatchId = getEl("editMatchId");

  if (editMatchId && editMatchId.value) {
    await updateMatchFromForm(editMatchId.value);
  } else {
    await addMatch();
  }
}

// TEAM MANAGEMENT - edit match scores
function editMatchScore(id, currentHomeScore, currentAwayScore) {
  if (!isAdmin) {
    alert("Only admin users can edit match scores.");
    return;
  }

  const match = allMatches.find((m) => Number(m.match_id) === Number(id));

  if (!match) {
    alert("Match not found.");
    return;
  }

  getEl("editMatchId").value = match.match_id;
  getEl("home_team").value = match.home_team;
  getEl("away_team").value = match.away_team;
  getEl("match_date").value = match.match_date;
  getEl("home_score").value = currentHomeScore || "";
  getEl("away_score").value = currentAwayScore || "";

  if (getEl("match_status")) {
    getEl("match_status").value = "finished";
  }

  toggleScoreInputs();

  if (getEl("matchFormTitle")) {
    getEl("matchFormTitle").textContent = "Update Match";
  }

  getEl("submitMatchBtn").textContent = "Update Match";
  getEl("cancelMatchEditBtn").style.display = "block";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function updateMatchFromForm(id) {
  if (!isAdmin) {
    alert("Only admin users can update matches.");
    return;
  }

  await loadTeamsData();
  await loadPlayerSuggestions();

  const home_score = getEl("home_score")?.value;
  const away_score = getEl("away_score")?.value;

  if (home_score === "" || away_score === "") {
    alert("Both scores are required to update a completed match.");
    return;
  }

  try {
    const res = await fetch(`${MATCHES_API_URL}/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ home_score, away_score }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to update match");
    }

    for (const goal of pendingGoalEvents) {
      const player = allPlayers.find(
        (p) => p.player_name.toLowerCase() === goal.player_name.toLowerCase()
      );

      const team = allTeams.find(
        (t) => t.team_name.toLowerCase() === goal.team_name.toLowerCase()
      );

      if (player && team) {
        await fetch(`${MATCHES_API_URL}/${id}/goals`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            player_id: player.player_id,
            team_id: team.team_id,
            minute: goal.minute,
          }),
        });
      }
    }

    pendingGoalEvents = [];
    displayPendingGoalEvents();

    clearMatchForm();
    resetMatchFormMode();

    await fetchMatchGoals();
    await fetchMatches();
    await fetchDashboardStats();
    await fetchLeagueTable();

    alert("Match updated successfully.");
  } catch (error) {
    console.error("Update match error:", error);
    alert(error.message || "Could not update match.");
  }
}

function cancelMatchEdit() {
  clearMatchForm();
  resetMatchFormMode();
}

function resetMatchFormMode() {
  if (getEl("editMatchId")) getEl("editMatchId").value = "";
  if (getEl("submitMatchBtn")) getEl("submitMatchBtn").textContent = "Add Match";
  if (getEl("matchFormTitle")) getEl("matchFormTitle").textContent = "Add Match";
  if (getEl("cancelMatchEditBtn")) {
    getEl("cancelMatchEditBtn").style.display = "none";
  }
}

async function updateMatchScore(id, home_score, away_score) {
  if (!isAdmin) {
    alert("Only admin users can update match scores.");
    return;
  }

  try {
    const res = await fetch(`${MATCHES_API_URL}/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ home_score, away_score }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to update score");
    }

    await fetchMatchGoals();
    await fetchMatches();
    await fetchDashboardStats();
    await fetchLeagueTable();

    alert("Score updated successfully!");
  } catch (error) {
    console.error("Update score error:", error);
    alert(error.message || "Could not update score.");
  }
}

function filterMatches(type) {
  if (!allMatches || allMatches.length === 0) return;

  let filteredMatches = allMatches;

  if (type === "finished") {
    filteredMatches = allMatches.filter((match) =>
      match.home_score !== null &&
      match.home_score !== undefined &&
      match.home_score !== "" &&
      match.away_score !== null &&
      match.away_score !== undefined &&
      match.away_score !== ""
    );
  }

  if (type === "upcoming") {
    filteredMatches = allMatches.filter((match) =>
      match.home_score === null ||
      match.home_score === undefined ||
      match.home_score === "" ||
      match.away_score === null ||
      match.away_score === undefined ||
      match.away_score === ""
    );
  }

  displayMatches(filteredMatches);
}

function toggleGoalDetails(button) {
  const panel = button.nextElementSibling;
  if (!panel) return;

  const isOpen = panel.classList.toggle("open");
  button.textContent = isOpen ? "Hide Goals ▲" : "View Goals ▼";
}

function updateRoleLabels() {
  const roleLabels = document.querySelectorAll(".role-label");

  roleLabels.forEach((label) => {
    if (!user) return;

    if (user.role === "admin") label.textContent = "Admin Dashboard";
    if (user.role === "player") label.textContent = "Player Portal";
    if (user.role === "guest") label.textContent = "Guest View";
  });
}

/* PLAYER STATISTICS - Handles player performance data, editable stats and top scorer displays. */
async function fetchPlayerStats() {
  const statsList = getEl("playerStatsList");
  if (!statsList) return;

  try {
    const res = await fetch(PLAYER_STATS_API_URL);
    const stats = await res.json();

    allPlayerStats = stats;

    statsList.innerHTML = "";

    if (!stats || stats.length === 0) {
      statsList.innerHTML = `<p>No player statistics available.</p>`;
      return;
    }

    displayPlayerStats(stats);
    displayTopScorers(stats);

  } catch (error) {
    console.error("Player stats error:", error);

    statsList.innerHTML = `
      <p class="error-message">
        Unable to load player statistics.
      </p>
    `;
  }
}

function editPlayerStats(playerId, appearances, goals, assists, yellowCards, redCards) {
  const newAppearances = prompt("Appearances:", appearances);
  if (newAppearances === null) return;

  const newGoals = prompt("Goals:", goals);
  if (newGoals === null) return;

  const newAssists = prompt("Assists:", assists);
  if (newAssists === null) return;

  const newYellowCards = prompt("Yellow cards:", yellowCards);
  if (newYellowCards === null) return;

  const newRedCards = prompt("Red cards:", redCards);
  if (newRedCards === null) return;

  updatePlayerStats(playerId, {
    appearances: Number(newAppearances),
    goals: Number(newGoals),
    assists: Number(newAssists),
    yellow_cards: Number(newYellowCards),
    red_cards: Number(newRedCards),
  });
}

async function updatePlayerStats(playerId, stats) {
  try {
    const res = await fetch(`${PLAYER_STATS_API_URL}/${playerId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(stats),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to update player stats");
    }

    await fetchPlayers();
    await fetchTeams();
    await fetchPlayerStats();
    alert("Player statistics updated successfully.");
    
  } catch (error) {
    console.error("Update stats error:", error);
    alert(error.message || "Could not update player statistics.");
  }
}

function searchPlayerStats() {
  const searchInput = getEl("searchStats");
  if (!searchInput) return;

  const searchValue = searchInput.value.toLowerCase().trim();

  const filteredStats = allPlayerStats.filter((player) =>
    (player.player_name || "").toLowerCase().includes(searchValue) ||
    (player.team_name || "").toLowerCase().includes(searchValue) ||
    (player.position || "").toLowerCase().includes(searchValue)
  );

  displayPlayerStats(filteredStats);
}

function displayPlayerStats(stats) {
  const statsList = getEl("playerStatsList");
  if (!statsList) return;

  statsList.innerHTML = "";

  if (!stats || stats.length === 0) {
    statsList.innerHTML = `<p>No player statistics found.</p>`;
    return;
  }

  stats.forEach((player) => {
    const card = document.createElement("div");
    card.className = "stat-player-card";

    card.innerHTML = `
      <div>
        <h3>${player.player_name}</h3>
        <p>${player.position} • ${player.team_name}</p>
      </div>

      <div class="player-stat-row">
        <span>Apps: <strong>${player.appearances}</strong></span>
        <span>Goals: <strong>${player.goals}</strong></span>
        <span>Assists: <strong>${player.assists}</strong></span>
        <span>YC: <strong>${player.yellow_cards}</strong></span>
        <span>RC: <strong>${player.red_cards}</strong></span>
      </div>

      ${
        isAdmin
          ? `
          <button class="edit-btn" onclick="editPlayerStats(${player.player_id}, ${player.appearances}, ${player.goals}, ${player.assists}, ${player.yellow_cards}, ${player.red_cards})">
            Edit Stats
          </button>
        `
          : ""
      }
    `;

    statsList.appendChild(card);
  });
}

function displayTopScorers(stats) {
  const podium = getEl("topScorersPodium");
  if (!podium) return;

  podium.innerHTML = "";

  const topThree = [...stats]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 3);

  if (topThree.length === 0) {
    podium.innerHTML = `<p class="empty-message">No scorer data available.</p>`;
    return;
  }

  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
  const places = {
    0: { medal: "🥇", label: "1st", className: "first-place" },
    1: { medal: "🥈", label: "2nd", className: "second-place" },
    2: { medal: "🥉", label: "3rd", className: "third-place" },
  };

  podiumOrder.forEach((player) => {
    const originalRank = topThree.indexOf(player);
    const place = places[originalRank];

    const card = document.createElement("div");
    card.className = `podium-card ${place.className}`;

    const initials = player.player_name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    card.innerHTML = `
      <div class="podium-rank">${place.medal}</div>

      <div class="player-avatar">${initials}</div>

      <h3>${player.player_name}</h3>
      <p>${player.position} • ${player.team_name}</p>

      <div class="goals-badge">
        ${player.goals} Goals
      </div>

      <div class="podium-more">
        ⌄
        <div class="podium-details">
          <span>${player.appearances} appearances</span>
          <span>${player.assists} assists</span>
          <span>${player.yellow_cards} yellow cards</span>
          <span>${player.red_cards} red cards</span>
        </div>
      </div>
    `;

    podium.appendChild(card);
  });
}

/* DASHBOARD FUNCTIONS - Loads recent players, recent matches, top scorer and next fixture widgets. */

async function loadDashboardExtras() {
  try {
    const [playersRes, matchesRes, statsRes, teamsRes] = await Promise.all([
      fetch(API_URL),
      fetch(MATCHES_API_URL),
      fetch(PLAYER_STATS_API_URL),
      fetch(TEAMS_API_URL)
    ]);

    const players = await playersRes.json();
    const matches = await matchesRes.json();
    const stats = await statsRes.json();
    const teams = await teamsRes.json();

    loadRecentPlayers(players);
    loadRecentMatches(matches, teams);
    loadTopScorer(stats, players);
    loadNextFixture(matches, teams);

    updateDashboardTimestamp();

  } catch (error) {
    console.error("Dashboard load error:", error);
  }
}

function loadRecentPlayers(players) {
  const list = getEl("recentPlayersList");
  if (!list) return;

  const recentPlayers = players.slice(-5).reverse();

  list.innerHTML = recentPlayers.map(player => `
    <li class="dashboard-player-item">
      <strong>${player.player_name}</strong>
      <span>${player.position} • ${player.team_name}</span>
    </li>
  `).join("");
}

function loadRecentMatches(matches, teams) {
  const list = getEl("recentMatchesList");
  if (!list) return;

  const completedMatches = matches
    .filter(
      (match) =>
        match.home_score !== null &&
        match.away_score !== null
    )
    .slice(-3)
    .reverse();

  if (completedMatches.length === 0) {
    list.innerHTML = `<li>No completed matches available.</li>`;
    return;
  }

  list.innerHTML = completedMatches
    .map((match) => {

      const homeTeam = teams.find(
        (t) =>
          normaliseText(t.team_name) === normaliseText(match.home_team)
      );

      const awayTeam = teams.find(
        (t) =>
          normaliseText(t.team_name) === normaliseText(match.away_team)
      );

      return `
        <li class="dashboard-match-item">

          <div class="dashboard-match-teams">

            <div class="dashboard-team-side">
              ${
                homeTeam?.logo_url
                  ? `<img src="${homeTeam.logo_url}" class="dashboard-team-logo">`
                  : ""
              }

              <span>${match.home_team}</span>
            </div>

            <div class="dashboard-match-score">
              ${match.home_score} - ${match.away_score}
            </div>

            <div class="dashboard-team-side">
              ${
                awayTeam?.logo_url
                  ? `<img src="${awayTeam.logo_url}" class="dashboard-team-logo">`
                  : ""
              }

              <span>${match.away_team}</span>
            </div>

          </div>

          <small>
            ${new Date(match.match_date).toLocaleDateString()}
          </small>

        </li>
      `;
    })
    .join("");
}

function loadTopScorer(stats, players) {
  const container = getEl("dashboardTopScorer");
  if (!container) return;

  if (!stats || stats.length === 0) {
    container.innerHTML = `No scorer data available.`;
    return;
  }

  const topScorer = [...stats].sort((a, b) => b.goals - a.goals)[0];

  const playerData = players.find(
    (player) =>
      normaliseText(player.player_name) === normaliseText(topScorer.player_name)
  );

  const initials = getInitials(topScorer.player_name);

  container.innerHTML = `
    ${
      playerData?.profile_image
        ? `
          <img 
            src="${playerData.profile_image}" 
            alt="${topScorer.player_name}" 
            class="top-player-photo"
          >
        `
        : `
          <div class="top-player-avatar">
            ${initials}
          </div>
        `
    }

    <h3>${topScorer.player_name}</h3>

    <p>${topScorer.team_name}</p>

    <div class="goal-count-badge">
      ⚽ ${topScorer.goals} Goals
    </div>
  `;
}

function loadNextFixture(matches, teams) {
  const container = getEl("dashboardNextFixture");
  if (!container) return;

  const upcomingMatch = matches.find(match =>
    match.home_score === null ||
    match.away_score === null
  );

  if (!upcomingMatch) {
    container.innerHTML = `No upcoming fixtures scheduled.`;
    return;
  }

  const homeTeam = teams.find(
    (t) => normaliseText(t.team_name) === normaliseText(upcomingMatch.home_team)
  );

  const awayTeam = teams.find(
    (t) => normaliseText(t.team_name) === normaliseText(upcomingMatch.away_team)
  );

  container.innerHTML = `
    <div class="next-fixture-horizontal">

      <div class="next-fixture-team-block">
        ${
          homeTeam?.logo_url
            ? `<img src="${homeTeam.logo_url}" alt="${upcomingMatch.home_team}" class="next-team-logo">`
            : `<div class="next-team-badge">${getInitials(upcomingMatch.home_team)}</div>`
        }
        <strong>${upcomingMatch.home_team}</strong>
      </div>

      <div class="next-fixture-centre">
        <div class="fixture-vs">VS</div>
        <div class="next-fixture-date">${upcomingMatch.match_date}</div>
      </div>

      <div class="next-fixture-team-block">
        ${
          awayTeam?.logo_url
            ? `<img src="${awayTeam.logo_url}" alt="${upcomingMatch.away_team}" class="next-team-logo">`
            : `<div class="next-team-badge">${getInitials(upcomingMatch.away_team)}</div>`
        }
        <strong>${upcomingMatch.away_team}</strong>
      </div>

    </div>
  `;
}

/* WEATHER API INTEGRATION - Uses Open-Meteo geocoding and forecast APIs to display matchday weather. */
const weatherLocations = [
  "London",
  "Manchester",
  "Liverpool",
  "Birmingham",
  "Leicester",
  "Brighton",
  "Bristol",
  "Reading",
  "Southampton",
  "Durham",
  "Sheffield",
  "Crystal Palace",
  "Charlton",
  "Lewes",
  "Blackburn",
  "Everton",
  "Chelsea",
  "Arsenal",
  "Tottenham",
  "Manchester United",
  "Manchester City",
  "Liverpool FC Women",
  "Aston Villa Women",
  "Leicester City Women",
  "Leeds",
  "York"
];

async function fetchWeatherForecast() {
  const locationInput = getEl("weatherLocationInput");
  const weatherResult = getEl("weatherResult");

  if (!locationInput || !weatherResult) return;

  const location = locationInput.value.trim();

  if (!location) {
    weatherResult.innerHTML = `<p class="error-message">Please enter a location.</p>`;
    return;
  }

  try {
    weatherResult.innerHTML = `<p>Loading weather for ${location}...</p>`;

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=5&language=en&format=json`
    );

    const geoData = await geoRes.json();

    console.log("Geocoding result:", geoData);

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("Location not found");
    }

    const place = geoData.results[0];

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true&hourly=temperature_2m,weathercode`
    );

    const weatherData = await weatherRes.json();

    console.log("Weather result:", weatherData);

    const current = weatherData.current_weather;
    
    const now = new Date();

    const startIndex = weatherData.hourly.time.findIndex((time) => {
      return new Date(time) >= now;
    });

    const safeStartIndex = startIndex === -1 ? 0 : startIndex;

    const hourlyTimes = weatherData.hourly.time.slice(safeStartIndex, safeStartIndex + 10);
    const hourlyTemps = weatherData.hourly.temperature_2m.slice(safeStartIndex, safeStartIndex + 10);
    const hourlyCodes = weatherData.hourly.weathercode.slice(safeStartIndex, safeStartIndex + 10);

    const weatherIcon = getWeatherIcon(current.weathercode);
    const weatherLabel = getWeatherLabel(current.weathercode);

    weatherResult.innerHTML = `
      <div class="google-weather-card">
        <div class="weather-top">
          <div>
            <h3>Weather in ${place.name}</h3>
            <p>${place.country}</p>
          </div>

          <span class="weather-source">Open-Meteo API</span>
        </div>

        <div class="weather-main-google">
          <div class="weather-icon-large">${weatherIcon}</div>

          <div class="weather-temp-block">
            <strong>${Math.round(current.temperature)}°C</strong>
            <span>${weatherLabel}</span>
          </div>

          <div class="weather-details-google">
            <p>Wind: ${current.windspeed} km/h</p>
            <p>Weather code: ${current.weathercode}</p>
            <p>Matchday conditions</p>
          </div>
        </div>

        <div class="hourly-weather-row">
          ${hourlyTimes.map((time, index) => `
            <div class="hour-card">
              <span>
                ${
                  index === 0
                    ? "Now"
                    : new Date(time).toLocaleDateString() !== new Date().toLocaleDateString()
                      ? `Tomorrow<br>${new Date(time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}`
                      : new Date(time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                }
              </span>
              <div class="hour-icon">
                ${getWeatherIcon(hourlyCodes[index])}
              </div>
              <strong>${Math.round(hourlyTemps[index])}°</strong>
            </div>
          `).join("")}
        </div>

      </div>
    `;
  } catch (error) {
    console.error("Weather API error:", error);

    weatherResult.innerHTML = `
      <p class="error-message">
        Unable to load weather data. Try searching by city name instead.
      </p>
    `;
  }
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌦️";
}

function getWeatherLabel(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([80, 81, 82].includes(code)) return "Showers";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather update";
}

function loadWeatherSuggestions() {
  const datalist = document.getElementById("weatherSuggestions");

  if (!datalist) return;

  datalist.innerHTML = weatherLocations
    .map(location => `<option value="${location}"></option>`)
    .join("");
}

function updatePlayerPreview() {
  const input = getEl("profile_image");
  const preview = getEl("playerImagePreview");

  if (!input || !preview) return;

  const url = input.value.trim();

  preview.onerror = null;

  if (!url) {
    preview.src = "";
    preview.style.display = "none";
    return;
  }

  preview.src = url;
  preview.style.display = "block";

  preview.onerror = () => {
    preview.src = "";
    preview.style.display = "none";
  };
}

const playerImageInput = getEl("profile_image");

if (playerImageInput) {
  playerImageInput.addEventListener("input", updatePlayerPreview);
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

function updateAdminNav() {
  const loggedInUser =
    JSON.parse(localStorage.getItem("loggedInUser")) ||
    JSON.parse(localStorage.getItem("user"));

  const isAdmin = loggedInUser && loggedInUser.role === "admin";

  document.querySelectorAll(".admin-nav").forEach(link => {
    if (isAdmin) {
      link.style.display = "block";
    } else {
      link.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", updateAdminNav);
setTimeout(updateAdminNav, 300);

/* LOAD DASHBOARD */
loadDashboardExtras();

/* PAGE INITIALISATION - Runs when the page loads and fetches the data needed for each page. */
async function initialisePage() {
  applyRolePermissions();
  loadTeamSuggestions();

  await loadTeamsData();
  await loadPlayerSuggestions();
  await fetchMatchGoals();

  await fetchPlayers();
  await fetchTeams();
  await fetchMatches();

  await fetchDashboardStats();
  await fetchLeagueTable();
  await fetchNews();
  await fetchPlayerStats();

  await loadWeatherSuggestions();

  await fetchUsers();

  updateRoleLabels();
}

initialisePage();