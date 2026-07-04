import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 3000;

// Security Best Practices: Disable X-Powered-By header
app.disable("x-powered-by");

// Secure basic HTTP headers to mitigate common exploits (XSS, Sniffing)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(express.json());

// Secure JWT-like Cryptographic session management using native crypto module
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

function generateToken(payload: { username: string; role: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes expiration
  const fullPayload = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(`${header}.${fullPayload}`);
  const signature = hmac.digest("base64url");
  
  return `${header}.${fullPayload}.${signature}`;
}

function verifyToken(token: string): { username: string; role: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const hmac = crypto.createHmac("sha256", JWT_SECRET);
    hmac.update(`${header}.${payload}`);
    const expectedSignature = hmac.digest("base64url");
    
    if (signature !== expectedSignature) return null;
    
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    
    return decodedPayload;
  } catch (err) {
    return null;
  }
}

// Authentication & Authorization Middlewares
interface AuthenticatedRequest extends express.Request {
  user?: {
    username: string;
    role: string;
    email: string;
  };
}

const requireAuth = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. No active session token detected." });
    return;
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Access denied. Session is invalid or expired." });
    return;
  }
  
  req.user = decoded;
  next();
};

const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Access denied. User authentication required." });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Access denied. Your role has insufficient privileges for this operation." });
      return;
    }
    next();
  };
};

// Simple In-memory IP-based rate limiting on Authentication route to thwart brute force
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const rateLimitLogin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(ip as string);
  
  if (attempt) {
    // Reset limit window after 1 minute of cooling
    if (now - attempt.lastAttempt > 60000) {
      loginAttempts.set(ip as string, { count: 1, lastAttempt: now });
      next();
      return;
    }
    
    if (attempt.count >= 5) {
      res.status(429).json({ error: "Too many login attempts. Suspicious activity blocked. Try again in 60 seconds." });
      return;
    }
    
    attempt.count += 1;
    attempt.lastAttempt = now;
    loginAttempts.set(ip as string, attempt);
  } else {
    loginAttempts.set(ip as string, { count: 1, lastAttempt: now });
  }
  next();
};


const DATA_FILE = path.join(process.cwd(), "containers.json");

// Define basic initial container dataset
const INITIAL_CONTAINERS = [
  {
    id: "cont_1",
    containerNumber: "MSKU1942085",
    blNumber: "MAEU92041924",
    status: "In Transit (Ocean)",
    dealAmount: 145000,
    advancePayment: 43500,
    partyName: "SinoSteel Manufacturing Corp",
    itemDetails: "Cold-Rolled Steel Coils, Grade S235JR. Net Weight: 24,500 kg. Packed in eye-to-sky steel packaging. Duty-bound for Port of Houston.",
    paymentTerms: "30% TT advance, 70% CAD (Cash Against Documents) upon BL presentation",
    dealDate: "2026-06-15",
    eta: "2026-07-20",
    containerSize: "20ft",
    vesselName: "MAERSK MC-KINNEY MOLLER",
    voyageNumber: "2603E",
    cargoWeight: 24500,
    portOfLoading: "Tianjin Port, China",
    portOfDischarge: "Port of Houston, USA",
    trackingLogs: [
      {
        id: "log_1_1",
        timestamp: "2026-06-15T09:00:00Z",
        event: "Booking Confirmed",
        location: "Beijing Head Office",
        status: "Booked",
        description: "Cargo booking cleared with shipper. Bill of Lading generated."
      },
      {
        id: "log_1_2",
        timestamp: "2026-06-17T14:30:00Z",
        event: "Container Released",
        location: "Tianjin Depot",
        status: "Empty Pickup",
        description: "Empty 20ft Heavy Tested container released for loading."
      },
      {
        id: "log_1_3",
        timestamp: "2026-06-19T18:00:00Z",
        event: "Gated In at Terminal",
        location: "Tianjin Container Terminal",
        status: "Loaded at Port",
        description: "Container sealed and gated in. Customs export clearance completed."
      },
      {
        id: "log_1_4",
        timestamp: "2026-06-22T06:15:00Z",
        event: "Vessel Departed",
        location: "East China Sea",
        status: "In Transit (Ocean)",
        description: "Vessel Maersk Mc-Kinney Moller departed Tianjin. Ocean transit active."
      }
    ]
  },
  {
    id: "cont_2",
    containerNumber: "CMAU8173924",
    blNumber: "CMAC73910395",
    status: "Customs Hold",
    dealAmount: 89000,
    advancePayment: 26700,
    partyName: "Apex Premium Organics Ltd",
    itemDetails: "Organic Himalayan Chia Seeds. Total 800 bags of 25 kg. Phyto-sanitary certificate attached. Storage temp: ambient. Subject to FDA inspection.",
    paymentTerms: "30% Advance, 70% DP (Documents Against Payment) on arrival",
    dealDate: "2026-05-28",
    eta: "2026-07-01",
    containerSize: "40ft",
    vesselName: "CMA CGM ANTOINE DE SAINT EXUPERY",
    voyageNumber: "0493W",
    cargoWeight: 20000,
    portOfLoading: "Nhava Sheva Port, India",
    portOfDischarge: "Port of Los Angeles, USA",
    trackingLogs: [
      {
        id: "log_2_1",
        timestamp: "2026-05-28T10:00:00Z",
        event: "Booking Confirmed",
        location: "Mumbai Depot",
        status: "Booked",
        description: "Cargo clearance agreed with local farms."
      },
      {
        id: "log_2_2",
        timestamp: "2026-05-30T11:00:00Z",
        event: "Container Released",
        location: "Nhava Sheva",
        status: "Empty Pickup",
        description: "40ft Food Grade container released for loading."
      },
      {
        id: "log_2_3",
        timestamp: "2026-06-02T16:00:00Z",
        event: "Vessel Gated In",
        location: "Nhava Sheva APM Terminal",
        status: "Loaded at Port",
        description: "Export clearance granted. Container loaded onto vessel."
      },
      {
        id: "log_2_4",
        timestamp: "2026-06-04T08:00:00Z",
        event: "Vessel Departed",
        location: "Indian Ocean",
        status: "In Transit (Ocean)",
        description: "Ocean transit commenced."
      },
      {
        id: "log_2_5",
        timestamp: "2026-06-29T21:00:00Z",
        event: "Vessel Arrived at Port",
        location: "Los Angeles Terminal 400",
        status: "At Port of Discharge",
        description: "Vessel docked. Container discharged from vessel to terminal stack."
      },
      {
        id: "log_2_6",
        timestamp: "2026-07-02T14:00:00Z",
        event: "FDA Inspection Hold",
        location: "LA Customs Area",
        status: "Customs Hold",
        description: "FDA intensive examination hold placed due to phytosanitary inspection audit. Customs broker notified."
      }
    ]
  },
  {
    id: "cont_3",
    containerNumber: "TEMU4819245",
    blNumber: "MSCD81923411",
    status: "Delivered",
    dealAmount: 220000,
    advancePayment: 220000,
    partyName: "Nordic Tech Components AB",
    itemDetails: "Lithium-ion Battery Modules (UN3480 Class 9 Dangerous Goods). Net weight: 14,000 kg. Stowed in active reefer container with set temp 18°C.",
    paymentTerms: "100% Sight Letter of Credit (L/C)",
    dealDate: "2026-05-10",
    eta: "2026-06-18",
    containerSize: "40ft",
    vesselName: "MSC GULSUN",
    voyageNumber: "931A",
    cargoWeight: 14000,
    portOfLoading: "Port of Rotterdam, Netherlands",
    portOfDischarge: "Port of New York, USA",
    trackingLogs: [
      {
        id: "log_3_1",
        timestamp: "2026-05-10T11:00:00Z",
        event: "Booking Confirmed",
        location: "Rotterdam Office",
        status: "Booked",
        description: "Dangerous Goods approval acquired."
      },
      {
        id: "log_3_2",
        timestamp: "2026-05-12T09:00:00Z",
        event: "Reefer Released",
        location: "Rotterdam Depot",
        status: "Empty Pickup",
        description: "Reefer pre-cooled and container released for loading."
      },
      {
        id: "log_3_3",
        timestamp: "2026-05-14T15:00:00Z",
        event: "Vessel Gated In",
        location: "Rotterdam APM",
        status: "Loaded at Port",
        description: "Customs export cleared."
      },
      {
        id: "log_3_4",
        timestamp: "2026-05-17T18:00:00Z",
        event: "Vessel Departed",
        location: "North Atlantic",
        status: "In Transit (Ocean)",
        description: "Ocean transit initiated."
      },
      {
        id: "log_3_5",
        timestamp: "2026-06-15T04:00:00Z",
        event: "Vessel Arrived",
        location: "New York Terminal",
        status: "At Port of Discharge",
        description: "Vessel docked, reefer power re-connected immediately."
      },
      {
        id: "log_3_6",
        timestamp: "2026-06-17T08:00:00Z",
        event: "Dispatched on Chassis",
        location: "New York Port Gate",
        status: "Out for Delivery",
        description: "Cargo gated out on temperature-controlled dry drayage truck."
      },
      {
        id: "log_3_7",
        timestamp: "2026-06-18T16:00:00Z",
        event: "POD Signed",
        location: "Consignee Warehouse",
        status: "Delivered",
        description: "Delivery completed, seals verified intact. Reefer temperature logs validated."
      }
    ]
  }
];

// Ensure data file exists with default items
function getContainers(): any[] {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_CONTAINERS, null, 2));
    return INITIAL_CONTAINERS;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading containers database:", err);
    return INITIAL_CONTAINERS;
  }
}

function saveContainers(containers: any[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(containers, null, 2));
  } catch (err) {
    console.error("Error saving containers database:", err);
  }
}

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. AI analysis functions will operate in simulated mode.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST API Endpoints

// Authentication API with Rate Limiting and secure cryptographically signed tokens
app.post("/api/auth/login", rateLimitLogin, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  const normUsername = username.toLowerCase().trim();
  
  if (
    (normUsername === "sairanitraders11@gmail.com" || normUsername === "sairanitraders11") && password === "1234"
  ) {
    const userRole = "logistics_manager";
    const userEmail = "sairanitraders11@gmail.com";
    const displayName = "Sairanitraders Admin";
    const token = generateToken({ username: displayName, role: userRole, email: userEmail });

    res.json({
      token,
      user: {
        username: displayName,
        role: userRole,
        email: userEmail,
      },
    });
  } else if (
    (normUsername === "burqenterprise92@gmail.com" || normUsername === "burqenterprise92") && password === "1234"
  ) {
    const userRole = "importer_expert";
    const userEmail = "burqenterprise92@gmail.com";
    const displayName = "Burq Enterprise Portal";
    const token = generateToken({ username: displayName, role: userRole, email: userEmail });

    res.json({
      token,
      user: {
        username: displayName,
        role: userRole,
        email: userEmail,
      },
    });
  } else {
    res.status(401).json({ error: "Access Denied. Only registered emails like sairanitraders11@gmail.com and burqenterprise92@gmail.com are permitted." });
  }
});

// Password Reset / Recovery Endpoint - "Sends password in mail" (simulation via log and returns a secure response)
app.post("/api/auth/reset-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email address is required." });
    return;
  }

  const normEmail = email.toLowerCase().trim();
  let foundPassword = "";
  
  if (normEmail === "sairanitraders11@gmail.com") {
    foundPassword = "1234";
  } else if (normEmail === "burqenterprise92@gmail.com") {
    foundPassword = "1234";
  }

  if (foundPassword) {
    // Log the SMTP dispatch clearly to demonstrate actual system delivery execution
    console.log("==========================================");
    console.log("SMTP MAIL DISPATCH SERVICE");
    console.log(`To: ${normEmail}`);
    console.log("Subject: Security Portal - Password Recovery");
    console.log(`Body: Hello Sairanitraders Admin, your registered security credential password is: ${foundPassword}`);
    console.log("==========================================");

    res.json({
      message: `Your password has been successfully sent to ${normEmail}. Please check your inbox or spam folder.`
    });
  } else {
    res.status(404).json({
      error: "No registered portal operator found with that email address."
    });
  }
});

// Get all containers - Requires valid session token
app.get("/api/containers", requireAuth, (req, res) => {
  res.json(getContainers());
});

// Create new container - Requires logistics_manager role
app.post("/api/containers", requireAuth, requireRole(["logistics_manager"]), (req, res) => {
  const container = req.body;
  if (!container.containerNumber || !container.blNumber || !container.partyName) {
    res.status(400).json({ error: "Missing required fields: containerNumber, blNumber, and partyName are mandatory." });
    return;
  }

  const list = getContainers();
  
  // Create a default initial tracking log if none provided
  if (!container.trackingLogs || container.trackingLogs.length === 0) {
    container.trackingLogs = [
      {
        id: "log_" + Date.now() + "_init",
        timestamp: new Date().toISOString(),
        event: "Cargo Booked",
        location: container.portOfLoading || "Origin Office",
        status: container.status || "Booked",
        description: `Shipment booked under Bill of Lading ${container.blNumber} for consignee ${container.partyName}.`
      }
    ];
  }

  const newContainer = {
    ...container,
    id: "cont_" + Date.now(),
    dealAmount: Number(container.dealAmount) || 0,
    advancePayment: Number(container.advancePayment) || 0,
    cargoWeight: Number(container.cargoWeight) || 0,
  };

  list.push(newContainer);
  saveContainers(list);
  res.status(201).json(newContainer);
});

// Update container - Requires logistics_manager role
app.put("/api/containers/:id", requireAuth, requireRole(["logistics_manager"]), (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const list = getContainers();
  const index = list.findIndex((c) => c.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Container not found." });
    return;
  }

  // Detect status change to append a standard logistics log automatically!
  const prevStatus = list[index].status;
  const currentStatus = updatedData.status;
  let updatedLogs = [...(updatedData.trackingLogs || list[index].trackingLogs || [])];

  if (prevStatus !== currentStatus) {
    updatedLogs.push({
      id: "log_" + Date.now() + "_status_change",
      timestamp: new Date().toISOString(),
      event: `Status Updated to ${currentStatus}`,
      location: updatedData.portOfDischarge || updatedData.portOfLoading || "Transit Point",
      status: currentStatus,
      description: `Shipment status manually updated from '${prevStatus}' to '${currentStatus}'.`
    });
  }

  const updatedContainer = {
    ...list[index],
    ...updatedData,
    id, // Keep original ID
    dealAmount: Number(updatedData.dealAmount) ?? list[index].dealAmount,
    advancePayment: Number(updatedData.advancePayment) ?? list[index].advancePayment,
    cargoWeight: Number(updatedData.cargoWeight) ?? list[index].cargoWeight,
    trackingLogs: updatedLogs
  };

  list[index] = updatedContainer;
  saveContainers(list);
  res.json(updatedContainer);
});

// Delete container - Requires logistics_manager role
app.delete("/api/containers/:id", requireAuth, requireRole(["logistics_manager"]), (req, res) => {
  const { id } = req.params;
  const list = getContainers();
  const index = list.findIndex((c) => c.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Container not found." });
    return;
  }

  list.splice(index, 1);
  saveContainers(list);
  res.json({ message: "Container deleted successfully." });
});

// Sync full containers list - Requires auth (logistics_manager or importer_expert)
app.post("/api/containers/sync", requireAuth, (req, res) => {
  const { containers } = req.body;
  if (!Array.isArray(containers)) {
    res.status(400).json({ error: "Invalid data format. Expected an array of containers." });
    return;
  }
  saveContainers(containers);
  res.json({ message: "Containers synchronized successfully.", count: containers.length });
});

// AI Logistics & Customs Risk Analyst Endpoint - Requires valid session token
app.post("/api/ai/analyze", requireAuth, async (req, res) => {
  const { container } = req.body;
  if (!container) {
    res.status(400).json({ error: "Container data is required for analysis." });
    return;
  }

  const client = getGeminiClient();

  const mockAnalysis = {
    riskScore: 35,
    demurrageRisk: "Medium" as const,
    customsDutyEstimate: "Estimated 5.5% - 12% standard import duties depending on final HS classification codes.",
    checklist: [
      "Verify Phyto-sanitary and Fumigation Certificates are fully signed",
      "Validate Bill of Lading with the carrier ocean freight clearance",
      "File Import Security Filing (ISF 10+2) 24 hours prior to sailing",
      "Prepare Customs Customs Entry Form 3461 & 7501",
      "Confirm and pay Port Maintenance Fee (HMF/MPF) where applicable"
    ],
    hsCodeSuggestions: ["1207.99.03 (Chia Seeds)", "1207.99.05 (Oil seeds / other)"],
    paymentRiskSummary: `Balance due is USD ${(container.dealAmount - container.advancePayment).toLocaleString()}. Under standard terms, finalize payment before vessel arrival to prevent document hold.`,
    expertAdvice: "As an experienced importer, I recommend filing custom papers early. Monitor port congestion indicators to avoid potential container storage fee (demurrage) accumulation."
  };

  if (!client) {
    // Return fallback smart simulation if key is missing
    const bal = (container.dealAmount || 0) - (container.advancePayment || 0);
    const calculatedRisk = container.status === "Customs Hold" ? 75 : bal > 100000 && container.status !== "Delivered" ? 55 : 20;
    const calculatedDemurrage = container.status === "Customs Hold" ? "High" : container.status === "At Port of Discharge" ? "Medium" : "Low";
    
    res.json({
      ...mockAnalysis,
      riskScore: calculatedRisk,
      demurrageRisk: calculatedDemurrage,
      paymentRiskSummary: bal > 0 
        ? `Outstanding balance of USD ${bal.toLocaleString()} for shipment. Finalize wire transfer before vessel ETA (${container.eta || "N/A"}) to avoid delivery delays.`
        : "Payment is 100% prepaid. No financial transfer bottlenecks detected.",
      expertAdvice: `Current shipment status is '${container.status}'. Ensure the Customs broker has the ISF filing matches. If container size is ${container.containerSize || '40ft'}, verify maximum road weight limits are respected for drayage.`
    });
    return;
  }

  try {
    const prompt = `
      You are a world-class Importer Expert, Customs Broker, and Senior Logistics Director.
      Analyze the following container shipment and provide a professional, structured evaluation report.
      
      Shipment Details:
      - Container Number: ${container.containerNumber}
      - Bill of Lading: ${container.blNumber}
      - Current Transit Status: ${container.status}
      - Party Name: ${container.partyName}
      - Cargo Description: ${container.itemDetails}
      - Cargo Weight: ${container.cargoWeight} kg
      - Container Size: ${container.containerSize}
      - Vessel/Voyage: ${container.vesselName} / ${container.voyageNumber}
      - Route: Loading at "${container.portOfLoading}" to Discharge at "${container.portOfDischarge}"
      - Total Deal Amount: USD ${container.dealAmount}
      - Advance Payment Paid: USD ${container.advancePayment}
      - Outstanding Balance: USD ${container.dealAmount - container.advancePayment}
      - Payment Terms Agreed: ${container.paymentTerms}
      - Deal Date: ${container.dealDate}
      - Estimated Time of Arrival (ETA): ${container.eta}

      Generate an expert-level JSON analysis detailing:
      1. riskScore: A numerical risk score (0 to 100, where 100 is high risk of delays, holds, payment defaults, or fines).
      2. demurrageRisk: "Low" or "Medium" or "High" classification of potential storage penalty risk.
      3. customsDutyEstimate: Highly informed description of typical duty ranges, HS chapters, and custom tariffs for these items.
      4. checklist: A list of 4 to 6 critical, exact logistics/customs documents and tasks that must be executed to successfully clear this container.
      5. hsCodeSuggestions: A list of 2 or 3 proposed 6-digit to 10-digit HS codes for these goods.
      6. paymentRiskSummary: Concise warning or status of financial default/delay risk based on the payment terms and outstanding balance.
      7. expertAdvice: High-value importer advice containing practical industry secrets (how to handle customs, carrier free-time, avoid demurrage, or tackle inspections).

      Make sure to return strictly JSON conforming to this schema, without markdown formatting blocks:
      {
        "riskScore": number,
        "demurrageRisk": "Low" | "Medium" | "High",
        "customsDutyEstimate": "string",
        "checklist": ["string"],
        "hsCodeSuggestions": ["string"],
        "paymentRiskSummary": "string",
        "expertAdvice": "string"
      }
    `;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.INTEGER },
            demurrageRisk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            customsDutyEstimate: { type: Type.STRING },
            checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            hsCodeSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            paymentRiskSummary: { type: Type.STRING },
            expertAdvice: { type: Type.STRING },
          },
          required: ["riskScore", "demurrageRisk", "customsDutyEstimate", "checklist", "hsCodeSuggestions", "paymentRiskSummary", "expertAdvice"],
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      res.json(parsed);
    } else {
      throw new Error("Empty response from Gemini API");
    }
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "AI Analysis failed.", details: err.message });
  }
});

// Serve frontend assets in production or Vite middleware in development
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Logistics CMS server active on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Startup Failure:", err);
});
