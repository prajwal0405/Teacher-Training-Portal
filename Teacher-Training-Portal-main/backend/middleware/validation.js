// Input validation middleware
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // Minimum 8 chars, 1 uppercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
};

export const validateRegistrationData = (req, res, next) => {
  const { name, email, phone, address, subject, password } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Valid name is required." });
  }

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: "Valid email is required." });
  }

  if (!password || !validatePassword(password)) {
    return res.status(400).json({ 
      error: "Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character." 
    });
  }

  if (!phone || phone.toString().length < 10) {
    return res.status(400).json({ error: "Valid phone number is required." });
  }

  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    return res.status(400).json({ error: "Subject is required." });
  }

  next();
};

export const validateLoginData = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: "Valid email is required." });
  }

  if (!password || password.length < 1) {
    return res.status(400).json({ error: "Password is required." });
  }

  next();
};
