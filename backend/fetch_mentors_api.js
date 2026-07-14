import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    const secret = process.env.JWT_SECRET || 'change_this_secret_before_production';
    // Create an admin token
    const token = jwt.sign(
      { id: '60c72b2f9b1d8b001c8e4a99', role: 'admin' }, 
      secret, 
      { expiresIn: '1h' }
    );

    console.log("Fetching mentors...");
    const res = await fetch('http://localhost:5000/api/admin/mentors', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
       console.log('Failed to fetch:', res.status, res.statusText);
       process.exit(1);
    }
    
    const data = await res.json();
    console.log('\n--- MENTORS AND THEIR ASSIGNED CENTERS ---');
    if (data.mentors && data.mentors.length > 0) {
      data.mentors.forEach(m => {
        const centerName = m.mentorProfile?.center ? m.mentorProfile.center.name : 'None';
        console.log(`Mentor: "${m.name}"  --->  Center: "${centerName}"`);
      });
    } else {
      console.log('No mentors found.');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}
check();
