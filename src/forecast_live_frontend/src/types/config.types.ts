export interface NfidConfig {
  applicationName: string;
  applicationLogo: string;
  redirectUri: string;
  host: string;
  derivationOrigin: string;
  buttonStyle: 'black' | 'white' | 'outline';
  loginLabel: string;
}

export interface InternetIdentityConfig {
  canisterId: string;
  providerUrl: string;
  windowOpenerFeatures: string;
}

export interface AuthConfig {
  nfid: NfidConfig;
  internetIdentity: InternetIdentityConfig;
  sessionDuration: number;
}

export interface ApiConfig {
  host: string;
  fetchRootKey: boolean;
  f1DataService: string;
  socket: string;
  canisters: {
    [key: string]: string;
  };
}

export interface F1DriverInfo {
  code: string;
  name: string;
  team: string;
}

export interface F1DataConfig {
  useMockData: boolean;
  defaultRace: string;
  drivers: F1DriverInfo[];
}

export interface ScoringConfig {
  pointsSystem: number[];
  accuracyMultipliers: {
    exactMatch: number;
    oneOff: number;
    twoOff: number;
    threeOff: number;
    moreThanThree: number;
  };
}

export interface AppConfig {
  auth: AuthConfig;
  api: ApiConfig;
  f1Data: F1DataConfig;
  scoring: ScoringConfig;
}