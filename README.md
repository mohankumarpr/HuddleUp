# 🏆 Fiesta Homes Auction Application

A professional, modern web application for managing player auctions during the Fiesta Homes Annual Sports Meet 2025-2026. Built with React and Material-UI, featuring a sleek design and intuitive user experience.

![React](https://img.shields.io/badge/React-19.0.0-blue)
![Material-UI](https://img.shields.io/badge/Material--UI-6.2.0-purple)
![License](https://img.shields.io/badge/license-Private-red)

## 🌟 Features

### 🎨 Modern UI/UX
- **Professional Navigation Bar**: Sticky header with smooth transitions and active route highlighting
- **Animated Home Page**: Eye-catching gradients and smooth animations
- **Responsive Design**: Fully responsive layout that works on all device sizes
- **Custom Scrollbar**: Themed scrollbar for a polished look
- **Beautiful Footer**: Professional footer with branding

### 🎯 Auction Management
- **Random Player Selection**: Pick players randomly from the available pool
- **Real-time Team Statistics**: 
  - Available cash tracking
  - Player count (Male/Female)
  - Maximum bid calculations
  - Remaining roster spots
- **Player Details Modal**: 
  - High-quality player images with fallback
  - Sports nominations
  - Personal statements
  - Block and gender information
- **Price Bidding System**: Smart increment system based on current price
- **Multiple Action Options**:
  - Mark player as SOLD to a team
  - Mark player as UNSOLD
  - Close without action

### 💾 Data Management
- **Google Sheets Integration**: Player data is fetched directly from a published Google Sheet
- **Real-time Updates**: Changes to the Google Sheet are reflected when the app loads
- **Local Storage**: Auction progress (sold players, team rosters) persists between sessions
- **Export/Import**: Save and restore auction state via JSON files
- **Reset Functionality**: Ability to reset the entire auction with confirmation
- **Team Management**: Four teams with customizable rosters and budgets

### ♿ Accessibility
- **ARIA Labels**: Proper accessibility labels for screen readers
- **Keyboard Navigation**: Full keyboard support for navigation
- **Focus States**: Clear focus indicators for interactive elements
- **Semantic HTML**: Proper semantic structure for better accessibility

### 🔧 User Experience Enhancements
- **Confirmation Dialogs**: Prevents accidental data loss
- **Error Handling**: Graceful image loading fallback
- **Loading States**: Visual feedback for long operations
- **Toast Notifications**: User-friendly alerts and messages
- **Smooth Animations**: Professional page transitions and hover effects

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fiestahomes
```

2. Install dependencies:
```bash
npm install
```

3. **Set up Google Sheets** (see [Google Sheets Setup Guide](GOOGLE_SHEETS_SETUP.md)):
   - Ensure your Google Sheet is published to the web
   - The sheet ID is already configured for the main Fiesta Homes sheet
   - See the setup guide for detailed instructions

4. Start the development server:
```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## 📁 Project Structure

```
fiestahomes/
├── public/
│   ├── assets/
│   │   ├── FH2.jpg           # Logo
│   │   └── players/          # Player images
│   ├── css/                  # External stylesheets
│   └── index.html
├── src/
│   ├── Components/
│   │   ├── auction/
│   │   │   ├── index.jsx     # Main auction component
│   │   │   ├── auction.css   # Auction styles
│   │   │   └── players.js    # Player data (legacy, not used)
│   │   ├── Navbar.jsx        # Navigation component
│   │   ├── Navbar.css
│   │   ├── Footer.jsx        # Footer component
│   │   ├── Footer.css
│   │   ├── home.jsx          # Home page component
│   │   ├── home.css
│   │   ├── LoadingSpinner.jsx # Loading component
│   │   └── LoadingSpinner.css
│   ├── utils/
│   │   └── googleSheets.js   # Google Sheets integration
│   ├── App.js                # Main app component
│   ├── App.css               # Global styles
│   └── index.js              # Entry point
├── GOOGLE_SHEETS_SETUP.md    # Setup guide for Google Sheets
└── package.json
```

## 🎨 Design System

### Color Palette
- **Primary**: `#667eea` → `#764ba2` (Purple gradient)
- **Secondary**: `#f093fb` → `#f5576c` (Pink gradient)
- **Background**: `#f5f7fa` → `#c3cfe2` (Light gradient)
- **Team Colors**:
  - Knights of Fiesta: `#0b0bb5` (Blue)
  - Flames of Fiesta: `#ff4a02` (Orange)
  - Thunders of Fiesta: `#d00c0c` (Red)
  - Fire of Fiesta: `#FF671F` (Dark Orange)

### Typography
- **Primary Font**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', etc.)
- **Headings**: Bold, large sizes with text shadows
- **Body**: Clean, readable sizes with good line height

## 🎯 Key Components

### Auction Component (`src/Components/auction/index.jsx`)
Main auction management interface with:
- Team roster displays
- Player selection mechanism
- Bidding interface
- Team details viewer
- Data persistence

### Home Component (`src/Components/home.jsx`)
Landing page with:
- Welcome message
- Event description
- Call-to-action button

### Navbar Component (`src/Components/Navbar.jsx`)
Navigation header with:
- Logo and branding
- Route navigation
- Active state highlighting

### Footer Component (`src/Components/Footer.jsx`)
Professional footer with:
- Branding information
- Copyright notice

## 💡 Usage

### Starting an Auction
1. Navigate to the Auction page using the navigation bar
2. Review team information and available cash
3. Click "Pick A Player" to randomly select a player
4. View player details, sports, and personal information
5. Use the "+" button to increment the bid price
6. Select a team from the dropdown
7. Click "Sold" to assign the player or "Unsold" to skip

### Viewing Team Details
- Click on any team card to view all players purchased by that team
- See player names and their sold prices

### Resetting the Auction
- Click the "Reset Auction" button
- Confirm in the dialog to clear all data and start fresh

## 🔐 Data Storage

### Google Sheets (Player Data Source)
- **Live Data**: Player information is fetched from a published Google Sheet
- **Sheet ID**: `1ZlD7HcCYs8PLDCYjMrhDdlRSK6nlKfsCMPqg_zMEy1I`
- **Updates**: Changes to the sheet are reflected on app reload
- See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for configuration details

### Local Storage (Auction State)
The application uses browser's localStorage to persist auction progress:
- `soldPlayers`: Array of all sold/unsold players with auction details
- `teamsData`: Current state of all teams including rosters and cash
- **Note**: Local storage persists independently of Google Sheets data

## 📱 Responsive Breakpoints

- **Desktop**: > 768px (Full layout with 4 team boxes per row)
- **Tablet**: ≤ 768px (2 team boxes per row, adjusted modals)
- **Mobile**: Optimized layouts with stacked elements

## 🛠️ Technologies Used

- **React 19.0.0**: UI framework
- **React Router DOM 6.28.0**: Client-side routing
- **Material-UI 6.2.0**: Component library
- **Bootstrap 4.6.2**: Grid system and utilities
- **Font Awesome 6.7.1**: Icons

## 🔄 Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner

### `npm run build`
Builds the app for production to the `build` folder

### `npm run eject`
Ejects from Create React App (one-way operation)

## 🎨 Customization

### Adding New Teams
Edit the initial state in `src/Components/auction/index.jsx`:
```javascript
{
  teamName: "Your Team Name",
  owners: ["Owner1", "Owner2"],
  players: [],
  availableCash: 100,
  color: "#hexcolor",
}
```

### Modifying Auction Rules
Update the logic in the auction component:
- `minRemainingPlayersNeeded`: Total roster size (currently 21)
- `availableCash`: Starting budget (currently 100 crores)
- Price increment logic in the `setPriceIncrementValue` callback

### Changing Colors
Update the color scheme in respective CSS files:
- `Navbar.css`: Navigation colors
- `home.css`: Home page gradients
- `auction.css`: Auction interface colors
- `App.css`: Global styles

## 🐛 Known Issues & Solutions

### Player Images Not Loading
- Ensure images are in `public/assets/players/` directory
- Images should be named as `{playerId}.jpeg`
- Fallback UI displays automatically if image is missing

### Google Sheets Data Not Loading
- **Error Message**: "Failed to Load Player Data"
- **Solutions**:
  - Ensure the Google Sheet is published to the web (File → Share → Publish to web)
  - Check your internet connection
  - Verify the Sheet ID in `src/utils/googleSheets.js`
  - See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for detailed troubleshooting

### Data Loss
- Player data comes from Google Sheets (no local modifications)
- Auction progress is stored in browser's localStorage
- Clearing browser data will reset auction progress only
- Use the "Reset Auction" button for intentional resets
- Use Export feature to backup auction progress

## 🤝 Contributing

This is a private project for Fiesta Homes Annual Sports Meet. For any changes or suggestions, please contact the development team.

## 📄 License

This project is private and proprietary to Fiesta Homes.

## 👥 Credits

Developed for Fiesta Homes Annual Sports Meet 2025-2026

---

**Made with ❤️ for Fiesta Homes Community**
