DROP DATABASE IF EXISTS footballdb;
CREATE DATABASE footballdb;
USE footballdb;

CREATE TABLE Teams (
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    coach_name VARCHAR(100),
    stadium_location VARCHAR(255),
    logo_url VARCHAR(500),
    team_colour VARCHAR(50)
);

CREATE TABLE Players (
    player_id INT AUTO_INCREMENT PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    age INT,
    position VARCHAR(50),
    team_id INT,
    profile_image VARCHAR(500),
    FOREIGN KEY (team_id) REFERENCES Teams(team_id)
        ON DELETE SET NULL
);

CREATE TABLE Matches (
    match_id INT AUTO_INCREMENT PRIMARY KEY,
    team1_id INT NOT NULL,
    team2_id INT NOT NULL,
    match_date DATE NOT NULL,
    score VARCHAR(20),
    home_score INT NULL,
    away_score INT NULL,
    FOREIGN KEY (team1_id) REFERENCES Teams(team_id),
    FOREIGN KEY (team2_id) REFERENCES Teams(team_id)
);

CREATE TABLE MatchGoals (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    player_id INT NOT NULL,
    team_id INT NOT NULL,
    minute INT NULL,
    FOREIGN KEY (match_id) REFERENCES Matches(match_id)
        ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES Players(player_id),
    FOREIGN KEY (team_id) REFERENCES Teams(team_id)
);

CREATE TABLE PlayerStats (
    stat_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    yellow_cards INT DEFAULT 0,
    red_cards INT DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES Players(player_id)
        ON DELETE CASCADE
);

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'player', 'guest') DEFAULT 'guest'
);

INSERT INTO Teams 
(team_name, coach_name, stadium_location, logo_url, team_colour)
VALUES
('Manchester United Women', 'Marc Skinner', 'Leigh Sports Village', 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg', '#DA291C'),
('Chelsea Women', 'Sonia Bompastor', 'Kingsmeadow, Kingston upon Thames', 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg', '#034694'),
('Arsenal Women', 'Renée Slegers', 'Emirates Stadium', 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg', '#EF0107'),
('Manchester City Women', 'Gareth Taylor', 'Joie Stadium', 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', '#6CABDD'),
('Tottenham Hotspur Women', 'Robert Vilahamn', 'Brisbane Road, London', 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg', '#132257'),
('West Ham United Women', 'Rehanne Skinner', 'Chigwell Construction Stadium', NULL, '#7A263A'),
('Everton Women', 'Brian Sørensen', 'Walton Hall Park, Liverpool', NULL, '#003399'),
('Liverpool Women', 'Matt Beard', 'St Helens Stadium', NULL, '#C8102E'),
('Brighton Women', 'Dario Vidošić', 'Broadfield Stadium', NULL, '#0057B8'),
('Aston Villa Women', 'Robert de Pauw', 'Villa Park', 'https://upload.wikimedia.org/wikipedia/en/c/c2/Aston_Villa_logo.svg', '#95BFE5'),
('Leicester City Women', 'Amandine Miquel', 'King Power Stadium', NULL, '#003090'),
('Reading Women', 'Not set', 'Select Car Leasing Stadium', NULL, '#003A70'),
('Bristol City Women', 'Not set', 'Ashton Gate Stadium', NULL, '#E21A23'),
('Crystal Palace Women', 'Laura Kaminski', 'Hayes Lane Stadium', NULL, '#1B458F'),
('Durham Women', 'Adam Furness', 'Maiden Castle Sports Park', NULL, '#002147'),
('Sheffield United Women', 'Not set', 'Olympic Legacy Park', NULL, '#EE2737'),
('Crystal Palace', 'Oliver Glasner', 'Selhurst Park', NULL, '#1B458F'),
('Charlton Athletic Women', 'Karen Hills', 'The Valley', NULL, '#E31B23'),
('Lewes Women', 'Not set', 'The Dripping Pan', NULL, '#E30613'),
('Blackburn Rovers Women', 'Not set', 'Ewood Park', NULL, '#009EE0'),
('Leeds United Women', 'Not set', 'Elland Road, Leeds', NULL, '#FFCD00');

INSERT INTO Players 
(player_name, age, position, team_id, profile_image)
VALUES
('Ella Toone', 24, 'Midfielder', 1, NULL),
('Leah Galton', 30, 'Forward', 1, NULL),
('Millie Bright', 31, 'Defender', 2, NULL),
('Lauren James', 23, 'Forward', 2, NULL),
('Beth Mead', 30, 'Forward', 3, NULL),
('Kim Little', 34, 'Midfielder', 3, NULL),
('Lauren Hemp', 24, 'Forward', 4, NULL),
('Alex Greenwood', 31, 'Defender', 4, NULL),
('Beth England', 31, 'Forward', 5, NULL),
('Martha Thomas', 29, 'Forward', 5, NULL),
('Rachel Daly', 33, 'Forward', 10, NULL),
('Jordan Nobbs', 32, 'Midfielder', 10, NULL);

INSERT INTO PlayerStats 
(player_id, goals, assists, yellow_cards, red_cards)
VALUES
(1, 6, 4, 1, 0),
(2, 4, 3, 0, 0),
(3, 2, 1, 2, 0),
(4, 8, 5, 1, 0),
(5, 7, 4, 0, 0),
(6, 3, 6, 1, 0),
(7, 9, 7, 1, 0),
(8, 2, 3, 2, 0),
(9, 6, 2, 1, 0),
(10, 5, 2, 1, 0),
(11, 10, 3, 2, 0),
(12, 4, 5, 1, 0);

INSERT INTO Matches 
(team1_id, team2_id, match_date, score, home_score, away_score)
VALUES
(1, 2, '2026-05-01', '2-1', 2, 1),
(3, 4, '2026-05-03', '1-1', 1, 1),
(5, 10, '2026-05-05', '0-3', 0, 3),
(2, 3, '2026-05-08', '2-2', 2, 2),
(4, 1, '2026-05-10', '3-1', 3, 1);

INSERT INTO MatchGoals 
(match_id, player_id, team_id, minute)
VALUES
(1, 1, 1, 23),
(1, 2, 1, 67),
(1, 4, 2, 78),
(2, 5, 3, 44),
(2, 7, 4, 55),
(3, 11, 10, 12),
(3, 11, 10, 49),
(3, 12, 10, 72),
(4, 4, 2, 19),
(4, 3, 2, 84),
(4, 5, 3, 31),
(4, 6, 3, 64),
(5, 7, 4, 15),
(5, 7, 4, 62),
(5, 8, 4, 88),
(5, 1, 1, 39);

INSERT INTO Users 
(username, email, password, role)
VALUES
('admin', 'admin@example.com', '$2b$10$muEZ.ARQSqu42a/hMumgweTtmxnkAFcGYF/qnNwcPiKxkQrzpHsMC', 'admin'),
('player', 'player@example.com', '$2b$10$SBiEpNFfsgZ8fw48aJ6KK.MASUGp58c1MpRHfe1ACqc0XGY8PaaGy', 'player'),
('player2', 'player2@example.com', '$2b$10$nUJX3UqLYl0UlztA9/CZquBYkOjAKXwMGE4ITpO6qDMYYKPgTLTEG', 'player'),
('guest', 'guest@example.com', '$2b$10$Rn.i8ACs3FBXjM32/6VJA.Qy0OmWInCLccCDXT.pcQL/Liv4ZCTwy', 'guest');

SELECT 'Football database created successfully' AS message;