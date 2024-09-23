import express from "express";
import cors from "cors";
import { check, validationResult } from "express-validator";
import pg from "pg";
import session from "express-session";
import passport, { use } from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "reverend-insanity",
    resave: false,
    saveUninitialized: false,
  })
);

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
  user: "postgres",
  host: "localhost",
  database: "Rental Cars",
  password: "post123gres",
  port: 5432,
});

db.connect();

passport.serializeUser;

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
    const { email, name, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log(email, name, password);
    res.json({ message: "User registered successfully", email, name });
  }
);

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await db.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);

        if (user.rows.length === 0) {
          return done(null, false, { message: "Now user with that email" });
        }

        const isMatch = bcrypt.compare(passport, user.rows[0].password);

        if (isMatch) {
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
