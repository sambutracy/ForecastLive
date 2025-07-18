# Forecast Live - F1 Prediction dApp

🏎️ **Forecast Live** is an on-chain Formula 1 prediction dashboard built on the Internet Computer Protocol (ICP). Upload your F1 prediction screenshots, let AI extract your driver picks, and watch your score update live as races progress!

## 🎯 Features

- **🔐 Secure Authentication**: Login with NFID for seamless Web3 identity management
- **📸 Smart Upload**: Upload F1 prediction screenshots with AI-powered parsing
- **⛓️ On-Chain Storage**: All predictions stored securely on ICP canisters
- **🏁 Live Scoring**: Real-time score calculation using official F1 rules
- **📊 Dynamic Dashboard**: Interactive charts showing score progression per lap
- **🏆 Leaderboard**: Compete with other fans and track your ranking

## 🛠️ Tech Stack

- **Backend**: Motoko canister on Internet Computer
- **Frontend**: React with TailwindCSS
- **Authentication**: NFID
- **Charts**: Chart.js with react-chartjs-2
- **File Upload**: react-dropzone
- **AI Screenshot Parsing**: Computer vision API for driver extraction

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- DFX SDK (for ICP development)
- Modern web browser

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/forecast-live.git
   cd forecast-live
   ```

2. **Install frontend dependencies**:
   ```bash
   cd src/forecast_live_frontend
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Visit the app**:
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Development with DFX (Optional)

If you want to deploy to a local ICP replica:

1. **Install DFX**:
   ```bash
   sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
   ```

2. **Start local replica**:
   ```bash
   dfx start --clean
   ```

3. **Deploy canisters**:
   ```bash
   dfx deploy
   ```

## 🎮 How to Use

1. **Login**: Click "Login with NFID" to authenticate
2. **Upload**: Upload a screenshot of your F1 prediction
3. **Verify**: Review the AI-extracted driver order
4. **Submit**: Store your prediction on-chain
5. **Track**: Watch your score update during race simulation
6. **Compete**: Check the leaderboard to see your ranking

## 📸 AI Screenshot Processing

Forecast Live uses AI to extract driver predictions from screenshots:

1. **Upload any F1 prediction image** showing driver names, car numbers, or team colors
2. **AI processes the image** to identify drivers using computer vision
3. **Driver codes are extracted** (VER, HAM, LEC, etc.) and displayed in predicted order
4. **Review and edit** if the AI missed anything
5. **Submit your prediction** to store on-chain

### Supported Formats

- F1 official app screenshots
- F1 fantasy screenshots
- Plain text lists of drivers
- Social media predictions
- Custom prediction templates

## 🏁 Scoring System

Based on official Forecast F1 rules:
- **Exact match**: 100% of driver's points
- **1 position off**: 50% of points
- **2 positions off**: 25% of points  
- **3 positions off**: 12.5% of points
- **More than 3 off**: 0 points

## 📁 Project Structure

```
forecast-live/
├── dfx.json                          # ICP project configuration
├── f1_data_service/                  # Python service for F1 data
│   ├── app.py                        # FastAPI server for F1 data
│   └── requirements.txt              # Python dependencies
├── src/
│   ├── forecast_live_backend/
│   │   ├── main.mo                   # Main controller canister
│   │   ├── F1DataService.mo          # F1 data service canister
│   │   ├── PredictionService.mo      # Prediction storage & scoring
│   │   ├── AIPredictionService.mo    # AI screenshot parsing
│   │   ├── JsonParser.mo             # JSON utility functions
│   │   └── F1Types.mo                # Shared type definitions
│   └── forecast_live_frontend/
│       ├── package.json
│       ├── webpack.config.js
│       ├── tailwind.config.js
│       └── src/
│           ├── index.js              # React entry point
│           ├── App.js                # Main app component
│           ├── styles.css            # Global styles
│           ├── contexts/             # React contexts
│           │   ├── AuthContext.js    # NFID authentication
│           │   └── CanisterContext.js # ICP canister integration
│           └── components/           # React components
│               ├── Header.js
│               ├── AuthForm.js
│               ├── PredictionUpload.js
│               └── Dashboard.js
└── .github/
    └── copilot-instructions.md       # GitHub Copilot instructions
```

## 🔧 Configuration

### Frontend Environment

The frontend uses these key configurations:
- **NFID Authentication**: `https://nfid.one/authenticate`
- **Local Development**: `http://localhost:3000`
- **Mock Canister**: Development uses mock actor for canister calls

### Backend Canister

The Motoko canister provides these main functions:
- `storePrediction()` - Store user predictions
- `getPrediction()` - Retrieve user predictions
- `calculateUserScore()` - Calculate live scores
- `getLeaderboard()` - Get user rankings

## 🚧 MVP Status

This is the MVP version with the following limitations:
- AI parsing is mocked (returns fixed driver order)
- Race data is simulated (5 laps with predefined positions)
- Canister interactions use mock actor in development
- Limited to top 10 drivers prediction

## ⚙️ Configuration

The application uses a centralized configuration approach:

- **App Configuration**: All settings are in `src/forecast_live_frontend/src/config/appConfig.js`
- **Environment Variables**: Managed through webpack's DefinePlugin
- **Easy Deployment**: Switch between development/production by updating the config file

## 🛣️ Roadmap

- [ ] Integrate real AI/OCR for screenshot parsing
- [ ] Connect to live F1 race data APIs
- [ ] Deploy to mainnet ICP
- [ ] Add more F1 prediction types
- [ ] Implement real-time race updates
- [ ] Add user profiles and statistics
- [ ] Mobile app development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Internet Computer](https://internetcomputer.org/) for the blockchain infrastructure
- [NFID](https://nfid.one/) for seamless Web3 authentication
- [Formula 1](https://www.formula1.com/) for the amazing sport that inspired this project

---

Built with ❤️ for the F1 community on the Internet Computer 🏎️
