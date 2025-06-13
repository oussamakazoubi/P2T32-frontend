require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("./middleware/auth");
const bcrypt = require("bcrypt");

const app = express();
const db = new PrismaClient();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.JWT_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// Middleware admin only
function adminOnly(req, res, next) {
  if (req.session.user && req.session.user.role === "ADMIN") {
    next();
  } else {
    res.status(403).json({ error: "Accès réservé aux administrateurs" });
  }
}

// Middleware supervisor or admin only
function supervisorOrAdminOnly(req, res, next) {
  if (
    req.session.user &&
    (req.session.user.role === "ADMIN" || req.session.user.role === "SUPERVISOR")
  ) {
    next();
  } else {
    res.status(403).json({ error: "Accès réservé aux superviseurs et administrateurs" });
  }
}

// --- ROUTES AUTH ---

// Connexion utilisateur (login)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.user.findUnique({ where: { email } });

  if (user && (await bcrypt.compare(password, user.password))) {
    req.session.user = user;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Email ou mot de passe incorrect" });
  }
});

// Vérification de session utilisateur connecté
app.get("/me", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: "Non connecté" });
  }
});

// Inscription nouvel utilisateur
app.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ success: false, message: "Champs requis manquants." });
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Email déjà utilisé." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await db.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "CLIENT",
    },
  });

  req.session.user = newUser;
  res.json({ success: true, user: newUser });
});

// Déconnexion utilisateur
app.get("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Déconnecté" });
  });
});

// --- ROUTES SITES / COMPOSTEURS ---

// Récupération statistiques composteurs
app.get("/api/stats", authMiddleware, async (req, res) => {
  const composts = await db.compost.findMany({
    include: { site: true },
  });
  res.json({ composts });
});

// Récupération liste des sites avec composteurs filtrés selon rôle et assignations
app.get("/api/sites", authMiddleware, async (req, res) => {
  const user = req.session.user;

  if (user.role === "ADMIN") {
    const sites = await db.site.findMany({
      include: {
        composts: true,
        supervisor: true,
        referents: true,
      },
    });
    res.json({ sites });
  } else {
    const userWithAssignments = await db.user.findUnique({
      where: { id: user.id },
      include: {
        assignedComposts: {
          include: { site: true },
        },
      },
    });

    const sitesMap = new Map();
    userWithAssignments.assignedComposts.forEach((compost) => {
      if (!sitesMap.has(compost.site.id)) {
        sitesMap.set(compost.site.id, {
          ...compost.site,
          composts: [],
        });
      }
      sitesMap.get(compost.site.id).composts.push(compost);
    });

    res.json({ sites: Array.from(sitesMap.values()) });
  }
});

// Récupération d’un composteur par son ID (avec contrôle d’accès)
app.get("/api/composteurs/:id", authMiddleware, async (req, res) => {
  const user = req.session.user;
  const composteurId = parseInt(req.params.id);

  try {
    if (user.role === "ADMIN") {
      const composteur = await db.compost.findUnique({
        where: { id: composteurId },
        include: {
          site: true,
          dataRecords: {
            orderBy: { recordedAt: "asc" },
            include: {
              recordedBy: true,
            },
          },
        },
      });

      if (!composteur) {
        return res.status(404).json({ error: "Composteur not found" });
      }

      return res.json({ composteur });
    }

    const userWithAssignments = await db.user.findUnique({
      where: { id: user.id },
      include: {
        assignedComposts: {
          where: { id: composteurId },
          include: {
            site: true,
            dataRecords: {
              orderBy: { recordedAt: "asc" },
              include: {
                recordedBy: true,
              },
            },
          },
        },
      },
    });

    if (!userWithAssignments.assignedComposts.length) {
      return res.status(403).json({ error: "Accès refusé au composteur" });
    }

    return res.json({ composteur: userWithAssignments.assignedComposts[0] });
  } catch (error) {
    console.error("Error fetching composteur:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// --- GESTION DES DONNEES COMPOSTEUR ---

// Ajout d’un nouveau relevé composteur (superviseur ou admin)
app.post("/api/composteurs/:composteurId/compostdata", authMiddleware, supervisorOrAdminOnly, async (req, res) => {
  const composteurId = parseInt(req.params.composteurId);
  const {
    temperature,
    humidity,
    odorLevel,
    compostMass,
    oxygenation,
    dryMatter,
    woodChipsAdded,
  } = req.body;

  function parseFloatOrNull(value) {
    const f = parseFloat(value);
    return isNaN(f) ? null : f;
  }

  try {
    const newRecord = await db.compostData.create({
      data: {
        compostId: composteurId,
        recordedAt: new Date(),
        recordedById: req.session.user.id,
        temperature: parseFloatOrNull(temperature),
        humidity: parseFloatOrNull(humidity),
        odorLevel: odorLevel || null,
        compostMass: parseFloatOrNull(compostMass),
        oxygenation: parseFloatOrNull(oxygenation),
        dryMatter: dryMatter === true || dryMatter === "true",
        woodChipsAdded: parseFloatOrNull(woodChipsAdded),
      },
    });
    res.status(201).json({ success: true, newRecord });
  } catch (error) {
    console.error("Erreur ajout compostData :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Modification d’un relevé composteur (superviseur ou admin)
app.put("/api/compostdata/:id", authMiddleware, supervisorOrAdminOnly, async (req, res) => {
  const id = parseInt(req.params.id);
  const updateData = req.body;

  try {
    const updatedRecord = await db.compostData.update({
      where: { id },
      data: updateData,
    });
    res.json({ success: true, updatedRecord });
  } catch (error) {
    console.error("Erreur mise à jour compostData :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Suppression d’un relevé composteur (superviseur ou admin)
app.delete("/api/compostdata/:id", authMiddleware, supervisorOrAdminOnly, async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    await db.compostData.delete({ where: { id } });
    res.json({ success: true, message: "Relevé supprimé" });
  } catch (error) {
    console.error("Erreur suppression compostData :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- ROUTES ADMIN ---

// Récupération des utilisateurs (clients et superviseurs)
app.get("/api/admin/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await db.user.findMany({
      where: {
        role: {
          in: ["CLIENT", "SUPERVISOR"],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        assignedComposts: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { lastName: "asc" },
    });
    res.json({ users });
  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupération des composteurs
app.get("/api/admin/composteurs", authMiddleware, adminOnly, async (req, res) => {
  try {
    const composteurs = await db.compost.findMany({
      select: {
        id: true,
        name: true,
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUsers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json({ composteurs });
  } catch (error) {
    console.error("Erreur récupération composteurs:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Attribution ou suppression d’assignation composteurs à un utilisateur (ADMIN)
app.put("/api/admin/users/:userId/assign-composteurs", authMiddleware, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { composteurIds } = req.body;

  if (!Array.isArray(composteurIds)) {
    return res.status(400).json({ error: "composteurIds doit être un tableau d'entiers" });
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        assignedComposts: {
          set: composteurIds.map((id) => ({ id })),
        },
      },
    });
    res.json({ success: true, message: "Assignations mises à jour." });
  } catch (error) {
    console.error("Erreur mise à jour assignations:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Changement de rôle d’un utilisateur CLIENT ↔ SUPERVISOR (ADMIN)
app.put("/api/admin/users/:userId/change-role", authMiddleware, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { newRole } = req.body;

  if (!["CLIENT", "SUPERVISOR"].includes(newRole)) {
    return res.status(400).json({ error: "Rôle invalide, doit être CLIENT ou SUPERVISOR" });
  }

  try {
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, role: true },
    });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Erreur changement rôle:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajout d’un site (ADMIN)
app.post("/api/sites", authMiddleware, adminOnly, async (req, res) => {
  const { name, location /* add other site fields if needed */ } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Le nom du site est requis." });
  }

  try {
    const newSite = await db.site.create({
      data: {
        name,
        location,
      },
    });
    res.status(201).json({ success: true, site: newSite });
  } catch (error) {
    console.error("Erreur création site:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Suppression d’un site (ADMIN)
app.delete("/api/sites/:id", authMiddleware, adminOnly, async (req, res) => {
  const siteId = parseInt(req.params.id);

  try {
    const site = await db.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return res.status(404).json({ error: "Site non trouvé." });
    }

    await db.site.delete({ where: { id: siteId } });
    res.json({ success: true, message: "Site supprimé." });
  } catch (error) {
    console.error("Erreur suppression site:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajout d’un composteur (ADMIN)
app.post("/api/composteurs", authMiddleware, adminOnly, async (req, res) => {
  const { name, siteId /* other composter fields if any */ } = req.body;

  if (!name || !siteId) {
    return res.status(400).json({ error: "Nom et siteId sont requis." });
  }

  try {
    const site = await db.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return res.status(400).json({ error: "Site invalide." });
    }

    const newComposter = await db.compost.create({
      data: {
        name,
        siteId,
      },
    });
    res.status(201).json({ success: true, composteur: newComposter });
  } catch (error) {
    console.error("Erreur création composteur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Suppression d’un composteur (ADMIN)
app.delete("/api/composteurs/:id", authMiddleware, adminOnly, async (req, res) => {
  const composteurId = parseInt(req.params.id);

  try {
    const composteur = await db.compost.findUnique({ where: { id: composteurId } });
    if (!composteur) {
      return res.status(404).json({ error: "Composteur non trouvé." });
    }

    await db.compost.delete({ where: { id: composteurId } });
    res.json({ success: true, message: "Composteur supprimé." });
  } catch (error) {
    console.error("Erreur suppression composteur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Fallback 404
app.use("*", (_, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

// Démarrage serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server running on http://localhost:" + PORT);
});
