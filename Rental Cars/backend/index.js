import express from "express";
import cors from "cors";
import { check, validationResult } from "express-validator";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
