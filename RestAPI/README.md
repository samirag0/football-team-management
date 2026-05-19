# Football Team Management System

A full-stack football management platform developed for COM6023M Advanced Web Development.

The system provides football club administration functionality through a REST API and browser-based client application, supporting player management, team administration, fixtures, statistics tracking and role-based authentication.

---

## Features

### User Authentication
- JWT authentication
- bcrypt password hashing
- Role-based access control
- Admin, Player and Guest permissions
- Protected API endpoints

### Player Management
- Create players
- Edit player information
- Delete players
- Player statistics tracking
- Profile image support
- Team assignment

### Team Management
- Team creation and editing
- Badge upload via URL
- Squad viewing
- Team colour customisation
- Google Maps stadium integration

### Match Management
- Fixture creation
- Result recording
- Goal scorer tracking
- Match filtering
- Match status updates

### Dashboard Analytics
- Total players
- Total teams
- Total matches
- Average squad age
- Top scorer display
- Upcoming fixture display
- Recent registrations
- Recent results

### League Table
- Automatic standings calculation
- Goal difference calculations
- Points system
- Dynamic ranking

### News System
- Club announcements
- Category filtering
- Search functionality
- Matchday weather integration

---

## Technology Stack

Frontend:
- HTML5
- CSS3
- JavaScript

Backend:
- Node.js
- Express.js

Database:
- MySQL

Authentication:
- JWT
- bcrypt

Libraries:
- mysql2
- nodemailer
- cors
- dotenv

External APIs:
- Google Maps Embed API
- Open-Meteo Weather API

---

## System Architecture

Frontend Client
↓

REST API (Express.js)
↓

Controllers (MVC Structure)
↓

MySQL Database

---

## Installation

### Clone repository

```bash
git clone YOUR_GITHUB_LINK
```

### Install backend dependencies

```bash
npm install
```

### Configure environment variables

Create:

```env
JWT_SECRET=your_secret

EMAIL_USER=your_email
EMAIL_PASS=your_password
```

### Configure MySQL

Create:

```
FootballDB
```

Import database schema.

### Start backend server

```bash
node app.js
```

Backend runs:

```
http://localhost:3000
```

Open:

```
index.html
```

---

## Project Structure

```
Football-System/

controllers/
middleware/
routes/
services/

frontend/
dashboard.html
players.html
teams.html
matches.html
league-table.html
news.html
users.html

db.js
app.js
script.js
style.css

README.md
```

---

## Security Features

- JWT authentication
- Password hashing using bcrypt
- Protected routes
- Role-based authorisation
- Server-side validation
- Client-side validation
- Error handling

---

## Future Improvements

- Password reset system
- Mobile application support
- Advanced football analytics
- File upload functionality
- Real-time notifications
- Live league updates

---

## Author

Samira Gimma

BSc Computer Science

York St John University

COM6023M Advanced Web Development