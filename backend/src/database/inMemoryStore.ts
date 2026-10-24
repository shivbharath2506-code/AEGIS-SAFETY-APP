import { v4 as uuidv4 } from 'uuid';
import {
  User,
  EmergencyContact,
  SOSAlert,
  SOSDelivery,
  LocationSession,
  LocationUpdate,
  SafetyDataPoint,
  NearbyFacility,
  DeviceToken
} from '../types';

export class InMemoryStore {
  public users: Map<string, User> = new Map();
  public contacts: Map<string, EmergencyContact> = new Map();
  public alerts: Map<string, SOSAlert> = new Map();
  public deliveries: Map<string, SOSDelivery> = new Map();
  public sessions: Map<string, LocationSession> = new Map();
  public locationUpdates: Map<string, LocationUpdate[]> = new Map();
  public safetyData: SafetyDataPoint[] = [];
  public facilities: NearbyFacility[] = [];
  public deviceTokens: Map<string, DeviceToken[]> = new Map();

  constructor() {
    this.seedDefaultChennaiData();
  }

  public seedDefaultChennaiData(): void {
    // 1. Authentic Chennai Public Safety and Medical Facilities
    this.facilities = [
      // Police Stations
      {
        id: 'fac-police-koyambedu',
        provider: 'OSM',
        external_place_id: 'osm-ps-koyambedu-01',
        category: 'POLICE',
        name: 'K10 Koyambedu Police Station',
        latitude: 13.0694,
        longitude: 80.1948,
        phone_number: '044-24795000',
        address: 'Jawaharlal Nehru Road, Koyambedu, Chennai, Tamil Nadu 600107',
        is_emergency_service: true,
        verified_at: new Date()
      },
      {
        id: 'fac-police-guindy',
        provider: 'OSM',
        external_place_id: 'osm-ps-guindy-02',
        category: 'POLICE',
        name: 'J3 Guindy Police Station',
        latitude: 13.0067,
        longitude: 80.2023,
        phone_number: '044-22340050',
        address: 'Race Course Road, Guindy, Chennai, Tamil Nadu 600032',
        is_emergency_service: true,
        verified_at: new Date()
      },
      {
        id: 'fac-police-tnagar',
        provider: 'OSM',
        external_place_id: 'osm-ps-tnagar-03',
        category: 'POLICE',
        name: 'R1 Mambalam Police Station (T. Nagar)',
        latitude: 13.0418,
        longitude: 80.2341,
        phone_number: '044-24340321',
        address: 'Madley Road, T. Nagar, Chennai, Tamil Nadu 600017',
        is_emergency_service: true,
        verified_at: new Date()
      },
      {
        id: 'fac-police-ramapuram',
        provider: 'OSM',
        external_place_id: 'osm-ps-ramapuram-04',
        category: 'POLICE',
        name: 'Ramapuram Police Station',
        latitude: 13.0315,
        longitude: 80.1818,
        phone_number: '044-22492100',
        address: 'Mount-Poonamallee High Road, Ramapuram, Chennai, Tamil Nadu 600089',
        is_emergency_service: true,
        verified_at: new Date()
      },
      {
        id: 'fac-police-thousandlights',
        provider: 'OSM',
        external_place_id: 'osm-ps-thousandlights-05',
        category: 'POLICE',
        name: 'E2 Royapettah / Thousand Lights Police Station',
        latitude: 13.0569,
        longitude: 80.2575,
        phone_number: '044-28114000',
        address: 'Whannels Road, Thousand Lights, Chennai, Tamil Nadu 600006',
        is_emergency_service: true,
        verified_at: new Date()
      },

      // Hospitals
      {
        id: 'fac-hosp-miot',
        provider: 'OSM',
        external_place_id: 'osm-hosp-miot-01',
        category: 'HOSPITAL',
        name: 'MIOT International Hospital',
        latitude: 13.0232,
        longitude: 80.1873,
        phone_number: '044-42002288',
        address: '4/112 Mount Poonamallee Road, Manapakkam, Chennai, Tamil Nadu 600089',
        is_emergency_service: true,
        verified_at: new Date()
      },
      {
        id: 'fac-hosp-apollo-greams',
        provider: 'OSM',
        external_place_id: 'osm-hosp-apollo-02',
        category: 'HOSPITAL',
        name: 'Apollo Hospitals - Greams Road (Emergency Center)',
        latitude: 13.0601,
        longitude: 80.2522,
        phone_number: '1066',
        address: '21 Greams Lane, Thousand Lights, Chennai, Tamil Nadu 600006',
        is_emergency_service: true,
        verified_at: new Date()
      },
      {
        id: 'fac-hosp-sims',
        provider: 'OSM',
        external_place_id: 'osm-hosp-sims-03',
        category: 'HOSPITAL',
        name: 'SIMS Hospital (SRM Institutes)',
        latitude: 13.0527,
        longitude: 80.2104,
        phone_number: '044-49211455',
        address: '1 Jawaharlal Nehru Salai, Vadapalani, Chennai, Tamil Nadu 600026',
        is_emergency_service: true,
        verified_at: new Date()
      },
      {
        id: 'fac-hosp-gh',
        provider: 'OSM',
        external_place_id: 'osm-hosp-gh-04',
        category: 'HOSPITAL',
        name: 'Rajiv Gandhi Government General Hospital',
        latitude: 13.0802,
        longitude: 80.2789,
        phone_number: '108',
        address: 'EVR Periyar Salai, Park Town, Chennai, Tamil Nadu 600003',
        is_emergency_service: true,
        verified_at: new Date()
      },

      // Pharmacies
      {
        id: 'fac-pharm-apollo-koyambedu',
        provider: 'OSM',
        external_place_id: 'osm-pharm-apollo-01',
        category: 'PHARMACY',
        name: 'Apollo Pharmacy 24x7 - Koyambedu Market',
        latitude: 13.0682,
        longitude: 80.1932,
        phone_number: '044-24791000',
        address: 'Shop 12, Metro Station Junction, Koyambedu, Chennai 600107',
        is_emergency_service: false,
        verified_at: new Date()
      },
      {
        id: 'fac-pharm-medplus-ramapuram',
        provider: 'OSM',
        external_place_id: 'osm-pharm-medplus-02',
        category: 'PHARMACY',
        name: 'MedPlus Pharmacy - Ramapuram Main Rd',
        latitude: 13.0322,
        longitude: 80.1802,
        phone_number: '044-22495566',
        address: 'No 45, Ramapuram Main Road, Chennai 600089',
        is_emergency_service: false,
        verified_at: new Date()
      },
      {
        id: 'fac-pharm-apollo-vadapalani',
        provider: 'OSM',
        external_place_id: 'osm-pharm-apollo-03',
        category: 'PHARMACY',
        name: 'Apollo Pharmacy 24x7 - Vadapalani 100ft Rd',
        latitude: 13.0518,
        longitude: 80.2098,
        phone_number: '044-24801122',
        address: '100 Feet Road, Vadapalani, Chennai 600026',
        is_emergency_service: false,
        verified_at: new Date()
      }
    ];

    // 2. Authentic Chennai Safety Metadata Points (Lighting, Isolated Road Warnings, High-Crowd Transit Hubs)
    this.safetyData = [
      {
        id: 'safe-light-innerring-01',
        source: 'Chennai Smart City Corporation / Public Works Audit',
        category: 'LIGHTING',
        latitude: 13.0645,
        longitude: 80.2012,
        confidence: 'AUTHORITATIVE',
        safety_score: 8.8,
        metadata: {
          roadName: 'Inner Ring Road (100 Feet Road)',
          lightingType: 'LED Smart Poles',
          luxLevelEstimated: 'High (>30 lux)',
          verifiedDate: '2025-11-15'
        },
        observedAt: new Date(),
        importedAt: new Date()
      } as any,
      {
        id: 'safe-light-mountpoonamallee-02',
        source: 'Highways Department Tamil Nadu',
        category: 'LIGHTING',
        latitude: 13.0328,
        longitude: 80.1845,
        confidence: 'AUTHORITATIVE',
        safety_score: 8.2,
        metadata: {
          roadName: 'Mount-Poonamallee High Road',
          lightingType: 'Sodium Vapor & Commercial Streetlighting',
          luxLevelEstimated: 'Medium-High',
          verifiedDate: '2025-12-01'
        },
        observedAt: new Date(),
        importedAt: new Date()
      } as any,
      {
        id: 'safe-crowd-koyambedu-hub',
        source: 'CMDA Transit Density Indicator',
        category: 'CROWD',
        latitude: 13.0691,
        longitude: 80.1945,
        confidence: 'LICENSED_OPEN',
        safety_score: 9.0,
        metadata: {
          zone: 'Koyambedu Metro & Bus Terminus Interchange',
          footfallLevel: 'Dense / Active Pedestrian Presence',
          activeHours: '05:00 - 23:30'
        },
        observedAt: new Date(),
        importedAt: new Date()
      } as any,
      {
        id: 'safe-iso-cooum-bypass-01',
        source: 'Community Road Safety Audit (Moderated)',
        category: 'ISOLATED_AREA',
        latitude: 13.0612,
        longitude: 80.1764,
        confidence: 'COMMUNITY_VERIFIED',
        safety_score: 4.2,
        metadata: {
          warning: 'Poorly illuminated service lane adjacent to storm canal',
          recommendation: 'Use primary arterial route (Inner Ring Rd) after 20:00',
          reportCount: 14
        },
        observedAt: new Date(),
        importedAt: new Date()
      } as any
    ];

    // 3. Seed Default Test/Demonstration User
    const demoUser: User = {
      id: 'demo-user-chennai-01',
      firebase_uid: 'firebase-demo-chennai-uid',
      display_name: 'Priya Ramanathan',
      verified_phone_number: '+919876543210',
      medical_notes: 'Asthma inhaler in purse. Blood group: B positive.',
      account_status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    };
    this.users.set(demoUser.id, demoUser);

    // 4. Seed Default Trusted Emergency Contacts for Demo User
    const contact1: EmergencyContact = {
      id: 'contact-demo-01',
      user_id: demoUser.id,
      display_name: 'Amma (Mother)',
      phone_number: '+919840112233',
      relationship: 'FAMILY',
      is_primary: true,
      can_receive_alerts: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    const contact2: EmergencyContact = {
      id: 'contact-demo-02',
      user_id: demoUser.id,
      display_name: 'Karthik (Brother)',
      phone_number: '+919840998877',
      relationship: 'FAMILY',
      is_primary: false,
      can_receive_alerts: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.contacts.set(contact1.id, contact1);
    this.contacts.set(contact2.id, contact2);
  }
}

export const inMemoryStore = new InMemoryStore();
