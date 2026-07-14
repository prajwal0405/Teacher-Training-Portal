import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spacece')
  .then(async () => {
    try {
      const Center = mongoose.model('Center', new mongoose.Schema({ name: String, mentor: mongoose.Schema.Types.ObjectId }));
      const User = mongoose.model('User', new mongoose.Schema({ name: String, role: String, mentorProfile: { center: mongoose.Schema.Types.ObjectId } }));
      
      const centers = await Center.find({ mentor: { $exists: true, $ne: null } });
      console.log('--- CENTERS AND THEIR MENTORS ---');
      for (const center of centers) {
        const mentor = await User.findById(center.mentor);
        console.log(`Center: "${center.name}" --> Mentor: "${mentor ? mentor.name : 'Unknown/Deleted'}"`);
      }

      console.log('\n--- MENTORS AND THEIR CENTERS ---');
      const mentors = await User.find({ role: 'mentor' });
      for (const mentor of mentors) {
         if (mentor.mentorProfile && mentor.mentorProfile.center) {
            const center = await Center.findById(mentor.mentorProfile.center);
            console.log(`Mentor: "${mentor.name}" --> Center: "${center ? center.name : 'Unknown/Deleted'}"`);
         } else {
            console.log(`Mentor: "${mentor.name}" --> Center: "None"`);
         }
      }
    } catch (err) {
      console.error(err);
    }
    process.exit(0);
  });
