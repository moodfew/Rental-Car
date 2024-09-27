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
import rateLimit from "express-rate-limit";

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
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
    },
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

try {
  db.connect();
  console.log("Database connected successfully.");
} catch (err) {
  console.error("Database connection error", err);
}

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

const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Not an admin" });
};

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  limit: 5,
  message: "Too many login attempts. Please try again after 2 minutes",
});

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
  loginLimiter,
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

app.post("/vendor/carInfo/:id", isAuthenticated, isVendor, async (req, res) => {
  const { id } = req.params;

  try {
    const car = await db.query("SELECT * FROM cars WHERE id = $1", [id]);
    res.json(car.rows[0]);
  } catch (err) {
    console.error("Database error", err);
    res.status(500).json({ message: "Error retrieving car information" });
  }
});

app.post(
  "/vendor/updateCar/:id",
  isAuthenticated,
  isVendor,
  async (req, res) => {
    const { id } = req.params;
    const { make, model, year, price_per_day, transmission, seats, available } =
      req.body;

    try {
      await db.query("BEGIN");
      const updatedCar = await db.query(
        "UPDATE cars SET make = $1, model = $2, year = $3, price_per_day = $4, transmission = $5, seats = $6, available = $6",
        [make, model, year, price_per_day, transmission, seats, available]
      );
      res.json(updatedCar.rows[0]);
    } catch (err) {
      await db.query("ROLLBACK");
      console.error("Database error", err);
      res.status(500).json({ message: "Error updating car" });
    }
  }
);

app.post("/rentals", isAuthenticated, async (req, res) => {
  const { car_id, pickup_date, return_date } = req.body;

  if (!car_id || !pickup_date || !return_date) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const newRental = await db.query(
      "INSERT INTO rentals (user_id, car_id, pickup_date, return_date) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, car_id, pickup_date, return_date]
    );
    res.json(newRental.rows[0]);
  } catch (err) {
    console.error("Database Error", err);
    res.status(500).json({ message: "Error creating rental" });
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
