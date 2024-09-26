import express from "express";
import cors from "cors";
import { check, validationResult } from "express-validator";
import pg from "pg";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import flash from "connect-flash";
import dotenv from "dotenv";

const app = express();
const port = 3000;

dotenv.config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, user.rows[0]);
  } catch (err) {
    done(err);
  }
});

const db = new pg.Client({
  user: process.env.DB_USER,
  host: "localhost",
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

db.connect();

const isVendor = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "vendor") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Not a vendor" });
};

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Not authenticated" });
};

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: "Login successfull", user: req.user });
  } else {
    res.json({ message: "User is now logged in" });
  }
});

app.get("/user/login", (req, res) => {
  res.json({ message: "Login page. Please enter your credentials." });
});

app.post(
  "/user/register",
  [
    check("email", "Please include a valid email").isEmail(),
    check("name", "Name is required").not().isEmpty(),
    check("password", "Password must be atleast 6 characters").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const { email, name, password, role } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await db.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, email, hashedPassword, role]
      );

      res.json({
        message: "User registered successfully",
        user: newUser.rows[0],
      });
    } catch (err) {
      console.error("Database error", err);
      res.status(500).json({ message: "Error registering user" });
    }
  }
);

app.post(
  "/user/login",
  (req, res, next) => {
    console.log(req.body);
    next();
  },
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/user/login",
    failureFlash: true,
  })
);

app.post("/vendor/addCar", isAuthenticated, isVendor, async (req, res) => {
  const { make, model, year, price_per_day, transmission, seats, available } =
    req.body;
  try {
    const newCar = await db.query(
      "INSERT INTO cars (make, model, year, price_per_day, transmission, seats, available) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [make, model, year, price_per_day, transmission, seats, available]
    );
    res.json(newCar.rows[0]);
  } catch (err) {
    console.error("Database error", err);
    res.status(500).json({ message: "Error adding car" });
  }
});

app.get("/user/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/user/login");
  });
});

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await db.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);

        if (user.rows.length === 0) {
          return done(null, false, { message: "No user with that email" });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password);

        console.log(user.rows[0], password);
        console.log(isMatch);

        if (!isMatch) {
          return done(null, false, { message: "Password incorrect" });
        }
        return done(null, user.rows[0]);
      } catch (err) {
        return done(err);
      }
    }
  )
);

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
